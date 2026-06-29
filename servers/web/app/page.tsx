import Nav from "@/components/Nav";
import Link from "next/link";

export const dynamic = "force-dynamic";

// study-site식 카드 입구 — 섹션 선택 허브.
const CARDS = [
  { href: "/news", icon: "📰", title: "데일리 뉴스", desc: "매일 5개 소스 선별·요약. 출처별·일자별로 본다." },
  { href: "/library", icon: "📚", title: "자료실", desc: "설계 원칙·변천사·레퍼런스·유명 프로젝트·사전·코드." },
  { href: "/ask", icon: "💬", title: "AI 질의", desc: "지식베이스 기반 질문. 스트리밍 답변." },
];

export default function Home() {
  return (
    <>
      <Nav active="home" />
      <div className="home-hero">
        <h2>개발 인텔리전스</h2>
        <p className="muted">데일리 뉴스 · 자료실 · AI 질의 — 무엇을 볼까요?</p>
      </div>
      <div className="home-cards">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="home-card">
            <span className="home-card-icon">{c.icon}</span>
            <h3>{c.title}</h3>
            <p className="muted">{c.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
