"use client";
import { Fragment, useEffect, useState } from "react";

type Doc = {
  docId: string; namespace: string; source: string | null;
  title: string; analysis: string | null; date: string | null; reviewStatus: string;
};
const NS = ["intel", "corpus", "history", "tech", "qa", "graph"];

export default function Data() {
  const [ns, setNs] = useState("intel");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/admin/documents?namespace=${ns}&limit=60`, { cache: "no-store" });
    const d = await r.json();
    setDocs(d.items ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ns]);

  async function saveAnalysis(id: string) {
    setBusy(true);
    await fetch(`/api/admin/documents/${id}/analysis`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysis: draft }),
    });
    setBusy(false); setEdit(null); load();
  }
  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/documents/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    load();
  }
  async function del(id: string) {
    if (!confirm("삭제하면 PG·검색 인덱스에서 모두 제거됩니다. 진행할까요?")) return;
    await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        네임스페이스:{" "}
        <select value={ns} onChange={(e) => setNs(e.target.value)}>
          {NS.map((n) => <option key={n}>{n}</option>)}
        </select>
        <button className="btn" onClick={load} style={{ marginLeft: 8 }}>새로고침</button>
        <span className="muted" style={{ marginLeft: 10 }}>{docs.length}건</span>
      </div>
      <table>
        <thead><tr><th>제목</th><th>출처</th><th>상태</th><th>작업</th></tr></thead>
        <tbody>
          {docs.map((d) => (
            <Fragment key={d.docId}>
              <tr>
                <td>{d.title}</td>
                <td className="muted">{d.source}<br />{d.date}</td>
                <td><span className={"pill " + d.reviewStatus}>{d.reviewStatus}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn" onClick={() => { setEdit(edit === d.docId ? null : d.docId); setDraft(d.analysis ?? ""); }}>
                    {edit === d.docId ? "닫기" : "수정"}
                  </button>
                  <button className="btn ok" onClick={() => setStatus(d.docId, "validated")}>검증</button>
                  <button className="btn" onClick={() => setStatus(d.docId, "hidden")}>숨김</button>
                  <button className="btn bad" onClick={() => del(d.docId)}>삭제</button>
                </td>
              </tr>
              {edit === d.docId && (
                <tr>
                  <td colSpan={4}>
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <button className="btn ok" disabled={busy} onClick={() => saveAnalysis(d.docId)} style={{ marginTop: 6 }}>
                      {busy ? "저장 중…" : "저장 + 재임베딩"}
                    </button>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}
