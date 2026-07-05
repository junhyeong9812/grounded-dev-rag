// ⚠️ SERVER-ONLY — Readlog 독후감 조회 API 헬퍼.
// 이 프로젝트에는 "server-only" 패키지가 없어 import 가드 대신 이 주석으로 서버 전용을 표기한다.
// READLOG_API_URL·READLOG_TOKEN 은 서버 env 전용(NEXT_PUBLIC 금지 — 브라우저에 노출 금지).
import { cookies } from "next/headers";
import { API } from "@/lib/api";

const READLOG_API = process.env.READLOG_API_URL || "http://192.168.55.9:12000";
const READLOG_TOKEN = process.env.READLOG_TOKEN;

// 백엔드 응답 계약(Readlog server ReadingDtos.kt — camelCase JSON).
export type Progress = { done: number; total: number };
export type BookListItem = {
  id: number;
  clientUuid: string;
  title: string;
  author: string | null;
  progress: Progress;
};
export type BookSummary = { id: number; clientUuid: string; title: string; author: string | null };
export type ChapterNode = {
  id: number;
  position: number;
  title: string;
  done: boolean;
  fragmentCount: number;
  children: ChapterNode[];
};
export type BookDetail = { book: BookSummary; chapters: ChapterNode[] };
export type ChapterSummary = {
  id: number;
  bookId: number;
  parentId: number | null;
  position: number;
  title: string;
};
export type FragmentDto = {
  id: number;
  clientUuid: string;
  location: string | null;
  kind: string;
  memo: string;
};
export type EntryDto = { id: number; summary: string | null; refined: string | null; oneLine: string | null };
export type Rollup = { total: number; done: number; oneLines: string[] };
export type ChapterDetail = {
  chapter: ChapterSummary;
  fragments: FragmentDto[];
  entry: EntryDto | null;
  rollup: Rollup;
};
export type StatsResponse = { currentStreak: number; lastCompletedDate: string | null; totalDone: number };
export type ExportJobView = { id: number; bookId: number; status: string; attempts: number };

/** 비2xx(404 제외) 또는 네트워크 오류를 페이지 오류 상태로 구분하기 위한 에러. */
export class ReadlogError extends Error {}

/**
 * Readlog GET 헬퍼. path 는 `/books` 처럼 `/api/v1` 뒤 경로.
 * - 404 → null (없음 상태로 분기)
 * - 그 외 비2xx / 네트워크 오류 → throw (502 성격 — 페이지 오류 상태로 분기)
 * cache: no-store (force-dynamic 관례, 개인 데이터 실시간).
 */
export async function readlogFetch<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (READLOG_TOKEN) headers.Authorization = `Bearer ${READLOG_TOKEN}`;
  let res: Response;
  try {
    res = await fetch(`${READLOG_API}/api/v1${path}`, { cache: "no-store", headers });
  } catch {
    // 네트워크 오류(백엔드 down·DNS·타임아웃)를 페이지 오류 상태로 정규화(500 대신).
    throw new ReadlogError(`readlog ${path} → network error`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ReadlogError(`readlog ${path} → ${res.status}`);
  try {
    return (await res.json()) as T;
  } catch {
    // 계약 붕괴(비JSON·잘린 응답)도 오류 상태로 정규화.
    throw new ReadlogError(`readlog ${path} → invalid json`);
  }
}

/**
 * 로그인 게이트 — sid 쿠키를 X-Session-Token 헤더로 orchestrator(auth/me)에 넘겨 서버측 실검증.
 * app/api/auth/me/route.ts 와 동일 방식(2xx만 유효). 부재·실패·오류 = 미로그인.
 * 기존 탭은 백엔드가 sid를 검증하지만 Readlog는 서비스 토큰 인증(T4)이라
 * 사용자 게이트는 여기서 완결해야 함.
 */
export async function validateSession(): Promise<boolean> {
  const sid = cookies().get("sid")?.value;
  if (!sid) return false;
  try {
    const r = await fetch(`${API}/auth/me`, {
      headers: { "X-Session-Token": sid },
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}
