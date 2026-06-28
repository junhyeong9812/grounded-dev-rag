"use client";
import { useEffect } from "react";
import { markRead } from "@/lib/progress";

// 문서 뷰 진입 시 읽음 처리(트리에 ✓ 반영).
export default function MarkRead({ id }: { id: number }) {
  useEffect(() => {
    markRead(id);
  }, [id]);
  return null;
}
