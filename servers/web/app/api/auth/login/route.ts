import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 로그인 — Spring 검증 → 발급 토큰을 HttpOnly 쿠키(sid)로 보관. 브라우저엔 토큰 직접 노출 안 함.
export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return NextResponse.json({ error: "invalid" }, { status: 401 });
    const data = await r.json();
    const res = NextResponse.json({ account: data.account });
    res.cookies.set("sid", data.token, {
      httpOnly: true,
      sameSite: "strict", // F1: cross-site 요청에 쿠키 미전송(CSRF 방어)
      secure: true, // F4: 외부노출 인증 경계 — HTTPS 전용(무조건)
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "backend" }, { status: 502 });
  }
}
