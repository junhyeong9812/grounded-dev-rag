import { API } from "@/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// BFF — 자료실 트리(namespace→source). 브라우저 클라이언트 트리가 호출.
export async function GET() {
  try {
    const r = await fetch(`${API}/library/tree`, { cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ tree: [] }, { status: 502 });
  }
}
