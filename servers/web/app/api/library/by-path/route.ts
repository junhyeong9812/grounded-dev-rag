import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// AI질의 출처 모달 — path로 자료실 원문 조회. 자료실에 없는 출처(qa·graph 등)는 404.
export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  try {
    const r = await fetch(`${API}/library/by-path?path=${encodeURIComponent(path)}`, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ found: false }, { status: 200 });
    return NextResponse.json({ found: true, doc: await r.json() });
  } catch {
    return NextResponse.json({ found: false }, { status: 200 });
  }
}
