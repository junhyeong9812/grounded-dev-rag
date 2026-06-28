import Nav from "@/components/Nav";
import LibTree from "@/components/LibTree";

// study-site AppShell 모델: 좌측 트리 사이드바 + 우측 콘텐츠.
export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav active="library" />
      <div className="lib-shell">
        <aside className="lib-sidebar">
          <LibTree />
        </aside>
        <main className="lib-content">{children}</main>
      </div>
    </>
  );
}
