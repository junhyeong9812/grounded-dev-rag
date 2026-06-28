import { NextRequest, NextResponse } from "next/server";

// admin 사이트 전체를 basic auth로 보호 (edge runtime — btoa 사용).
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASS || "changeme-admin";
  const expected = "Basic " + btoa(`${user}:${pass}`);
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("인증 필요", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="junproject admin"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
