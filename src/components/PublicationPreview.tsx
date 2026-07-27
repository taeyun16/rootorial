import { Link } from "@tanstack/react-router";
import { createContext, useContext } from "react";
import { useLocale } from "../features/localization/localization";

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
  localDevelopment = false,
}: {
  title: string;
  publicHref?: string;
  localDevelopment?: boolean;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  return (
    <aside className="publication-preview-banner" role="status">
      <div>
        <strong>
          {localDevelopment
            ? isKo ? "로컬 콘텐츠 미리보기" : "Local content preview"
            : isKo ? "관리자 미리보기" : "Admin preview"}
        </strong>
        <span>
          {title} · {isKo
            ? "공개 분석, 토론, 진도 저장이 비활성화됩니다."
            : "Public analytics, discussions, and progress saving are disabled."}
        </span>
      </div>
      <nav aria-label={isKo ? "미리보기 도구" : "Preview tools"}>
        {localDevelopment ? (
          <a href={`/admin/preview/curricula/${isKo ? "" : "?lang=en"}`}>
            {isKo ? "전체 감사 인덱스" : "All-curriculum audit"}
          </a>
        ) : null}
        {publicHref ? <a href={publicHref}>{isKo ? "공개 URL 확인" : "Check public URL"}</a> : null}
        {localDevelopment ? null : (
          <Link to="/admin">{isKo ? "관리자 콘솔로 돌아가기" : "Back to admin console"}</Link>
        )}
      </nav>
    </aside>
  );
}
