import { API } from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export default async function DocPage({ params }: { params: { id: string } }) {
  const doc = await getDoc(params.id);
  if (!doc) return <p className="muted">문서를 찾을 수 없습니다.</p>;
  const { prev, next } = await getNeighbors(doc.source, params.id);
  return (
    <article className="doc-view">
      <div className="doc-meta muted">{doc.source} · {doc.path}</div>
      <div className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.full_text}</ReactMarkdown>
      </div>
      <div className="doc-nav">
        {prev ? <Link href={`/library/doc/${prev.id}`} className="doc-nav-btn">◀ {prev.title}</Link> : <span />}
        {next ? <Link href={`/library/doc/${next.id}`} className="doc-nav-btn next">{next.title} ▶</Link> : <span />}
      </div>
    </article>
  );
}
