"use client";
import { useEffect, useState } from "react";

export default function Usage() {
  const [data, setData] = useState<any>(null);
  async function load() {
    const r = await fetch("/api/admin/usage?limit=80", { cache: "no-store" });
    setData(await r.json());
  }
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  if (!data) return <p className="muted">로딩…</p>;
  const s = data.summary ?? {};
  return (
    <>
      <div className="summary">
        <div>총 호출 <b>{s.total ?? 0}</b></div>
        <div>최근 24h <b>{s.last24h ?? 0}</b></div>
      </div>
      <h3 style={{ fontSize: 14, color: "var(--accent)", margin: "10px 0" }}>엔드포인트별 (7일)</h3>
      <table>
        <thead><tr><th>엔드포인트</th><th>호출 수</th><th>평균 지연(ms)</th></tr></thead>
        <tbody>
          {(s.byEndpoint ?? []).map((e: any, i: number) => (
            <tr key={i}><td>{e.endpoint}</td><td>{e.cnt}</td><td>{e.avg_ms ?? "-"}</td></tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ fontSize: 14, color: "var(--accent)", margin: "20px 0 10px" }}>최근 요청</h3>
      <table>
        <thead><tr><th>시각</th><th>엔드포인트</th><th>상태</th><th>지연</th><th>IP</th><th>질문</th></tr></thead>
        <tbody>
          {(data.recent ?? []).map((r: any, i: number) => (
            <tr key={i}>
              <td className="muted">{r.ts}</td><td>{r.endpoint}</td><td>{r.status}</td>
              <td>{r.latency_ms}ms</td><td className="muted">{r.client_ip}</td>
              <td className="muted">{r.query ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
