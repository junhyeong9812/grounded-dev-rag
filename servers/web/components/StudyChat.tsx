"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 문서 옆 학습 도우미 — Claude Code 스트리밍. 로그인 시만. 대화 저장(세션 유지·resume).
type Msg = { role: "user" | "assistant"; content: string };

export default function StudyChat({ docId }: { docId: number }) {
  const [account, setAccount] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setAccount(d.account)).catch(() => {});
  }, []);

  function ask() {
    if (!q.trim() || streaming) return;
    const question = q.trim();
    setMsgs((m) => [...m, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setQ("");
    setStreaming(true);
    const params = new URLSearchParams();
    params.set("q", question);
    if (sessionId) params.set("sessionId", String(sessionId));
    else params.set("docId", String(docId));
    const es = new EventSource(`/api/study/ask?${params.toString()}`);
    es.addEventListener("token", (e: MessageEvent) =>
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: c[c.length - 1].content + e.data };
        return c;
      }));
    es.addEventListener("session", (e: MessageEvent) => setSessionId(Number(e.data)));
    es.addEventListener("done", () => { es.close(); setStreaming(false); });
    es.addEventListener("error", () => { es.close(); setStreaming(false); });
    es.onerror = () => { es.close(); setStreaming(false); };
  }

  function newChat() { setMsgs([]); setSessionId(null); }

  if (!account) return null;
  if (!open)
    return <button className="study-fab" onClick={() => setOpen(true)}>💬 이 문서 질문하기</button>;

  return (
    <div className="study-panel">
      <div className="study-head">
        <span>💬 학습 도우미 <span className="muted">(Claude)</span></span>
        <span>
          <button className="link-btn" onClick={newChat}>새 대화</button>{" "}
          <button className="link-btn" onClick={() => setOpen(false)}>✕</button>
        </span>
      </div>
      <div className="study-msgs">
        {msgs.length === 0 && <p className="muted">이 문서에 대해 모르는 걸 물어보세요. 대화는 저장됩니다.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={"study-msg " + m.role}>
            {m.role === "assistant" ? (
              <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown></div>
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>
      <div className="study-input">
        <textarea value={q} rows={2} placeholder="질문 (Enter 전송, Shift+Enter 줄바꿈)"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
        <button onClick={ask} disabled={streaming}>{streaming ? "…" : "전송"}</button>
      </div>
    </div>
  );
}
