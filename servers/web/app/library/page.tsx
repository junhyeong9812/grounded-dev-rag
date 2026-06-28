// 자료실 랜딩 — 좌측 트리에서 문서 선택. (Nav·사이드바는 layout.tsx)
export const dynamic = "force-dynamic";

export default function Library() {
  return (
    <div className="lib-landing">
      <h2>자료실</h2>
      <p className="muted">
        좌측 트리에서 카테고리 → 소스 → 문서를 선택하세요. 의미 검색은 상단 <a href="/ask">AI 질의</a>.
      </p>
      <ul className="muted lib-hint">
        <li>설계 원칙 · 변천사 · 레퍼런스 · 유명 프로젝트(깃 분석) · 사전 · 코드 레퍼런스</li>
        <li>문서를 열면 이전/다음 화살표로 같은 소스 안을 이어 볼 수 있습니다.</li>
      </ul>
    </div>
  );
}
