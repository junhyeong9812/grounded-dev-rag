import Nav from "@/components/Nav";
import Link from "next/link";
import {
  readlogFetch,
  validateSession,
  type BookListItem,
  type StatsResponse,
  type ExportJobView,
} from "@/lib/readlog";

export const dynamic = "force-dynamic";

// 독서 탭 홈 — 책 목록 + 스트릭 헤더 + export FAILED 배지(상단, 조회 실패 시 숨김).
export default async function ReadingHome() {
  if (!(await validateSession())) {
    return (
      <>
        <Nav active="reading" />
        <p className="muted">로그인이 필요합니다. 우측 상단에서 로그인 후 이용하세요.</p>
      </>
    );
  }

  let books: BookListItem[] | null;
  let stats: StatsResponse | null;
  try {
    books = await readlogFetch<BookListItem[]>("/books");
    stats = await readlogFetch<StatsResponse>("/stats");
  } catch {
    return (
      <>
        <Nav active="reading" />
        <p className="err">독후감 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.</p>
      </>
    );
  }

  // FAILED 배지 — 조회 실패 시 배지 자체를 숨긴다(별도 try, 페이지는 계속 렌더).
  let failedCount = 0;
  try {
    const jobs = await readlogFetch<ExportJobView[]>("/admin/export-jobs?status=FAILED");
    failedCount = jobs?.length ?? 0;
  } catch {
    /* 배지 숨김 */
  }

  const list = books ?? [];
  return (
    <>
      <Nav active="reading" />
      <div className="reading-streak">
        <span className="badge">🔥 연속 {stats?.currentStreak ?? 0}일</span>
        <span>완성 {stats?.totalDone ?? 0}건</span>
        {stats?.lastCompletedDate ? <span className="muted">최근 완성 {stats.lastCompletedDate}</span> : null}
        {failedCount > 0 ? <span className="badge warn">export 실패 {failedCount}건</span> : null}
        <a href="/apk/readlog.apk" download className="badge" title="Android 앱 설치 파일 (사이드로드)">
          📱 앱 다운로드
        </a>
      </div>
      {list.length === 0 ? (
        <p className="muted">아직 등록된 책이 없습니다.</p>
      ) : (
        list.map((b) => (
          <Link key={b.id} href={`/reading/${b.id}`} className="card book-row">
            <div>
              <h3>{b.title}</h3>
              {b.author ? <div className="muted">{b.author}</div> : null}
            </div>
            <span className="prog">
              {b.progress?.done ?? 0} / {b.progress?.total ?? 0} 완성
            </span>
          </Link>
        ))
      )}
    </>
  );
}
