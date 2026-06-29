"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CODE_EXT = /\.(java|js|ts|tsx|jsx|mjs|py|rs|css|scss|less|html?|json|xml|ya?ml|toml|go|kt|kts|c|cc|cpp|h|hpp|sh|bash|sql|rb|php|swift|vue|svelte)$/i;

type Doc = { domain?: string; path?: string; full_text: string; source?: string };

// AI질의 출처를 모달로 — path로 자료실 원문을 불러와 렌더(코드면 코드블록).
export default function SourceModal({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [state, setState] = useState<"loading" | "found" | "none">("loading");

  useEffect(() => {
    fetch(`/api/library/by-path?path=${encodeURIComponent(path)}`).then((r) => r.json()).then((d) => {
      if (d.found) { setDoc(d.doc); setState("found"); } else setState("none");
    }).catch(() => setState("none"));
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [path, onClose]);

  const isCode = !!doc && (doc.domain === "code" || CODE_EXT.test(doc.path ?? ""));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="link-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {state === "loading" && <p className="muted">불러오는 중…</p>}
          {state === "none" && <p className="muted">자료실에 원문이 없는 출처입니다(검색 청크). 경로: {path}</p>}
          {state === "found" && doc && (isCode
            ? <pre className="code-block"><code>{doc.full_text}</code></pre>
            : <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.full_text}</ReactMarkdown></div>)}
        </div>
      </div>
    </div>
  );
}
