"use client";
import { useEffect, useState } from "react";

type Host = {
  host: string; ts: string; cpu_pct: number; mem_pct: number; disk_pct: number;
  gpu_util: number | null; gpu_mem_pct: number | null; gpu_temp: number | null;
  raw?: any;
};

function Bar({ v }: { v: number | null }) {
  const val = v ?? 0;
  const cls = val > 90 ? "bar bad" : val > 75 ? "bar warn" : "bar";
  return <div className={cls}><span style={{ width: `${Math.min(val, 100)}%` }} /></div>;
}

export default function Dashboard() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [err, setErr] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/admin/metrics", { cache: "no-store" });
      const d = await r.json();
      setHosts((d.hosts ?? []).sort((a: Host, b: Host) => a.host.localeCompare(b.host)));
      setErr(false);
    } catch { setErr(true); }
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const NAME: Record<string, string> = {
    "192.168.55.9": "허브 (.9) — ES·PG·API", "192.168.55.158": "임베딩 (.158) — BGE-M3", "192.168.55.164": "LLM (.164) — Ollama",
  };

  return (
    <>
      <p className="muted" style={{ marginBottom: 14 }}>10초마다 자동 갱신 · 임계 초과 시 메일 알림</p>
      {err && <p style={{ color: "var(--bad)" }}>메트릭 조회 실패</p>}
      <div className="grid">
        {hosts.map((h) => {
          const docker = h.raw?.docker?.length ?? 0;
          return (
            <div className="metric-card" key={h.host}>
              <h3>{NAME[h.host] ?? h.host}</h3>
              <div className="row"><span className="k">CPU</span><span>{h.cpu_pct?.toFixed(1)}%</span></div>
              <Bar v={h.cpu_pct} />
              <div className="row"><span className="k">메모리</span><span>{h.mem_pct?.toFixed(1)}%</span></div>
              <Bar v={h.mem_pct} />
              <div className="row"><span className="k">디스크</span><span>{h.disk_pct?.toFixed(1)}%</span></div>
              <Bar v={h.disk_pct} />
              {h.gpu_temp != null && (
                <>
                  <div className="row"><span className="k">GPU 온도 / VRAM</span><span>{h.gpu_temp}°C / {h.gpu_mem_pct?.toFixed(0)}%</span></div>
                  <Bar v={h.gpu_mem_pct} />
                </>
              )}
              <div className="row" style={{ marginTop: 8 }}><span className="k">컨테이너</span><span>{docker}개</span></div>
              <div className="muted" style={{ fontSize: 11 }}>업데이트 {h.ts}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
