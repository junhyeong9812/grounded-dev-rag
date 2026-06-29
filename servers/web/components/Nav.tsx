import Link from "next/link";
import LoginButton from "./LoginButton";

export default function Nav({ active }: { active: "home" | "news" | "ask" | "library" }) {
  return (
    <nav className="tabs">
      <Link href="/" className={active === "home" ? "active" : ""}>홈</Link>
      <Link href="/news" className={active === "news" ? "active" : ""}>데일리 뉴스</Link>
      <Link href="/ask" className={active === "ask" ? "active" : ""}>AI 질의</Link>
      <Link href="/library" className={active === "library" ? "active" : ""}>자료실</Link>
      <span className="nav-spacer" />
      <LoginButton />
    </nav>
  );
}
