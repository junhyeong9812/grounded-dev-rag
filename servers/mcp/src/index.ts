import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// Claude Code가 코딩 중 우리 지식베이스(설계·변천사·코드 레퍼런스·뉴스·계보)를 직접 질의하는 MCP 서버.
const API = process.env.ORCHESTRATOR_URL || "http://192.168.55.9:8090";

function buildServer(): McpServer {
  const server = new McpServer({ name: "junproject-kb", version: "0.1.0" });

  server.tool(
    "ask_knowledge",
    "설계 원칙(corpus)·언어/기술 변천사(history)·코드 레퍼런스(tech)·개발 질문(qa)·데일리 뉴스(intel)·기술 계보(graph) 지식베이스에 질문하고 grounded 한국어 답변 + 출처를 받는다. 좋은 코드/설계 판단이 필요할 때 사용.",
    {
      question: z.string().describe("질문 (한국어)"),
      namespaces: z.array(z.string()).optional().describe("범위 제한: corpus·history·tech·qa·intel·graph (생략 시 전체)"),
      topK: z.number().optional(),
    },
    async ({ question, namespaces, topK }) => {
      const r = await fetch(`${API}/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, namespaces: namespaces ?? null, top_k: topK ?? 6 }),
      });
      const d: any = await r.json();
      const srcs = (d.sources ?? [])
        .map((s: any, i: number) => `[${i + 1}] ${s.namespace}/${s.domain ?? ""} ${s.title} › ${s.section} (${s.path})`)
        .join("\n");
      return { content: [{ type: "text", text: `${d.answer ?? ""}\n\n출처:\n${srcs}` }] };
    }
  );

  server.tool(
    "search_references",
    "지식베이스에서 관련 원문 청크를 검색만 한다(LLM 합성 없음). 참고 문서·코드 레퍼런스를 직접 읽고 싶을 때.",
    {
      query: z.string(),
      namespaces: z.array(z.string()).optional(),
      topK: z.number().optional(),
    },
    async ({ query, namespaces, topK }) => {
      const r = await fetch(`${API}/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, namespaces: namespaces ?? null, top_k: topK ?? 8 }),
      });
      const d: any = await r.json();
      const chunks = (d.chunks ?? [])
        .map((c: any, i: number) => `### [${i + 1}] ${c.namespace}/${c.domain ?? ""} — ${c.title} › ${c.section}\n${c.chunk}\n(${c.path})`)
        .join("\n\n");
      return { content: [{ type: "text", text: chunks || "결과 없음" }] };
    }
  );

  return server;
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// 무상태 Streamable HTTP — 요청마다 transport 생성.
app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req, res) => { res.send("ok"); });

const PORT = Number(process.env.PORT || 9000);
app.listen(PORT, "0.0.0.0", () => console.log(`junproject MCP server on :${PORT} → ${API}`));
