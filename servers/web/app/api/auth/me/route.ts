import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 세션 확인 — sid 쿠키를 X-Session-Token 헤더로 Spring에 전달해 검증.
export async function GET(req: NextRequest) {
  const sid = req.cookies.get("sid")?.value;
  if (!sid) return NextResponse.json({ account: null }, { status: 200 });
  try {
    const r = await fetch(`${API}/auth/me`, { headers: { "X-Session-Token": sid }, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ account: null }, { status: 200 });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ account: null }, { status: 200 });
  }
}
