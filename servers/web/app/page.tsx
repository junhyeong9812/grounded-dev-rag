import { API, IntelItem } from "@/lib/api";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  hackernews: "HN", lobsters: "Lobsters", devto: "Dev.to", geeknews: "GeekNews", github: "GitHub",
};

async function getIntel(): Promise<IntelItem[]> {
  try {
    const r = await fetch(`${API}/intel?limit=80`, { cache: "no-store" });
    const d = await r.json();
    return d.items ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const items = await getIntel();
  const byDate: Record<string, IntelItem[]> = {};
  for (const it of items) (byDate[it.date] ??= []).push(it);
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <>
      <Nav active="news" />
      {dates.length === 0 && (
        <p className="muted">아직 수집된 뉴스가 없습니다. 매일 07:00 배치가 채웁니다.</p>
      )}
      {dates.map((date) => (
        <div className="date-group" key={date}>
          <h2>{date}</h2>
          {byDate[date].map((it, i) => (
            <article className="card" key={i}>
              <div className="meta">
                <span className="badge">{LABEL[it.source] ?? it.source}</span>
                {it.score ? <span>★ {it.score}</span> : null}
                <a href={it.url} target="_blank" rel="noreferrer">원문 ↗</a>
              </div>
              <h3>{it.title}</h3>
              <div className="analysis">{it.analysis}</div>
            </article>
          ))}
        </div>
      ))}
    </>
  );
}
