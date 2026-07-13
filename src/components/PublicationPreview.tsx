import { Link } from "@tanstack/react-router";
import { createContext, useContext } from "react";

const PublicationPreviewContext = createContext(false);

export function PublicationPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicationPreviewContext.Provider value>
      {children}
    </PublicationPreviewContext.Provider>
  );
}

export function usePublicationPreview() {
  return useContext(PublicationPreviewContext);
}

export function PublicationPreviewBanner({
  title,
  publicHref,
}: {
  title: string;
  publicHref?: string;
}) {
  return (
    <aside className="publication-preview-banner" role="status">
      <div>
        <strong>관리자 미리보기</strong>
        <span>{title} · 공개 분석, 토론, 진도 저장이 비활성화됩니다.</span>
      </div>
      <nav aria-label="미리보기 도구">
        {publicHref ? <a href={publicHref}>공개 URL 확인</a> : null}
        <Link to="/admin">관리자 콘솔로 돌아가기</Link>
      </nav>
    </aside>
  );
}
