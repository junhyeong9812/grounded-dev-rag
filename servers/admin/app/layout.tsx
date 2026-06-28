import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "junproject admin" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="wrap">
          <header className="top">
            <h1>junproject</h1>
            <span className="tag">ADMIN</span>
          </header>
          <nav className="tabs">
            <Link href="/">자원 대시보드</Link>
            <Link href="/data">데이터 검증</Link>
            <Link href="/usage">사용량</Link>
            <Link href="/alerts">알림</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
