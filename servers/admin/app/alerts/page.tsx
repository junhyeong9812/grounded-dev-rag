"use client";
import { useEffect, useState } from "react";

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  async function load() {
    const r = await fetch("/api/admin/alerts?limit=80", { cache: "no-store" });
    const d = await r.json();
    setAlerts(d.alerts ?? []);
  }
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  return (
    <>
      <p className="muted" style={{ marginBottom: 14 }}>
        임계 초과 시 설정된 메일로 발송 (같은 항목 30분 쿨다운)
      </p>
      {alerts.length === 0 && <p className="muted">경보 없음 — 모든 자원 정상.</p>}
      {alerts.length > 0 && (
        <table>
          <thead><tr><th>시각</th><th>호스트</th><th>지표</th><th>값</th><th>임계</th><th>메일</th><th>상세</th></tr></thead>
          <tbody>
            {alerts.map((a, i) => (
              <tr key={i}>
                <td className="muted">{a.ts}</td><td>{a.host}</td><td>{a.metric}</td>
                <td style={{ color: "var(--bad)" }}>{a.value?.toFixed?.(1) ?? a.value}</td><td>{a.threshold}</td>
                <td>{a.sent ? "✓" : "—"}</td><td className="muted">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
