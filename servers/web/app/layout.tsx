import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "junproject — 개발 인텔리전스",
  description: "데일리 기술 뉴스 + corpus·변천사 기반 AI 질의",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="wrap">
          <header className="top">
            <h1>junproject</h1>
            <span className="muted">개발 인텔리전스</span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
