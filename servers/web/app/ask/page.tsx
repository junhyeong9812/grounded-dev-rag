"use client";
import { useState } from "react";
import Nav from "@/components/Nav";

const NAMESPACES = [
  { id: "corpus", label: "설계 원칙" },
  { id: "history", label: "변천사" },
  { id: "tech", label: "코드 레퍼런스" },
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

  async function ask() {
    if (!q.trim()) return;
    setLoading(true); setRes(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, namespaces: scope.length ? scope : null, top_k: 6 }),
      });
      setRes(await r.json());
    } catch {
      setRes({ answer: "오류가 발생했습니다.", sources: [] });
    }
    setLoading(false);
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
          <div className="answer">{res.answer || "(답변 없음)"}</div>
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
