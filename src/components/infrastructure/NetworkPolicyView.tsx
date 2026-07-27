import { useId, type ReactNode } from "react";
import {
  buildNetworkPolicyVisualState,
  type NetworkPolicyGradeState,
} from "../../features/infrastructure/network-policy-visual";
import type {
  NetworkPolicyEvaluation,
  NetworkPolicyFailureReason,
  NetworkPolicyPacketId,
  NetworkPolicyRuleId,
} from "../../features/infrastructure/network-policy";
import { useLocale } from "../../features/localization/localization";

export function NetworkPolicyView({
  preview,
  evaluation,
  gradeState,
  controls,
}: {
  preview: NetworkPolicyEvaluation;
  evaluation: NetworkPolicyEvaluation | null;
  gradeState: NetworkPolicyGradeState;
  controls?: {
    boundary?: ReactNode;
    chain?: ReactNode;
  };
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const titleId = useId();
  const descriptionId = useId();
  const visual = buildNetworkPolicyVisualState(evaluation ?? preview, evaluation ? gradeState : "not-run");

  const reasonLabel = (reason: NetworkPolicyFailureReason | "not-run") => ({
    "not-run": t("실행 전 — probe verdict 숨김", "Not run — probe verdicts are hidden"),
    "least-allow": t("최소 허용 policy 통과", "Least-allow policy passed"),
    "wrong-hook": t("packet path와 base-chain hook 불일치", "Base-chain hook does not match the packet path"),
    "default-accept": t("base chain이 fail-open policy accept", "The base chain fails open with policy accept"),
    "deny-before-allow": t("terminal deny가 필요한 allow보다 먼저 실행", "A terminal deny runs before the required allow"),
    "missing-established-rule": t("established reply rule 누락", "The established-reply rule is missing"),
    "overbroad-allow": t("필요한 source 또는 port보다 넓은 allow", "The allow is broader than the required source or port"),
    "required-flow-dropped": t("필수 NEW flow가 drop", "The required NEW flow is dropped"),
    "established-reply-dropped": t("ESTABLISHED reply가 drop", "The ESTABLISHED reply is dropped"),
    "unexpected-flow-allowed": t("허용하지 않은 probe가 accept", "An unintended probe is accepted"),
  }[reason]);

  const ruleLabel = (ruleId: NetworkPolicyRuleId) => ({
    "allow-established-related": "ct state established accept",
    "allow-required-new": visual.mode === "forward"
      ? t("client → app:8080 NEW accept", "client → app:8080 NEW accept")
      : t("admin → router:22 NEW accept", "admin → router:22 NEW accept"),
    "deny-unmatched": "counter drop",
  }[ruleId]);

  const probeLabel = (id: NetworkPolicyPacketId) => ({
    "client-new-app-8080": "client → app:8080 · NEW",
    "app-established-reply": "app → client · ESTABLISHED",
    "client-new-app-22": "client → app:22 · NEW",
    "untrusted-new-app-8080": "untrusted → app:8080 · NEW",
    "untracked-transit": "untrusted → app:9999 · UNTRACKED",
    "admin-new-router-22": "admin → router:22 · NEW",
    "router-established-reply": "DNS → router · ESTABLISHED",
    "client-new-router-22": "client → router:22 · NEW",
    "admin-new-router-8080": "admin → router:8080 · NEW",
    "untracked-router-input": "untrusted → router:9999 · UNTRACKED",
  }[id]);

  const verdictLabel = (verdict: "not-run" | "accept" | "drop" | "unseen") => ({
    "not-run": t("실행 전", "not run"),
    accept: "ACCEPT",
    drop: "DROP",
    unseen: t("chain 미도달", "chain unseen"),
  }[verdict]);

  return (
    <section
      className="network-policy-visualization"
      data-testid="network-policy-visualization"
      data-policy-mode={visual.mode}
      data-policy-state={visual.policyState}
      data-grade-state={visual.gradeState}
      data-chain-hook={visual.hook}
      data-default-policy={visual.defaultPolicy}
    >
      <div className="network-policy-visual-header">
        <div>
          <span>{visual.mode === "forward" ? "TRANSIT / FORWARD" : "ROUTER-LOCAL / INPUT"}</span>
          <strong>{t("packet 경계와 ordered chain", "Packet boundary and ordered chain")}</strong>
        </div>
        <span className={`network-policy-visual-verdict is-${visual.gradeState}`}>{reasonLabel(visual.displayedReason)}</span>
      </div>

      <div
        className="network-policy-map"
        role="group"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <span className="sr-only" id={titleId}>{t("FORWARD와 INPUT firewall policy 지도", "FORWARD and INPUT firewall policy map")}</span>
        <span className="sr-only" id={descriptionId}>{visual.mode === "forward"
          ? t("client packet이 router의 FORWARD chain을 거쳐 app service로 이동합니다.", "A client packet crosses the router FORWARD chain toward the app service.")
          : t("admin packet이 router의 INPUT chain을 거쳐 router-local SSH listener로 이동합니다.", "An admin packet crosses the router INPUT chain toward the router-local SSH listener.")}</span>
        <article className="network-policy-boundary" data-boundary-id="source">
          <span>{visual.mode === "forward" ? "client netns" : "admin network"}</span>
          <strong>{visual.mode === "forward" ? "10.20.0.2" : "198.51.100.25"}</strong>
          <small>{visual.mode === "forward" ? "tcp/41000 → 8080" : "tcp/42000 → 22"}</small>
        </article>
        <svg className="network-policy-connector" viewBox="0 0 100 24" aria-hidden="true" focusable="false">
          <path d="M2 12H91" />
          <path d="m83 5 9 7-9 7" />
        </svg>
        <article className="network-policy-boundary is-firewall" data-boundary-id="firewall">
          <span>router netns · inet filter</span>
          <strong>{visual.hook.toUpperCase()} hook</strong>
          <small>policy {visual.defaultPolicy}</small>
          {controls?.boundary}
        </article>
        <svg className="network-policy-connector" viewBox="0 0 100 24" aria-hidden="true" focusable="false">
          <path d="M2 12H91" />
          <path d="m83 5 9 7-9 7" />
        </svg>
        <article className="network-policy-boundary" data-boundary-id="target">
          <span>{visual.mode === "forward" ? "app netns" : "router local"}</span>
          <strong>{visual.mode === "forward" ? "10.30.0.2:8080" : "198.51.100.10:22"}</strong>
          <small>{visual.mode === "forward" ? "service LISTEN" : "sshd LISTEN"}</small>
        </article>
      </div>

      <div className="network-policy-trace-grid">
        <div className="network-policy-chain">
          <div><span>{t("ordered terminal rules", "Ordered terminal rules")}</span><strong>hook {visual.hook} · policy {visual.defaultPolicy}</strong></div>
          {controls?.chain}
          <ol>
            {visual.rules.map((rule) => (
              <li key={rule.id} data-rule-id={rule.id} data-rule-position={rule.position}>
                <span>{String(rule.position).padStart(2, "0")}</span>
                <code>{ruleLabel(rule.id)}</code>
                <b>{rule.verdict.toUpperCase()}</b>
              </li>
            ))}
          </ol>
        </div>
        <div className="network-policy-probes">
          <div><span>{t("packet probe suite", "Packet probe suite")}</span><strong>{t("요구사항과 실행 verdict", "Requirement and executed verdict")}</strong></div>
          <ul>
            {visual.probes.map((probe) => (
              <li
                key={probe.id}
                data-probe-id={probe.id}
                data-probe-verdict={probe.verdict}
                data-probe-expected={probe.expectedVerdict}
              >
                <span>{probeLabel(probe.id)}</span>
                <small>{t("요구", "require")} {probe.expectedVerdict.toUpperCase()}</small>
                <b>{verdictLabel(probe.verdict)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
