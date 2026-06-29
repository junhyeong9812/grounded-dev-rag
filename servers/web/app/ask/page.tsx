"use client";
import { useState } from "react";
import Nav from "@/components/Nav";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NAMESPACES = [
  { id: "corpus", label: "설계 원칙" },
  { id: "history", label: "변천사" },
  { id: "tech", label: "코드 레퍼런스" },
  { id: "dict", label: "사전" },
  { id: "projects", label: "유명 프로젝트" },
  { id: "ref", label: "레퍼런스" },
  { id: "graph", label: "계보" },
  { id: "intel", label: "데일리 뉴스" },
  { id: "qa", label: "개발 질문" },
];

type Source = { namespace: string; domain: string | null; title: string; section: string };
type Res = { answer?: string; sources?: Source[] };

export default function Ask() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Res | null>(null);

  function ask() {
    if (!q.trim()) return;
    setLoading(true);
    setRes({ answer: "", sources: [] });
    const params = new URLSearchParams();
    params.set("q", q);
    scope.forEach((s) => params.append("ns", s));
    const es = new EventSource(`/api/ask/stream?${params.toString()}`);
    let answer = "";
    es.addEventListener("sources", (e: MessageEvent) =>
      setRes((r) => ({ ...(r ?? {}), sources: JSON.parse(e.data) })));
    es.addEventListener("token", (e: MessageEvent) => {
      answer += e.data;
      setRes((r) => ({ ...(r ?? {}), answer }));
    });
    es.addEventListener("done", () => { es.close(); setLoading(false); });
    es.onerror = () => { es.close(); setLoading(false); };
  }

  const toggle = (id: string) =>
    setScope((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <Nav active="ask" />
      <div className="scope">
        {NAMESPACES.map((n) => (
          <label key={n.id}>
            <input type="checkbox" checked={scope.includes(n.id)} onChange={() => toggle(n.id)} />
            {n.label}
          </label>
        ))}
      </div>
      <div className="ask-box">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="설계·기술·변천사·뉴스에 대해 물어보세요"
        />
        <button onClick={ask} disabled={loading}>{loading ? "검색 중…" : "질문"}</button>
      </div>
      {res && (
        <>
          {res.answer ? (
            <div className="answer markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{res.answer}</ReactMarkdown>
              {loading && <span className="cursor-blink">▋</span>}
            </div>
          ) : loading ? (
            <div className="answer typing-state">응답 중<span className="dots">…</span></div>
          ) : (
            <div className="answer muted">(답변 없음)</div>
          )}
          {res.sources && res.sources.length > 0 && (
            <ul className="sources">
              {res.sources.map((s, i) => (
                <li key={i}>
                  [{i + 1}] <span className="ns-tag">{s.namespace}/{s.domain ?? ""}</span> {s.title} › {s.section}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
