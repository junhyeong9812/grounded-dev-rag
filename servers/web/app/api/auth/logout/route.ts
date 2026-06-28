import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 로그아웃 — Spring 세션 삭제 + sid 쿠키 제거.
export async function POST(req: NextRequest) {
  const sid = req.cookies.get("sid")?.value;
  if (sid) {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", headers: { "X-Session-Token": sid } });
    } catch {
      /* best-effort */
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sid", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
