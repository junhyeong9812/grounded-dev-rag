import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 한 학습 대화의 메시지 타임라인 — 세션 게이트 경유.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sid = req.cookies.get("sid")?.value;
  if (!sid) return NextResponse.json({ messages: [] }, { status: 401 });
  try {
    const r = await fetch(`${API}/study/sessions/${params.id}`, { headers: { "X-Session-Token": sid }, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ messages: [] }, { status: r.status });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ messages: [] }, { status: 502 });
  }
}
