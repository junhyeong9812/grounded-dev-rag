import { API } from "@/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 뉴스가 있는 날짜 목록(일자별 필터 탭).
export async function GET() {
  try {
    const r = await fetch(`${API}/intel/dates`, { cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ dates: [] }, { status: 502 });
  }
}
