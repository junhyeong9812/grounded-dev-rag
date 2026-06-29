import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 뉴스 — date 지정 시 그 날, 아니면 최근.
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get("date");
  const qs = date ? `date=${encodeURIComponent(date)}` : "limit=80";
  try {
    const r = await fetch(`${API}/intel?${qs}`, { cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}
