import { useEffect, useState } from "react";
import type { AdminPublicationCatalog } from "../features/admin/admin";
import type {
  PublicationListing,
  PublicationStatus,
  ResolvedPublication,
} from "../features/publication/publication";

const publicationStatusLabels: Record<PublicationStatus, string> = {
  draft: "초안",
  published: "발행",
  archived: "보관",
};

const listingLabels: Record<PublicationListing, string> = {
  hidden: "숨김",
  listed: "목록 공개",
  unlisted: "링크 공개",
};

const developmentStatusLabels: Record<ResolvedPublication["developmentStatus"], string> = {
  planned: "제작 예정",
  "in-progress": "제작 중",
  complete: "제작 완료",
};

const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1_000;

function toKoreaDateTimeInput(timestamp: number | null) {
  if (timestamp === null) return "";
  return new Date(timestamp + KOREA_TIME_OFFSET_MS).toISOString().slice(0, 16);
}

function fromKoreaDateTimeInput(value: string) {
  if (!value) return null;
  const timestamp = Date.parse(`${value}:00+09:00`);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function formatTimestamp(timestamp: number | null) {
  if (timestamp === null) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function effectiveStatus(item: ResolvedPublication) {
  if (
    item.publicationStatus === "draft" &&
    item.scheduledAt !== null &&
    item.effectivePublicationStatus === "draft"
  ) {
    return { label: "예약됨", className: "is-scheduled" };
  }
  return {
    label: publicationStatusLabels[item.effectivePublicationStatus],
    className: `is-${item.effectivePublicationStatus}`,
  };
}

function resourcePath(item: ResolvedPublication) {
  return item.resourceKind === "chapter"
    ? `/curricula/${item.curriculumSlug}/chapters/${item.chapterSlug}`
    : `/curricula/${item.curriculumSlug}`;
}

function previewPath(item: ResolvedPublication) {
  return item.resourceKind === "chapter"
    ? `/admin/preview/curricula/${item.curriculumSlug}/chapters/${item.chapterSlug}`
    : `/admin/preview/curricula/${item.curriculumSlug}`;
}

function canOpenPublicly(item: ResolvedPublication, parentIsAccessible: boolean) {
  return (
    parentIsAccessible &&
    item.contentReady &&
    item.effectivePublicationStatus === "published" &&
    item.listing !== "hidden"
  );
}

export function AdminPublicationManager({
  catalog,
  onReload,
}: {
  catalog: AdminPublicationCatalog;
  onReload: () => Promise<void>;
}) {
  if (catalog.available === false) {
    return (
      <section className="admin-panel admin-publication-section" aria-labelledby="publication-title">
        <div className="admin-publication-heading">
          <div>
            <p className="eyebrow">CONTENT PUBLICATION</p>
            <h2 id="publication-title">커리큘럼 공개 관리</h2>
          </div>
        </div>
        <div className="admin-empty">
          <strong>게시 상태 저장소를 불러올 수 없습니다.</strong>
          <span>{catalog.message}</span>
        </div>
      </section>
    );
  }

  const publishedCount = catalog.curricula.filter(
    ({ item }) => canOpenPublicly(item, true),
  ).length;
  const scheduledCount = catalog.curricula.reduce(
    (count, { item, chapters }) =>
      count + [item, ...chapters].filter(
        (resource) =>
          resource.publicationStatus === "draft" &&
          resource.scheduledAt !== null &&
          resource.effectivePublicationStatus === "draft",
      ).length,
    0,
  );

  return (
    <section className="admin-panel admin-publication-section" aria-labelledby="publication-title">
      <div className="admin-publication-heading">
        <div>
          <p className="eyebrow">CONTENT PUBLICATION</p>
          <h2 id="publication-title">커리큘럼 공개 관리</h2>
          <p>코드의 제작 상태는 유지하면서 공개 범위와 예약 발행을 관리합니다.</p>
        </div>
        <div className="admin-publication-summary" aria-label="게시 상태 요약">
          <span><strong>{publishedCount}</strong> 공개 커리큘럼</span>
          <span><strong>{scheduledCount}</strong> 예약 콘텐츠</span>
        </div>
      </div>

      <div className="admin-publication-list">
        {catalog.curricula.map(({ item, chapters }, index) => {
          const curriculumIsAccessible = canOpenPublicly(item, true);
          return (
            <details className="admin-publication-group" open={index === 0} key={item.resourceKey}>
              <summary>
                <span className="admin-publication-summary-title">
                  <strong>{item.title.ko}</strong>
                  <code>{item.curriculumSlug}</code>
                </span>
                <span className={`admin-publication-state ${effectiveStatus(item).className}`}>
                  {effectiveStatus(item).label}
                </span>
                <span className="admin-publication-summary-count">챕터 {chapters.length}개</span>
              </summary>
              <div className="admin-publication-group-body">
                <PublicationRow
                  item={item}
                  label="커리큘럼"
                  onReload={onReload}
                  parentIsAccessible
                />
                <div className="admin-publication-chapters" aria-label={`${item.title.ko} 챕터 게시 상태`}>
                  {chapters.length ? chapters.map((chapter) => (
                    <PublicationRow
                      item={chapter}
                      label="챕터"
                      onReload={onReload}
                      parentIsAccessible={curriculumIsAccessible}
                      key={chapter.resourceKey}
                    />
                  )) : (
                    <p className="admin-publication-no-chapters">등록된 챕터가 없습니다.</p>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function PublicationRow({
  item,
  label,
  onReload,
  parentIsAccessible,
}: {
  item: ResolvedPublication;
  label: "커리큘럼" | "챕터";
  onReload: () => Promise<void>;
  parentIsAccessible: boolean;
}) {
  const [publicationStatus, setPublicationStatus] = useState(item.publicationStatus);
  const [listing, setListing] = useState(item.listing);
  const [scheduledAt, setScheduledAt] = useState(toKoreaDateTimeInput(item.scheduledAt));
  const [saving, setSaving] = useState<"save" | "reset" | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setPublicationStatus(item.publicationStatus);
    setListing(item.listing);
    setScheduledAt(toKoreaDateTimeInput(item.scheduledAt));
  }, [item.listing, item.publicationStatus, item.scheduledAt, item.version]);

  const parsedScheduledAt = fromKoreaDateTimeInput(scheduledAt);
  const hasValidSchedule = parsedScheduledAt === null || Number.isFinite(parsedScheduledAt);
  const hasChanges =
    publicationStatus !== item.publicationStatus ||
    listing !== item.listing ||
    parsedScheduledAt !== item.scheduledAt;
  const requiresReadyContent =
    publicationStatus === "published" || parsedScheduledAt !== null;
  const cannotPublish = requiresReadyContent && !item.contentReady;
  const publicLinkAvailable = canOpenPublicly(item, parentIsAccessible);
  const currentEffectiveStatus = effectiveStatus(item);

  async function reloadAfterMutation(successMessage: string) {
    setNotice({ kind: "success", message: successMessage });
    try {
      await onReload();
    } catch {
      setNotice({
        kind: "error",
        message: "저장되었지만 최신 상태를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
      });
    }
  }

  async function save() {
    if (!hasValidSchedule) {
      setNotice({ kind: "error", message: "예약 발행 시각을 확인해 주세요." });
      return;
    }
    if (parsedScheduledAt !== null && parsedScheduledAt <= Date.now()) {
      setNotice({ kind: "error", message: "예약 발행은 현재보다 이후 시각으로 설정해 주세요." });
      return;
    }
    if (cannotPublish) {
      setNotice({ kind: "error", message: "콘텐츠와 렌더러가 준비된 뒤 발행할 수 있습니다." });
      return;
    }
    if (
      publicationStatus === "archived" &&
      item.publicationStatus !== "archived" &&
      !window.confirm(`${item.title.ko}을(를) 보관 처리할까요? 공개 경로에서 즉시 내려갑니다.`)
    ) {
      return;
    }

    setSaving("save");
    setNotice(null);
    try {
      const { updateContentPublication } = await import(
        "../features/publication/publication.functions"
      );
      const result = await updateContentPublication({
        data: {
          resourceKey: item.resourceKey,
          publicationStatus,
          listing,
          scheduledAt: parsedScheduledAt,
          expectedVersion: item.version,
        },
      });
      if (!result.ok) {
        setNotice({ kind: "error", message: result.message });
        return;
      }
      await reloadAfterMutation("게시 상태를 저장했습니다.");
    } catch {
      setNotice({ kind: "error", message: "게시 상태를 저장하지 못했습니다." });
    } finally {
      setSaving(null);
    }
  }

  async function reset() {
    if (
      !window.confirm(
        `${item.title.ko}의 관리자 설정을 지우고 코드 기본값으로 되돌릴까요?`,
      )
    ) {
      return;
    }

    setSaving("reset");
    setNotice(null);
    try {
      const { resetContentPublication } = await import(
        "../features/publication/publication.functions"
      );
      const result = await resetContentPublication({
        data: {
          resourceKey: item.resourceKey,
          expectedVersion: item.version,
        },
      });
      if (!result.ok) {
        setNotice({ kind: "error", message: result.message });
        return;
      }
      await reloadAfterMutation("코드 기본 게시 상태로 되돌렸습니다.");
    } catch {
      setNotice({ kind: "error", message: "기본 게시 상태로 되돌리지 못했습니다." });
    } finally {
      setSaving(null);
    }
  }

  return (
    <article className={`admin-publication-row is-${item.resourceKind}`}>
      <div className="admin-publication-resource">
        <span className="admin-publication-resource-kind">{label}</span>
        <h3>{item.title.ko}</h3>
        <code>{resourcePath(item)}</code>
        <div className="admin-publication-meta" aria-label={`${item.title.ko} 현재 상태`}>
          <span className={`admin-publication-state ${currentEffectiveStatus.className}`}>
            {currentEffectiveStatus.label}
          </span>
          <span>{listingLabels[item.listing]}</span>
          <span>{developmentStatusLabels[item.developmentStatus]}</span>
          <span className={item.contentReady ? "is-ready" : "is-not-ready"}>
            {item.resourceKind === "chapter"
              ? item.contentReady ? "렌더러 준비됨" : "렌더러 미준비"
              : item.contentReady ? "페이지 준비됨" : "페이지 미준비"}
          </span>
          <span>{item.source === "override" ? `관리자 설정 · v${item.version}` : "코드 기본값"}</span>
        </div>
      </div>

      <div className="admin-publication-controls">
        <label>
          <span>게시 상태</span>
          <select
            aria-label={`${item.title.ko} 게시 상태`}
            value={publicationStatus}
            disabled={saving !== null}
            onChange={(event) => {
              const next = event.target.value as PublicationStatus;
              setPublicationStatus(next);
              if (next !== "draft") setScheduledAt("");
            }}
          >
            <option value="draft">초안</option>
            <option value="published" disabled={!item.contentReady}>발행</option>
            <option
              value="archived"
              disabled={
                item.effectivePublicationStatus !== "published" &&
                item.publicationStatus !== "archived"
              }
            >
              보관
            </option>
          </select>
        </label>
        <label>
          <span>노출 방식</span>
          <select
            aria-label={`${item.title.ko} 노출 방식`}
            value={listing}
            disabled={saving !== null}
            onChange={(event) => setListing(event.target.value as PublicationListing)}
          >
            <option value="listed">목록 공개</option>
            <option value="unlisted">링크 공개</option>
            <option value="hidden">숨김</option>
          </select>
        </label>
        <label className="admin-publication-schedule">
          <span>예약 발행 (KST)</span>
          <input
            aria-label={`${item.title.ko} 예약 발행 시각`}
            type="datetime-local"
            step="60"
            value={scheduledAt}
            disabled={saving !== null || publicationStatus !== "draft" || !item.contentReady}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </label>
      </div>

      <dl className="admin-publication-timestamps">
        <div><dt>예약 시각</dt><dd>{formatTimestamp(item.scheduledAt)}</dd></div>
        <div><dt>발행 시각</dt><dd>{formatTimestamp(item.publishedAt)}</dd></div>
        <div><dt>마지막 변경</dt><dd>{formatTimestamp(item.updatedAt)}</dd></div>
      </dl>

      <div className="admin-publication-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={saving !== null || !hasChanges || !hasValidSchedule || cannotPublish}
          onClick={() => void save()}
        >
          {saving === "save" ? "저장 중…" : "저장"}
        </button>
        {item.source === "override" ? (
          <button
            className="admin-publication-reset"
            type="button"
            disabled={saving !== null}
            onClick={() => void reset()}
          >
            {saving === "reset" ? "되돌리는 중…" : "기본값으로 되돌리기"}
          </button>
        ) : null}
        {item.contentReady ? (
          <a href={previewPath(item)} target="_blank" rel="noreferrer">
            관리자 미리보기 <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="admin-publication-disabled-link">미리보기 준비 안 됨</span>
        )}
        {publicLinkAvailable ? (
          <a href={resourcePath(item)} target="_blank" rel="noreferrer">
            공개 페이지 열기 <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>

      {notice ? (
        <p
          className={`admin-publication-notice is-${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      ) : null}
    </article>
  );
}
