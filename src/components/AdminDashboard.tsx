import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { AdminDashboard as Dashboard, FeedbackStatus } from "../features/admin/admin";
import { AuthControls } from "./AuthControls";
import { RootorialMark } from "./RootorialMark";

const statusLabels: Record<FeedbackStatus, string> = {
  pending: "미검토",
  reviewing: "검토 중",
  resolved: "해결",
};
const kindLabels = { incorrect: "내용 오류", confusing: "이해가 어려움", suggestion: "개선 제안" } as const;

export function AdminDashboard({ initialData }: { initialData: Dashboard }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<FeedbackStatus | "all">("pending");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => data.available
    ? data.feedback.filter((item) => filter === "all" || item.status === filter)
    : [], [data, filter]);

  if (!data.available) {
    return (
      <main className="admin-access-state">
        <RootorialMark className="admin-access-mark" />
        <p className="eyebrow">ADMIN CONSOLE</p>
        <h1>{data.reason === "unauthorized" ? "관리자 계정으로 로그인해 주세요" : data.reason === "forbidden" ? "관리자 권한이 필요합니다" : "관리자 콘솔에 연결할 수 없습니다"}</h1>
        <p>{data.message}</p>
        <div className="admin-access-actions"><AuthControls /><Link className="button button-secondary" to="/">홈으로 돌아가기</Link></div>
      </main>
    );
  }

  const maxDay = Math.max(1, ...data.dailyActivity.map((day) => day.questions + day.answers + day.feedback));

  async function saveReview(id: string, status: FeedbackStatus, adminNote: string) {
    setSavingId(id);
    setNotice("");
    try {
      const { getAdminDashboard, updateFeedbackReview } = await import("../features/admin/admin.functions");
      const result = await updateFeedbackReview({ data: { id, status, adminNote } });
      if (!result.ok) { setNotice(result.message); return; }
      setData(await getAdminDashboard());
      setNotice("피드백 처리 상태를 저장했습니다.");
    } catch {
      setNotice("처리 상태를 저장하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="wordmark" to="/"><RootorialMark className="wordmark-mark" /><span className="wordmark-name">Rootorial</span></Link>
        <div><span className="admin-badge">ADMIN</span><AuthControls compact /></div>
      </header>

      <main className="admin-main">
        <section className="admin-title-row">
          <div><p className="eyebrow">OPERATIONS OVERVIEW</p><h1>관리자 콘솔</h1><p>학습 커뮤니티의 활동과 콘텐츠 피드백을 한곳에서 검토합니다.</p></div>
          <time>업데이트 {new Date(data.generatedAt).toLocaleString("ko-KR")}</time>
        </section>

        <section className="admin-metrics" aria-label="주요 지표">
          {[
            ["학습자", data.metrics.learners, "토론 참여 프로필"],
            ["질문", data.metrics.questions, "누적 등록"],
            ["답변", data.metrics.answers, "누적 등록"],
            ["미검토 피드백", data.metrics.feedbackPending, `전체 ${data.metrics.feedbackTotal}건`],
            ["7일 활동", data.metrics.activity7d, "질문 · 답변 · 피드백"],
          ].map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{Number(value).toLocaleString("ko-KR")}</strong><small>{detail}</small></article>)}
        </section>

        <section className="admin-insights">
          <article className="admin-panel admin-activity-panel">
            <div className="admin-panel-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>일별 활동</h2></div><div className="admin-legend"><span>질문</span><span>답변</span><span>피드백</span></div></div>
            <div className="admin-chart">
              {data.dailyActivity.map((day) => {
                const total = day.questions + day.answers + day.feedback;
                return <div className="admin-chart-day" key={day.date} title={`${day.date}: ${total}건`}><div className="admin-chart-bar" style={{ height: `${Math.max(total ? 8 : 2, total / maxDay * 100)}%` }}><i style={{ flex: day.questions }} /><i style={{ flex: day.answers }} /><i style={{ flex: day.feedback }} /></div><span>{day.date.slice(5).replace("-", "/")}</span></div>;
              })}
            </div>
          </article>
          <article className="admin-panel admin-kind-panel">
            <p className="eyebrow">FEEDBACK MIX</p><h2>피드백 유형</h2>
            {(Object.keys(kindLabels) as Array<keyof typeof kindLabels>).map((kind) => {
              const count = data.feedbackByKind[kind];
              const percent = data.metrics.feedbackTotal ? Math.round(count / data.metrics.feedbackTotal * 100) : 0;
              return <div className="admin-kind-row" key={kind}><div><span>{kindLabels[kind]}</span><strong>{count}건</strong></div><div><i style={{ width: `${percent}%` }} /></div><small>{percent}%</small></div>;
            })}
          </article>
        </section>

        <section className="admin-panel admin-feedback-section">
          <div className="admin-feedback-heading"><div><p className="eyebrow">CONTENT FEEDBACK</p><h2>피드백 검토</h2></div><div className="admin-filters" role="group" aria-label="피드백 상태 필터">
            {(["pending", "reviewing", "resolved", "all"] as const).map((value) => <button className={filter === value ? "is-active" : ""} type="button" onClick={() => setFilter(value)} key={value}>{value === "all" ? "전체" : statusLabels[value]}</button>)}
          </div></div>
          {notice && <p className="admin-notice" role="status">{notice}</p>}
          <div className="admin-feedback-list">
            {filtered.length ? filtered.map((item) => <FeedbackReviewCard key={item.id} item={item} saving={savingId === item.id} onSave={saveReview} />) : <div className="admin-empty"><strong>해당 상태의 피드백이 없습니다.</strong><span>새로운 의견이 들어오면 이곳에 표시됩니다.</span></div>}
          </div>
        </section>
      </main>
    </div>
  );
}

function FeedbackReviewCard({ item, saving, onSave }: {
  item: Extract<Dashboard, { available: true }>["feedback"][number];
  saving: boolean;
  onSave: (id: string, status: FeedbackStatus, note: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.adminNote ?? "");
  return <article className="admin-feedback-card">
    <div className="admin-feedback-meta"><span className={`feedback-kind feedback-kind-${item.kind}`}>{kindLabels[item.kind]}</span><span className={`feedback-status feedback-status-${item.status}`}>{statusLabels[item.status]}</span><time>{new Date(item.createdAt).toLocaleString("ko-KR")}</time></div>
    <h3>{item.pageTitle}</h3><a href={item.pagePath} target="_blank" rel="noreferrer">{item.pagePath} ↗</a>
    <blockquote>{item.message}</blockquote>
    <details><summary>제출자 정보</summary><code>{item.authorUserId}</code></details>
    <div className="admin-review-controls"><label>처리 상태<select value={status} onChange={(event) => setStatus(event.target.value as FeedbackStatus)}><option value="pending">미검토</option><option value="reviewing">검토 중</option><option value="resolved">해결</option></select></label><label className="admin-note-field">관리자 메모<textarea value={note} maxLength={1000} rows={2} placeholder="조치 내용이나 확인할 사항을 기록하세요." onChange={(event) => setNote(event.target.value)} /></label><button className="button button-primary" type="button" disabled={saving} onClick={() => onSave(item.id, status, note)}>{saving ? "저장 중…" : "저장"}</button></div>
  </article>;
}
