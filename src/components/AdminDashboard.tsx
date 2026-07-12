import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { AdminDashboard as Dashboard, FeedbackStatus } from "../features/admin/admin";
import { AuthControls } from "./AuthControls";
import { RootorialMark } from "./RootorialMark";

const statusLabels: Record<FeedbackStatus, string> = {
  pending: "미검토",
  reviewing: "검토 중",
  resolved: "해결",
};
const kindLabels = { incorrect: "내용 오류", confusing: "이해가 어려움", suggestion: "개선 제안" } as const;

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}분 ${remainder}초` : `${minutes}분`;
}

export function AdminDashboard({ initialData }: { initialData: Dashboard }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<FeedbackStatus | "all">("pending");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [presenceUpdatedAt, setPresenceUpdatedAt] = useState(initialData.available ? initialData.generatedAt : 0);

  useEffect(() => {
    if (!initialData.available) return;
    let cancelled = false;
    const refreshPresence = async () => {
      try {
        const { getOnlineLearnerCount } = await import("../features/admin/admin.functions");
        const result = await getOnlineLearnerCount();
        if (!cancelled && result.ok) {
          setPresenceUpdatedAt(result.updatedAt);
          setData((current) => current.available
            ? { ...current, learning: { ...current.learning, onlineLearners: result.count } }
            : current);
        }
      } catch {
        // Keep the last confirmed count when presence refresh is unavailable.
      }
    };
    const interval = window.setInterval(() => void refreshPresence(), 20_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [initialData.available]);

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

        <section className="admin-panel admin-learning-section" aria-labelledby="learning-analytics-title">
          <div className="admin-learning-heading">
            <div>
              <p className="eyebrow">LEARNING ANALYTICS · LAST {data.learning.windowDays} DAYS</p>
              <h2 id="learning-analytics-title">학습 참여와 이해도</h2>
              <p>로그인 학습자의 화면 체류와 실제 활동을 분리하고, 문제별 첫 시도와 최종 이해를 비교합니다.</p>
            </div>
            <span className="admin-learning-privacy">집계 데이터만 표시</span>
          </div>
          <div className="admin-reach" aria-label="학습 도달 범위">
            <article><span>누적 코스 접근자</span><strong>{data.learning.courseVisitors.toLocaleString("ko-KR")}</strong><small>로그인 고유 사용자 · 전체 기간</small></article>
            <article><span>최근 {data.learning.windowDays}일 접근자</span><strong>{data.learning.courseVisitors30d.toLocaleString("ko-KR")}</strong><small>코스 소개 또는 챕터 방문</small></article>
            <article className="admin-presence-live">
              <span><i aria-hidden="true" />현재 온라인</span>
              <strong key={data.learning.onlineLearners}>{data.learning.onlineLearners.toLocaleString("ko-KR")}</strong>
              <small>최근 60초 · {new Date(presenceUpdatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 확인</small>
            </article>
          </div>
          <div className="admin-learning-metrics">
            <article><span>학습 세션</span><strong>{data.learning.sessions.toLocaleString("ko-KR")}</strong><small>{data.learning.learners}명 참여</small></article>
            <article><span>평균 체류시간</span><strong>{formatDuration(data.learning.averageDwellSeconds)}</strong><small>화면이 보인 시간</small></article>
            <article><span>평균 활성 학습</span><strong>{formatDuration(data.learning.averageActiveSeconds)}</strong><small>최근 조작이 있었던 시간</small></article>
            <article><span>활성 비율</span><strong>{data.learning.activeRatio}%</strong><small>활성 시간 ÷ 체류시간</small></article>
            <article><span>첫 시도 정답률</span><strong>{data.learning.firstAttemptAccuracy}%</strong><small>최초 제출 기준</small></article>
            <article><span>최종 이해율</span><strong>{data.learning.eventualMasteryRate}%</strong><small>재시도 후 정답 포함</small></article>
          </div>
          <div className="admin-content-reach">
            <div className="admin-question-header"><h3>URL별 접근</h3><span>페이지 노출과 로그인 고유 학습자를 분리합니다</span></div>
            {data.learning.contentReach.length ? (
              <div className="admin-question-table-wrap">
                <table className="admin-question-table admin-content-reach-table">
                  <thead><tr><th>URL</th><th>전체 노출</th><th>로그인 노출</th><th>고유 학습자</th></tr></thead>
                  <tbody>{data.learning.contentReach.map((item) => (
                    <tr key={item.path}>
                      <th scope="row"><a href={item.path} target="_blank" rel="noreferrer">{item.path}</a></th>
                      <td>{item.views.toLocaleString("ko-KR")}</td>
                      <td>{item.signedInViews.toLocaleString("ko-KR")}</td>
                      <td><strong>{item.learners.toLocaleString("ko-KR")}명</strong></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="admin-empty"><strong>아직 URL 접근 데이터가 없습니다.</strong><span>배포 후 커리큘럼과 챕터 방문이 이곳에 집계됩니다.</span></div>}
          </div>
          <div className="admin-question-analysis">
            <div className="admin-question-header"><h3>문제별 진단</h3><span>표본 수와 함께 해석하세요</span></div>
            {data.learning.questionStats.length ? (
              <div className="admin-question-table-wrap">
                <table className="admin-question-table">
                  <thead><tr><th>문제</th><th>학습자</th><th>시도</th><th>첫 시도 정답률</th><th>전체 정답률</th></tr></thead>
                  <tbody>{data.learning.questionStats.map((question) => (
                    <tr key={question.questionId}>
                      <th scope="row"><strong>{question.label}</strong><code>{question.questionId}</code></th>
                      <td>{question.learners}</td><td>{question.attempts}</td>
                      <td><div className="admin-accuracy"><span><i style={{ width: `${question.firstAttemptAccuracy}%` }} /></span><strong>{question.firstAttemptAccuracy}%</strong></div></td>
                      <td><div className="admin-accuracy is-overall"><span><i style={{ width: `${question.overallAccuracy}%` }} /></span><strong>{question.overallAccuracy}%</strong></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="admin-empty"><strong>아직 학습 데이터가 없습니다.</strong><span>로그인 사용자가 챕터를 학습하면 세션과 문제 풀이가 집계됩니다.</span></div>}
          </div>
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
