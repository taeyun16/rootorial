import { useEffect, useMemo, useState } from "react";
import {
  cloneServicePathDraft,
  evaluateServicePath,
  servicePathPresets,
  type ServicePathDraft,
  type ServicePathFailureReason,
  type ServicePathMode,
} from "../../features/infrastructure/service-discovery";
import { useLocale } from "../../features/localization/localization";
import {
  InfrastructureChoiceRail,
  InfrastructureWorkspace,
} from "./InfrastructureInteractionPrimitives";
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

  useEffect(() => {
    onCompletionChange(completed);
  }, [completed, onCompletionChange]);

  function setModeCompletion(mode: ServicePathMode, complete: boolean) {
    const key = modeCompletionKey(mode);
    setCompleted((current) => current[key] === complete
      ? current
      : { ...current, [key]: complete });
  }

  function invalidate(nextFeedback: LocalizedMessage, mode = draft.mode) {
    setEvaluation(null);
    setPrediction("");
    setModeCompletion(mode, false);
    setFeedback(nextFeedback);
  }

  function changePrediction(value: Exclude<Prediction, "">) {
    setPrediction(value);
    setEvaluation(null);
    setModeCompletion(draft.mode, false);
    setFeedback(message(
      "예측이 바뀌었습니다. 현재 service path를 다시 실행하세요.",
      "Prediction changed. Re-run the current service path.",
    ));
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
      setModeCompletion(draft.mode, passed);
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
      setModeCompletion(draft.mode, false);
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

      <InfrastructureWorkspace
        label={t("service path 직접 조작 workspace", "Direct service-path workspace")}
        stage={(
          <ServicePathView
            preview={preview}
            evaluation={evaluation}
            draft={draft}
            onResolverPolicyChange={(value) => setField("resolverPolicy", value)}
            onOldVipRetirementChange={(value) => setField("oldVipRetirementSeconds", value)}
            onVipListenerChange={(value) => setField("vipListenerUp", value)}
            onMembershipPolicyChange={(value) => setField("membershipPolicy", value)}
            onAlgorithmChange={(value) => setField("algorithm", value)}
            onAffinityFailurePolicyChange={(value) => setField("affinityFailurePolicy", value)}
          />
        )}
        inspector={(
          <div className="service-command-evidence">
            <span>{t("현재 control-plane evidence", "Current control-plane evidence")}</span>
            <p>{draft.mode === "dns-lifecycle"
              ? t("timeline과 VIP 상태를 직접 바꾸면 이 증거가 즉시 갱신됩니다.", "The evidence updates as you directly change the timeline and VIP state.")
              : t("backend pool과 affinity 동작을 직접 바꾸면 이 증거가 즉시 갱신됩니다.", "The evidence updates as you directly change the backend pool and affinity behavior.")}</p>
            <pre>{evidence}</pre>
          </div>
        )}
      />
      <div className="service-run-row">
        <InfrastructureChoiceRail<Exclude<Prediction, "">>
          controlId="service-path-prediction"
          label={t("실행 전 결과 예측", "Predict the result before execution")}
          value={prediction}
          options={draft.mode === "dns-lifecycle" ? [
            { value: "cache-then-authority", label: "t=159 cache → t=160 authority" },
            { value: "authority-both", label: "t=159 · 160 authority" },
            { value: "cache-both", label: "t=159 · 160 cache" },
          ] : [
            { value: "stable-then-remap", label: t("같은 target → healthy target 재매핑", "same target → remap to a healthy target") },
            { value: "round-robin", label: t("매 connection마다 순환", "rotate every connection") },
            { value: "failed-retained", label: t("실패한 sticky target 유지", "retain the failed sticky target") },
          ]}
          onChange={changePrediction}
        />
        <button type="button" className="button button-primary" onClick={runServicePath}>{t("DNS·connection path 실행", "Run DNS and connection path")}</button>
      </div>
      <div className={`service-feedback${evaluation?.passed && ((draft.mode === "dns-lifecycle" && prediction === "cache-then-authority") || (draft.mode === "health-affinity" && prediction === "stable-then-remap")) ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">{feedback[locale]}</div>
    </section>
  );
}
