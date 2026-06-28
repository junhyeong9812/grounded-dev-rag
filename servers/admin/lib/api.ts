// Spring 백엔드 base + admin basic-auth 헤더(서버 전용).
export const API = process.env.ORCHESTRATOR_URL || "http://192.168.55.9:8090";

export function adminAuthHeader(): string {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASS || "changeme-admin";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}
