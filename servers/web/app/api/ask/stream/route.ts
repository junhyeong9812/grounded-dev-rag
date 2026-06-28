import { API } from "@/lib/api";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// BFF SSE 프록시 — 브라우저 EventSource ↔ Spring /ask/stream 스트림 중계.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = new URLSearchParams();
  params.set("q", url.searchParams.get("q") ?? "");
  url.searchParams.getAll("ns").forEach((n) => params.append("ns", n));
  try {
    const upstream = await fetch(`${API}/ask/stream?${params.toString()}`, {
      headers: { Accept: "text/event-stream" },
    });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("event: done\ndata: error\n\n", {
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
