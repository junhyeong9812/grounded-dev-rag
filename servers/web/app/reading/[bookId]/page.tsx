import Nav from "@/components/Nav";
import Link from "next/link";
import { readlogFetch, validateSession, type BookDetail, type ChapterNode } from "@/lib/readlog";

export const dynamic = "force-dynamic";

// 목차 트리(중첩) — 완성 챕터엔 배지, 클릭 시 챕터 뷰로.
function Tree({ bookId, nodes }: { bookId: number; nodes: ChapterNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <ul className="ch-tree">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="ch-row">
            <Link href={`/reading/${bookId}/${n.id}`}>{n.title}</Link>
            {n.done ? <span className="badge">✓ 완성</span> : null}
            {n.fragmentCount > 0 ? <span className="muted">조각 {n.fragmentCount}</span> : null}
          </div>
          <Tree bookId={bookId} nodes={n.children ?? []} />
        </li>
      ))}
    </ul>
  );
}

export default async function BookPage({ params }: { params: { bookId: string } }) {
  if (!(await validateSession())) {
    return (
      <>
        <Nav active="reading" />
        <p className="muted">로그인이 필요합니다. 우측 상단에서 로그인 후 이용하세요.</p>
      </>
    );
  }

  // bookId 는 Number 검증 후 비정상이면 없음 처리(백엔드 왕복 회피).
  const bookId = Number(params.bookId);
  const invalid = !Number.isInteger(bookId) || bookId <= 0;

  let detail: BookDetail | null = null;
  let failed = false;
  if (!invalid) {
    try {
      detail = await readlogFetch<BookDetail>(`/books/${bookId}`);
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
  if (invalid || !detail) {
    return (
      <>
        <Nav active="reading" />
        <p className="muted">
          책을 찾을 수 없습니다. <Link href="/reading">목록으로</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Nav active="reading" />
      <p className="muted">
        <Link href="/reading">← 목록</Link>
      </p>
      <h2>{detail.book.title}</h2>
      {detail.book.author ? <p className="muted">{detail.book.author}</p> : null}
      {(detail.chapters ?? []).length === 0 ? (
        <p className="muted">아직 목차가 없습니다.</p>
      ) : (
        <Tree bookId={detail.book.id} nodes={detail.chapters ?? []} />
      )}
    </>
  );
}
