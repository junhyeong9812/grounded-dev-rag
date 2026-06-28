// BFF가 호출하는 백엔드(Spring API) 베이스 URL. 브라우저엔 노출 안 됨(서버 전용).
export const API = process.env.ORCHESTRATOR_URL || "http://192.168.55.9:8090";

export type IntelItem = {
  source: string; url: string; title: string;
  analysis: string; score: number | null; date: string;
};

export type Source = {
  namespace: string; domain: string | null;
  title: string; section: string; path: string;
};
