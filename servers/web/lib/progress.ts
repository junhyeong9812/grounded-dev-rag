// 읽음 표시 — study-site useProgress 모델(localStorage). 단일 사용자라 클라이언트 보관으로 충분.
const KEY = "read-docs";

export function getRead(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function markRead(id: string | number) {
  if (typeof window === "undefined") return;
  const s = getRead();
  s.add(String(id));
  localStorage.setItem(KEY, JSON.stringify([...s]));
  window.dispatchEvent(new Event("doc-read"));
}
