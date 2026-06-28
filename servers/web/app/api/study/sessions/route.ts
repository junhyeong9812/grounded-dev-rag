import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 내 학습 대화 목록 — 세션 게이트 경유.
export async function GET(req: NextRequest) {
  const sid = req.cookies.get("sid")?.value;
  if (!sid) return NextResponse.json({ sessions: [] }, { status: 401 });
  try {
    const r = await fetch(`${API}/study/sessions`, { headers: { "X-Session-Token": sid }, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ sessions: [] }, { status: r.status });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ sessions: [] }, { status: 502 });
  }
}
