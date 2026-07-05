import Nav from "@/components/Nav";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readlogFetch, validateSession, type ChapterDetail } from "@/lib/readlog";

export const dynamic = "force-dynamic";

export default async function ChapterPage({ params }: { params: { bookId: string; chapterId: string } }) {
  if (!(await validateSession())) {
    return (
      <>
        <Nav active="reading" />
        <p className="muted">로그인이 필요합니다. 우측 상단에서 로그인 후 이용하세요.</p>
      </>
    );
  }

  const bookId = Number(params.bookId);
  const chapterId = Number(params.chapterId);
  const invalid = !Number.isInteger(chapterId) || chapterId <= 0;

  let detail: ChapterDetail | null = null;
  let failed = false;
  if (!invalid) {
    try {
      detail = await readlogFetch<ChapterDetail>(`/chapters/${chapterId}`);
    } catch {
      failed = true;
    }
  }

  if (failed) {
    return (
      <>
        <Nav active="reading" />
        <p className="err">독후감 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.</p>
      </>
    );
  }
  // 챕터가 경로의 책에 실제로 속하는지 검증(소속 불일치 = 없음 처리, 교차 책 URL 조작 방어).
  if (invalid || !detail || detail.chapter.bookId !== bookId) {
    return (
      <>
        <Nav active="reading" />
        <p className="muted">
          챕터를 찾을 수 없습니다. <Link href="/reading">목록으로</Link>
        </p>
      </>
    );
  }

  const backHref = Number.isInteger(bookId) && bookId > 0 ? `/reading/${bookId}` : "/reading";
  const { chapter, entry, rollup } = detail;
  const fragments = detail.fragments ?? [];
  const rollupLines = rollup?.oneLines ?? [];
  return (
    <>
      <Nav active="reading" />
      <p className="muted">
        <Link href={backHref}>← 목차</Link>
      </p>
      <h2>{chapter.title}</h2>

      {/* 완성 한 문장 — 사용자 입력이라 마크다운 미해석: blockquote 안 순수 텍스트로 렌더(구조 토큰·개행 안전). */}
      {entry?.oneLine ? (
        <blockquote className="oneline" style={{ whiteSpace: "pre-wrap" }}>
          {entry.oneLine}
        </blockquote>
      ) : null}

      {/* 조각 */}
      <section>
        <h3>조각</h3>
        {fragments.length === 0 ? (
          <p className="muted">조각이 없습니다.</p>
        ) : (
          fragments.map((f) => (
            <div key={f.id} className="frag">
              <div className="meta muted">
                {f.kind}
                {f.location ? ` · ${f.location}` : ""}
              </div>
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{f.memo}</ReactMarkdown>
              </div>
            </div>
          ))
        )}
      </section>

      {/* 정리(요약·다듬은 글) */}
      {entry && (entry.summary || entry.refined) ? (
        <section>
          <h3>정리</h3>
          {entry.summary ? (
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.summary}</ReactMarkdown>
            </div>
          ) : null}
          {entry.refined ? (
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.refined}</ReactMarkdown>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 하위 완성 한 문장 롤업 — 각 문장을 blockquote 안 순수 텍스트로(마크다운 미해석). */}
      {rollupLines.length > 0 ? (
        <section>
          <h3>
            하위 완성 {rollup?.done ?? 0} / {rollup?.total ?? 0}
          </h3>
          {rollupLines.map((l, i) => (
            <blockquote key={i} className="oneline" style={{ whiteSpace: "pre-wrap" }}>
              {l}
            </blockquote>
          ))}
        </section>
      ) : null}
    </>
  );
}
