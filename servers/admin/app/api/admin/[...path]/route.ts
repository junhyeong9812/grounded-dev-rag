import { API, adminAuthHeader } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

// 캐치올 BFF 프록시 — /api/admin/* → Spring /admin/* (admin basic-auth 부착).
async function proxy(req: NextRequest, path: string[]) {
  const url = `${API}/admin/${path.join("/")}${req.nextUrl.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: { Authorization: adminAuthHeader(), "Content-Type": "application/json" },
  };
  if (req.method !== "GET" && req.method !== "DELETE") {
    init.body = await req.text();
  }
  try {
    const r = await fetch(url, init);
    const text = await r.text();
    return new NextResponse(text, { status: r.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "백엔드 연결 실패" }, { status: 502 });
  }
}

type Ctx = { params: { path: string[] } };
export async function GET(req: NextRequest, { params }: Ctx) { return proxy(req, params.path); }
export async function PUT(req: NextRequest, { params }: Ctx) { return proxy(req, params.path); }
export async function POST(req: NextRequest, { params }: Ctx) { return proxy(req, params.path); }
export async function DELETE(req: NextRequest, { params }: Ctx) { return proxy(req, params.path); }
