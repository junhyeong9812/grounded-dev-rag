"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 자료실 문서 뷰: 좌우 화살표 키로 같은 폴더 이전/다음 문서로 슬라이드.
export default function DocKeyNav({ prevId, nextId }: { prevId: number | null; nextId: number | null }) {
  const router = useRouter();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return; // 입력 중이면 무시
      if (e.key === "ArrowLeft" && prevId != null) router.push(`/library/doc/${prevId}`);
      if (e.key === "ArrowRight" && nextId != null) router.push(`/library/doc/${nextId}`);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prevId, nextId, router]);
  return null;
}
