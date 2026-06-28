import { API } from "@/lib/api";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDocs(source: string) {
  try {
    const r = await fetch(`${API}/library/docs?source=${encodeURIComponent(source)}`, { cache: "no-store" });
    return (await r.json()).docs ?? [];
  } catch {
    return [];
  }
}

export default async function SourcePage({ params }: { params: { source: string } }) {
  const source = decodeURIComponent(params.source);
  const docs = await getDocs(source);
  return (
    <div className="doc-view">
      <h2 style={{ margin: "4px 0 18px" }}>{source} <span className="muted">({docs.length})</span></h2>
      <ul className="doc-list">
        {docs.map((d: { id: number; title: string; path: string }) => (
          <li key={d.id}>
            <Link href={`/library/doc/${d.id}`}>{d.title}</Link>
            <span className="muted"> {d.path}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
