"use client";
import { useEffect, useState } from "react";

// 단일 계정 로그인(개인 학습용). 회원가입 없음. 세션은 HttpOnly 쿠키.
export default function LoginButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setAccount(d.account)).catch(() => {});
  }, []);

  async function login() {
    setErr("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    if (r.ok) {
      const d = await r.json();
      setAccount(d.account);
      setOpen(false);
      setP("");
    } else setErr("로그인 실패");
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccount(null);
  }

  if (account)
    return (
      <span className="login-state">
        👤 {account} <button className="link-btn" onClick={logout}>로그아웃</button>
      </span>
    );
  return (
    <span className="login-wrap">
      <button className="link-btn" onClick={() => setOpen((o) => !o)}>로그인</button>
      {open && (
        <div className="login-pop">
          <input placeholder="아이디" value={u} onChange={(e) => setU(e.target.value)} />
          <input placeholder="비밀번호" type="password" value={p}
            onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
          <button onClick={login}>로그인</button>
          {err && <span className="err">{err}</span>}
        </div>
      )}
    </span>
  );
}
