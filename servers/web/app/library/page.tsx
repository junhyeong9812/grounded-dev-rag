import { API } from "@/lib/api";
import Nav from "@/components/Nav";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NS_LABEL: Record<string, string> = {
  corpus: "설계 원칙", history: "변천사", ref: "레퍼런스", projects: "유명 프로젝트", dict: "사전",
};

async function getSources() {
  try {
    const r = await fetch(`${API}/library`, { cache: "no-store" });
    return (await r.json()).sources ?? [];
  } catch {
    return [];
  }
}

export default async function Library() {
  const sources = await getSources();
  return (
    <>
      <Nav active="library" />
      <p className="muted" style={{ marginBottom: 16 }}>
        레퍼런스 원문 보관소 — 의미 검색은 <Link href="/ask">AI 질의</Link>, 통독은 여기서.
      </p>
      <div className="lib-grid">
        {sources.map((s: any) => (
          <Link key={s.source} href={`/library/${encodeURIComponent(s.source)}`} className="lib-card">
            <h3>{s.source}</h3>
            <div className="muted">{NS_LABEL[s.domain] ?? s.domain ?? ""} · {s.cnt}건</div>
          </Link>
        ))}
      </div>
      {sources.length === 0 && <p className="muted">자료실이 비어 있습니다.</p>}
    </>
  );
}
