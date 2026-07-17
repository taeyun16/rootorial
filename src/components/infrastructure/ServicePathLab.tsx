import { useEffect, useMemo, useState } from "react";
import {
  cloneServicePathDraft,
  evaluateServicePath,
  servicePathPresets,
  type AffinityFailurePolicy,
  type BalancingAlgorithm,
  type MembershipPolicy,
  type ResolverPolicy,
  type ServicePathDraft,
  type ServicePathFailureReason,
  type ServicePathMode,
} from "../../features/infrastructure/service-discovery";
import { useLocale } from "../../features/localization/localization";
import { ServicePathView } from "./ServicePathView";

type Prediction = "" | "cache-then-authority" | "authority-both" | "cache-both" | "stable-then-remap" | "round-robin" | "failed-retained";
type LocalizedMessage = { ko: string; en: string };
type Completion = { dns: boolean; affinity: boolean };

const initialMessage: LocalizedMessage = {
  ko: "resolver scaffold의 TTL policy와 VIP drain window를 수리한 뒤 두 경계의 결과를 예측하세요.",
  en: "Repair the resolver scaffold's TTL policy and VIP drain window, then predict both boundary results.",
};

function message(ko: string, en: string): LocalizedMessage {
  return { ko, en };
}

function modeCompletionKey(mode: ServicePathMode): keyof Completion {
  return mode === "dns-lifecycle" ? "dns" : "affinity";
}

function scaffoldFor(mode: ServicePathMode): ServicePathDraft {
  return cloneServicePathDraft(servicePathPresets[mode === "dns-lifecycle" ? "dns-scaffold" : "affinity-scaffold"]);
}

export function ServicePathLab({
  onCompletionChange,
}: {
  onCompletionChange: (completion: Completion) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [draft, setDraft] = useState<ServicePathDraft>(() => scaffoldFor("dns-lifecycle"));
  const [prediction, setPrediction] = useState<Prediction>("");
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateServicePath> | null>(null);
  const [completed, setCompleted] = useState<Completion>({ dns: false, affinity: false });
  const [feedback, setFeedback] = useState<LocalizedMessage>(initialMessage);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const preview = useMemo(() => evaluateServicePath(draft), [draft]);

  useEffect(() => setInteractiveReady(true), []);

  function publishCompletion(next: Completion) {
    setCompleted(next);
    onCompletionChange(next);
  }

  function invalidate(nextFeedback: LocalizedMessage, mode = draft.mode) {
    setEvaluation(null);
    setPrediction("");
    publishCompletion({ ...completed, [modeCompletionKey(mode)]: false });
    setFeedback(nextFeedback);
  }

  function applyScaffold(mode: ServicePathMode) {
    setDraft(scaffoldFor(mode));
    invalidate(mode === "dns-lifecycle"
      ? message("DNS scaffold를 불러왔습니다. TTL cache와 기존 VIP drain window를 수리하세요.", "DNS scaffold loaded. Repair the TTL cache and old-VIP drain window.")
      : message("health·affinity scaffold를 불러왔습니다. candidate set과 failure remap을 수리하세요.", "Health and affinity scaffold loaded. Repair the candidate set and failure remap."), mode);
  }

  function setField<K extends keyof ServicePathDraft>(field: K, value: ServicePathDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    invalidate(message("service state가 바뀌었습니다. 결과를 다시 예측하고 실행하세요.", "Service state changed. Predict and run the result again."));
  }

  const reasonLabel = (reason: ServicePathFailureReason): LocalizedMessage => ({
    connected: message("service path 연결", "service path connected"),
    "refreshed-before-expiry": message("fresh cache를 TTL 전에 버림", "fresh cache discarded before TTL"),
    "expired-cache-reused": message("TTL 만료 cache를 계속 사용", "expired cache reused"),
    "old-vip-retired-before-ttl": message("기존 VIP가 cache 만료 전에 종료", "old VIP retired before cache expiry"),
    "vip-unavailable": message("resolved VIP listener 없음", "resolved VIP listener unavailable"),
    "no-healthy-backend": message("healthy backend 없음", "no healthy backend"),
    "unhealthy-backend-selected": message("unhealthy backend가 candidate set에 포함", "unhealthy backend included in the candidate set"),
    "affinity-broken": message("같은 client affinity가 유지되지 않음", "same-client affinity is not stable"),
    "ineligible-affinity-retained": message("unhealthy sticky target을 계속 사용", "unhealthy sticky target retained"),
    "listener-missing": message("선택 backend listener 없음", "selected backend listener missing"),
  }[reason]);

  function runServicePath() {
    if (!prediction) {
      setFeedback(message("먼저 실행 결과를 예측하세요.", "Predict the execution result first."));
      return;
    }
    try {
      const result = evaluateServicePath(draft);
      setEvaluation(result);
      const expectedPrediction = draft.mode === "dns-lifecycle" ? "cache-then-authority" : "stable-then-remap";
      const passed = result.passed && prediction === expectedPrediction;
      const next = { ...completed, [modeCompletionKey(draft.mode)]: passed };
      publishCompletion(next);
      if (passed) {
        setFeedback(draft.mode === "dns-lifecycle"
          ? message("DNS 통과 — t=159에는 fresh cache, t=160에는 새 authority answer를 사용하고 기존 VIP는 TTL 동안 유지됩니다.", "DNS passed — t=159 uses fresh cache, t=160 uses the new authority answer, and the old VIP remains through the TTL window.")
          : message("health·affinity 통과 — 신규 flow는 healthy set만 사용하고 sticky target 실패 뒤 재매핑됩니다.", "Health and affinity passed — new flows use only the healthy set and remap after the sticky target fails."));
      } else if (result.passed) {
        setFeedback(message("state는 통과했습니다. TTL 경계 또는 failure remap 예측을 다시 확인하세요.", "The state passed. Recheck the TTL-boundary or failure-remap prediction."));
      } else {
        const reason = reasonLabel(result.reason);
        setFeedback(message(`실행 결과: ${reason.ko}. live map의 최초 blocked state를 수리하세요.`, `Execution result: ${reason.en}. Repair the first blocked state in the live map.`));
      }
    } catch {
      setEvaluation(null);
      publishCompletion({ ...completed, [modeCompletionKey(draft.mode)]: false });
      setFeedback(message("브라우저 service-path model을 실행하지 못했습니다. 현재 mode를 초기화하세요.", "The browser service-path model failed. Reset the current mode."));
    }
  }

  const evidence = draft.mode === "dns-lifecycle"
    ? `resolver$ cache api.internal → ${draft.cachedAddress} cached_at=${draft.cacheStoredAtSeconds} ttl=${draft.ttlSeconds}\n` +
      `authority$ api.internal A ${draft.authorityAddress}\n` +
      `edge-old$ listener retirement → t=${draft.oldVipRetirementSeconds}\n` +
      `edge-new$ ss -lnt → ${draft.vipListenerUp ? `${draft.authorityAddress}:8080 LISTEN` : "no listener"}`
    : `edge$ membership policy → ${draft.membershipPolicy}\n` +
      `edge$ algorithm → ${draft.algorithm}\n` +
      `health$ app-a=UP app-b=DOWN app-c=UP\n` +
      `affinity$ failed target → ${draft.affinityFailurePolicy}`;

  return (
    <section className="interactive-lab service-path-lab" aria-labelledby="service-path-lab-title" data-interactive-ready={interactiveReady ? "true" : "false"} data-active-mode={draft.mode}>
      <div className="service-lab-header">
        <div><p className="concept-check-kicker">REQUIRED LAB · RESOLVE AND SELECT</p><h3 id="service-path-lab-title">{t("DNS TTL handoff와 health-aware affinity 조립", "Assemble DNS TTL handoff and health-aware affinity")}</h3><p>{t("두 mode에서 live control-plane state를 수리한 뒤 결과를 실행합니다.", "Repair the live control-plane state in both modes, then execute the result.")}</p></div>
        <strong>{Number(completed.dns) + Number(completed.affinity)} / 2</strong>
      </div>
      <div className="service-mode-toolbar" role="group" aria-label={t("service-path mode와 초기화", "Service-path mode and reset")}>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "dns-lifecycle"} onClick={() => applyScaffold("dns-lifecycle")}>DNS TTL MODE {completed.dns ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "health-affinity"} onClick={() => applyScaffold("health-affinity")}>HEALTH + AFFINITY {completed.affinity ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" onClick={() => applyScaffold(draft.mode)}>{t("현재 mode 초기화", "Reset current mode")}</button>
      </div>

      <div className="service-control-grid">
        {draft.mode === "dns-lifecycle" ? <>
          <fieldset><legend>{t("resolver cache policy", "Resolver cache policy")}</legend><label><span>{t("TTL 처리", "TTL handling")}</span><select aria-label={t("resolver TTL policy", "Resolver TTL policy")} value={draft.resolverPolicy} onChange={(event) => setField("resolverPolicy", event.target.value as ResolverPolicy)}><option value="cache-forever">{t("cache를 계속 사용", "reuse cache forever")}</option><option value="refresh-early">{t("authority 변경 즉시 refresh", "refresh immediately")}</option><option value="honor-ttl">{t("만료 전 cache · 만료부터 refresh", "cache before expiry · refresh at expiry")}</option></select></label><p>cached_at=100 · TTL=60 · expiry=160</p></fieldset>
          <fieldset><legend>{t("VIP handoff window", "VIP handoff window")}</legend><label><span>{t("기존 VIP 종료 시각", "Old VIP retirement")}</span><select aria-label={t("기존 VIP 종료 시각", "Old VIP retirement time")} value={draft.oldVipRetirementSeconds} onChange={(event) => setField("oldVipRetirementSeconds", Number(event.target.value))}><option value="150">t=150</option><option value="160">t=160</option><option value="220">t=220</option></select></label><label className="service-check-control"><input type="checkbox" checked={draft.vipListenerUp} onChange={(event) => setField("vipListenerUp", event.target.checked)} />10.40.0.20:8080 LISTEN</label></fieldset>
          <fieldset><legend>{t("고정 관찰 경계", "Fixed observation boundaries")}</legend><p><code>t=159</code> {t("만료 1초 전", "one second before expiry")}</p><p><code>t=160</code> {t("정확한 만료 경계", "exact expiry boundary")}</p><p>{t("두 시각에서 사용할 answer와 VIP availability를 함께 판정합니다.", "The model judges the answer and VIP availability at both times.")}</p></fieldset>
        </> : <>
          <fieldset><legend>{t("backend candidate set", "Backend candidate set")}</legend><label><span>{t("membership policy", "Membership policy")}</span><select aria-label={t("backend membership policy", "Backend membership policy")} value={draft.membershipPolicy} onChange={(event) => setField("membershipPolicy", event.target.value as MembershipPolicy)}><option value="all-registered">{t("registered 전체", "all registered")}</option><option value="healthy-only">{t("healthy · non-draining만", "healthy and non-draining only")}</option></select></label><p>app-a UP · app-b DOWN · app-c UP</p></fieldset>
          <fieldset><legend>{t("connection selection", "Connection selection")}</legend><label><span>{t("L4 algorithm", "Layer 4 algorithm")}</span><select aria-label={t("L4 balancing algorithm", "Layer 4 balancing algorithm")} value={draft.algorithm} onChange={(event) => setField("algorithm", event.target.value as BalancingAlgorithm)}><option value="round-robin">round-robin</option><option value="source-affinity">source affinity</option></select></label><label><span>{t("target 실패 뒤", "After target failure")}</span><select aria-label={t("affinity failure policy", "Affinity failure policy")} value={draft.affinityFailurePolicy} onChange={(event) => setField("affinityFailurePolicy", event.target.value as AffinityFailurePolicy)}><option value="keep-ineligible">{t("기존 target 유지", "keep the old target")}</option><option value="remap-ineligible">{t("healthy set에서 재매핑", "remap against healthy set")}</option></select></label></fieldset>
          <fieldset><legend>{t("entry point", "Entry point")}</legend><label className="service-check-control"><input type="checkbox" checked={draft.vipListenerUp} onChange={(event) => setField("vipListenerUp", event.target.checked)} />10.40.0.20:8080 LISTEN</label><p>{t("동일 client-a로 두 connection을 만든 뒤 첫 target을 DOWN으로 바꾸고 한 번 더 연결합니다.", "The model opens two client-a connections, marks the first target DOWN, then opens one more.")}</p></fieldset>
        </>}
      </div>

      <ServicePathView preview={preview} evaluation={evaluation} />
      <div className="service-command-evidence"><span>{t("현재 control-plane evidence", "Current control-plane evidence")}</span><pre>{evidence}</pre></div>
      <div className="service-run-row">
        <label><span>{t("실행 전 결과 예측", "Predict the result before execution")}</span><select aria-label={t("service path 실행 결과 예측", "Predict service path execution result")} value={prediction} onChange={(event) => { setPrediction(event.target.value as Prediction); setEvaluation(null); }}><option value="">—</option>{draft.mode === "dns-lifecycle" ? <><option value="cache-then-authority">t=159 cache → t=160 authority</option><option value="authority-both">t=159 · 160 authority</option><option value="cache-both">t=159 · 160 cache</option></> : <><option value="stable-then-remap">{t("같은 target 유지 → 실패 뒤 healthy target 재매핑", "same target → remap to a healthy target after failure")}</option><option value="round-robin">{t("매 connection마다 순환", "rotate every connection")}</option><option value="failed-retained">{t("실패한 sticky target 유지", "retain the failed sticky target")}</option></>}</select></label>
        <button type="button" className="button button-primary" onClick={runServicePath}>{t("DNS·connection path 실행", "Run DNS and connection path")}</button>
      </div>
      <div className={`service-feedback${evaluation?.passed && ((draft.mode === "dns-lifecycle" && prediction === "cache-then-authority") || (draft.mode === "health-affinity" && prediction === "stable-then-remap")) ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">{feedback[locale]}</div>
    </section>
  );
}
