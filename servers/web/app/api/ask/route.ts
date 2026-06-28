import { API } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

// BFF — 브라우저는 백엔드(Spring)를 직접 안 보고 이 라우트만 호출.
export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const r = await fetch(`${API}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ answer: "백엔드 연결 실패", sources: [] }, { status: 502 });
  }
}
