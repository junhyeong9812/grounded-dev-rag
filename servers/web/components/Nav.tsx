import Link from "next/link";

export default function Nav({ active }: { active: "news" | "ask" }) {
  return (
    <nav className="tabs">
      <Link href="/" className={active === "news" ? "active" : ""}>데일리 뉴스</Link>
      <Link href="/ask" className={active === "ask" ? "active" : ""}>AI 질의</Link>
    </nav>
  );
}
