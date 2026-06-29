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

  useEffect(() => {
    fetch("/api/intel/dates").then((r) => r.json()).then((d) => {
      const ds: string[] = d.dates ?? [];
      setDates(ds);
      setSel(ds[0] ?? null);
      if (!ds[0]) setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (!sel) return;
    setLoading(true);
    fetch(`/api/intel?date=${encodeURIComponent(sel)}`).then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); });
  }, [sel]);

  const bySrc: Record<string, Item[]> = {};
  for (const it of items) (bySrc[it.source] ??= []).push(it);
  const sources = Object.keys(bySrc).sort((a, b) => SRC_ORDER.indexOf(a) - SRC_ORDER.indexOf(b));

  return (
    <>
      <Nav active="news" />
      <div className="news-dates">
        {dates.map((d) => (
          <button key={d} className={"date-tab" + (d === sel ? " active" : "")} onClick={() => setSel(d)}>{d}</button>
        ))}
        {dates.length === 0 && <span className="muted">아직 수집된 뉴스가 없습니다. 매일 04:00(KST) 배치가 채웁니다.</span>}
      </div>
      {loading && <p className="muted">불러오는 중…</p>}
      {!loading && sources.map((src) => (
        <section key={src} className={"news-src src-" + src}>
          <h2><span className="badge">{LABEL[src] ?? src}</span> <span className="muted">{bySrc[src].length}건</span></h2>
          {bySrc[src].map((it, i) => (
            <article className="card" key={i}>
              <div className="meta">
                {it.score ? <span>★ {it.score}</span> : null}
                <a href={it.url} target="_blank" rel="noreferrer">원문 ↗</a>
              </div>
              <h3>{it.title}</h3>
              <div className="analysis markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{it.analysis}</ReactMarkdown></div>
            </article>
          ))}
        </section>
      ))}
    </>
  );
}
