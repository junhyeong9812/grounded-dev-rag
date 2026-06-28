import { API } from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StudyChat from "@/components/StudyChat";
import MarkRead from "@/components/MarkRead";

export const dynamic = "force-dynamic";

async function getDoc(id: string) {
  try {
    const r = await fetch(`${API}/library/${id}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// 같은 소스 안에서 이전/다음 문서(화살표 네비).
async function getNeighbors(source: string, id: string) {
  try {
    const r = await fetch(`${API}/library/docs?source=${encodeURIComponent(source)}`, { cache: "no-store" });
    const docs = (await r.json()).docs ?? [];
    const idx = docs.findIndex((d: { id: number }) => String(d.id) === id);
    return {
      prev: idx > 0 ? docs[idx - 1] : null,
      next: idx >= 0 && idx < docs.length - 1 ? docs[idx + 1] : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}

// 코드 파일은 마크다운으로 해석하면 깨짐 → 코드 블록(원문 보존)으로 렌더.
const CODE_EXT = /\.(java|js|ts|tsx|jsx|mjs|py|rs|css|scss|less|html?|json|xml|ya?ml|toml|go|kt|kts|c|cc|cpp|h|hpp|sh|bash|sql|rb|php|swift|vue|svelte)$/i;

export default async function DocPage({ params }: { params: { id: string } }) {
  const doc = await getDoc(params.id);
  if (!doc) return <p className="muted">문서를 찾을 수 없습니다.</p>;
  const { prev, next } = await getNeighbors(doc.source, params.id);
  const isCode = doc.domain === "code" || CODE_EXT.test(doc.path ?? "");
  return (
    <article className="doc-view">
      <div className="doc-meta muted">{doc.source} · {doc.path}</div>
      {isCode ? (
        <pre className="code-block"><code>{doc.full_text}</code></pre>
      ) : (
        <div className="markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.full_text}</ReactMarkdown>
        </div>
      )}
      <div className="doc-nav">
        {prev ? <Link href={`/library/doc/${prev.id}`} className="doc-nav-btn">◀ {prev.title}</Link> : <span />}
        {next ? <Link href={`/library/doc/${next.id}`} className="doc-nav-btn next">{next.title} ▶</Link> : <span />}
      </div>
      <StudyChat docId={Number(params.id)} />
      <MarkRead id={Number(params.id)} />
    </article>
  );
}
