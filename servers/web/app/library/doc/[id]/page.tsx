import { API } from "@/lib/api";
import Nav from "@/components/Nav";
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

export default async function DocPage({ params }: { params: { id: string } }) {
  const doc = await getDoc(params.id);
  if (!doc) {
    return (<><Nav active="library" /><p className="muted">문서를 찾을 수 없습니다.</p></>);
  }
  return (
    <>
      <Nav active="library" />
      <p><Link href={`/library/${encodeURIComponent(doc.source)}`}>← {doc.source}</Link></p>
      <article className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.full_text}</ReactMarkdown>
      </article>
    </>
  );
}
