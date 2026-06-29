"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const LABEL: Record<string, string> = {
  hackernews: "HN", lobsters: "Lobsters", devto: "Dev.to", geeknews: "GeekNews", github: "GitHub",
};
const SRC_ORDER = ["hackernews", "lobsters", "devto", "geeknews", "github"];

type Item = { source: string; url: string; title: string; analysis: string; score: number | null; date: string };

export default function News() {
  const [dates, setDates] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [srcFilter, setSrcFilter] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    fetch("/api/intel/dates").then((r) => r.json()).then((d) => {
      const ds: string[] = d.dates ?? [];
      setDates(ds); setSel(ds[0] ?? null);
      if (!ds[0]) setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (!sel) return;
    setLoading(true);
    fetch(`/api/intel?date=${encodeURIComponent(sel)}`).then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setIdx(0); setLoading(false); });
  }, [sel]);

  const filtered = items
    .filter((it) => !srcFilter || it.source === srcFilter)
    .sort((a, b) => SRC_ORDER.indexOf(a.source) - SRC_ORDER.indexOf(b.source));
  useEffect(() => { setIdx(0); }, [srcFilter]);
  const cur = filtered[idx];
  const srcs = SRC_ORDER.filter((s) => items.some((it) => it.source === s));

  function go(d: number) {
    setIdx((i) => Math.min(Math.max(i + d, 0), filtered.length - 1));
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [filtered.length]);

  return (
    <>
      <Nav active="news" />
      <div className="news-dates">
        {dates.map((d) => (
          <button key={d} className={"date-tab" + (d === sel ? " active" : "")} onClick={() => setSel(d)}>{d}</button>
        ))}
        {dates.length === 0 && <span className="muted">아직 수집된 뉴스가 없습니다. 매일 04:00(KST) 배치가 채웁니다.</span>}
      </div>
      {dates.length > 0 && (
        <div className="news-srcfilter">
          <button className={"chip" + (srcFilter === null ? " active" : "")} onClick={() => setSrcFilter(null)}>전체</button>
          {srcs.map((s) => (
            <button key={s} className={"chip src-" + s + (srcFilter === s ? " active" : "")} onClick={() => setSrcFilter(s)}>{LABEL[s] ?? s}</button>
          ))}
        </div>
      )}
      {loading && <p className="muted">불러오는 중…</p>}
      {!loading && filtered.length === 0 && <p className="muted">이 날짜에 뉴스가 없습니다.</p>}
      {!loading && cur && (
        <div className="slider">
          <button className="slider-arrow" onClick={() => go(-1)} disabled={idx === 0} aria-label="이전">◀</button>
          <article className={"slide card src-" + cur.source}>
            <div className="meta">
              <span className="badge">{LABEL[cur.source] ?? cur.source}</span>
              {cur.score ? <span>★ {cur.score}</span> : null}
              <a href={cur.url} target="_blank" rel="noreferrer">원문 ↗</a>
              <span className="slide-count">{idx + 1} / {filtered.length}</span>
            </div>
            <h3>{cur.title}</h3>
            <div className="analysis markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.analysis}</ReactMarkdown></div>
          </article>
          <button className="slider-arrow" onClick={() => go(1)} disabled={idx >= filtered.length - 1} aria-label="다음">▶</button>
        </div>
      )}
    </>
  );
}
