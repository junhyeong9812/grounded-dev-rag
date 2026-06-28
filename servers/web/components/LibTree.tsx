"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// study-site Sidebar 모델: namespace → source → 문서. currentId 자동 강조, 지연 로드.
const NS_LABEL: Record<string, string> = {
  corpus: "설계 원칙", history: "변천사", ref: "레퍼런스", projects: "유명 프로젝트",
  dict: "사전", tech: "코드 레퍼런스", intel: "데일리 뉴스", graph: "계보", qa: "개발 질문",
};

type Src = { source: string; cnt: number };
type Node = { namespace: string; sources: Src[] };
type Doc = { id: number; title: string; path: string };

export default function LibTree() {
  const path = usePathname();
  const currentId = path?.startsWith("/library/doc/") ? path.split("/").pop() ?? null : null;
  const [tree, setTree] = useState<Node[]>([]);
  const [openNs, setOpenNs] = useState<Record<string, boolean>>({});
  const [openSrc, setOpenSrc] = useState<Record<string, boolean>>({});
  const [docs, setDocs] = useState<Record<string, Doc[]>>({});

  useEffect(() => {
    fetch("/api/library/tree").then((r) => r.json()).then((d) => setTree(d.tree ?? []));
  }, []);

  async function loadDocs(source: string) {
    if (docs[source]) return;
    const d = await fetch(`/api/library/docs?source=${encodeURIComponent(source)}`).then((r) => r.json());
    setDocs((p) => ({ ...p, [source]: d.docs ?? [] }));
  }
  function toggleSrc(source: string) {
    setOpenSrc((p) => ({ ...p, [source]: !p[source] }));
    loadDocs(source);
  }

  return (
    <nav className="libtree">
      {tree.map((n) => (
        <div key={n.namespace} className="tree-ns">
          <button className="tree-row" onClick={() => setOpenNs((p) => ({ ...p, [n.namespace]: !p[n.namespace] }))}>
            <span className={"caret" + (openNs[n.namespace] ? " open" : "")}>▸</span>
            {NS_LABEL[n.namespace] ?? n.namespace}
          </button>
          {openNs[n.namespace] &&
            n.sources.map((s) => (
              <div key={s.source} className="tree-src">
                <button className="tree-row sub" onClick={() => toggleSrc(s.source)}>
                  <span className={"caret" + (openSrc[s.source] ? " open" : "")}>▸</span>
                  {s.source} <span className="cnt">{s.cnt}</span>
                </button>
                {openSrc[s.source] &&
                  (docs[s.source] ?? []).map((doc) => (
                    <Link key={doc.id} href={`/library/doc/${doc.id}`}
                      className={"tree-doc" + (String(doc.id) === currentId ? " active" : "")}>
                      {doc.title}
                    </Link>
                  ))}
              </div>
            ))}
        </div>
      ))}
      {tree.length === 0 && <p className="muted" style={{ padding: 12 }}>로딩…</p>}
    </nav>
  );
}
