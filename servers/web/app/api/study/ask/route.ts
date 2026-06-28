import { API } from "@/lib/api";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// 학습 Q&A SSE 프록시 — sid 쿠키를 X-Session-Token 으로 Spring 게이트에 전달. 미로그인이면 401.
export async function GET(req: NextRequest) {
  const sid = req.cookies.get("sid")?.value;
  const sse = (body: string, status = 200) =>
    new Response(body, { status, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" } });
  if (!sid) return sse("event: error\ndata: 로그인이 필요합니다\n\n", 401);
  const qs = new URL(req.url).searchParams.toString();
  try {
    const upstream = await fetch(`${API}/study/ask?${qs}`, {
      headers: { "X-Session-Token": sid, Accept: "text/event-stream" },
    });
    if (upstream.status === 401) return sse("event: error\ndata: 세션 만료\n\n", 401);
    return new Response(upstream.body, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
    });
  } catch {
    return sse("event: error\ndata: 백엔드 오류\n\n");
  }
}
