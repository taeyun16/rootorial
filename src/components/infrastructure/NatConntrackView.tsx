import { useId, type ReactNode } from "react";
import { buildNatVisualState } from "../../features/infrastructure/egress-nat-visual";
import type {
  NatFlowDraft,
  NatFlowEvaluation,
  NatFlowStage,
} from "../../features/infrastructure/egress-nat";
import { useLocale } from "../../features/localization/localization";

export function NatConntrackView({
  draft,
  evaluation,
  nodeControls,
}: {
  draft: NatFlowDraft;
  evaluation: NatFlowEvaluation | null;
  nodeControls?: {
    client?: ReactNode;
    router?: ReactNode;
    external?: ReactNode;
  };
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const topologyTitleId = useId();
  const topologyDescriptionId = useId();
  const visual = buildNatVisualState(draft, evaluation);
  const forward = visual.stages.filter(({ direction }) => direction === "forward");
  const reply = visual.stages.filter(({ direction }) => direction === "return");
  const statusLabel = evaluation
    ? evaluation.passed
      ? t("왕복 translation 연결", "Round-trip translation connected")
      : t("최초 실패 경계 표시", "First failed boundary shown")
    : t("실행 전 — 결과 숨김", "Before execution — result hidden");

  return (
    <section
      className="nat-flow-visualization"
      data-testid="nat-conntrack-visualization"
      data-nat-mode={visual.mode}
      data-grade-state={visual.gradeState}
      data-topology-state={visual.topologyState}
      data-translation-state={visual.translationState}
      data-return-state={visual.returnState}
      aria-labelledby="nat-flow-visual-title"
    >
      <header className="nat-visual-header">
        <div>
          <span>LIVE PACKET STATE</span>
          <h4 id="nat-flow-visual-title">{t(
            "private tuple → source translation → conntrack reply",
            "Private tuple → source translation → conntrack reply",
          )}</h4>
        </div>
        <strong>{statusLabel}</strong>
      </header>

      <div
        className="nat-topology-map"
        role="group"
        aria-labelledby={topologyTitleId}
        aria-describedby={topologyDescriptionId}
      >
        <span className="sr-only" id={topologyTitleId}>{t(
          "private client와 NAT router, external service topology 지도",
          "Private client, NAT router, and external service topology map",
        )}</span>
        <span className="sr-only" id={topologyDescriptionId}>{t(
          `${draft.mode === "snat" ? "SNAT" : "MASQUERADE"}를 거쳐 private client request와 external service reply가 같은 router conntrack state로 왕복하는 지도`,
          `Map of a private-client request and external-service reply traversing ${draft.mode === "snat" ? "SNAT" : "masquerade"} through the same router conntrack state`,
        )}</span>
        <NatNode
          id="private-client"
          eyebrow="PRIVATE NETNS"
          title="client"
          address={visual.nodes[0].address}
          state={visual.nodes[0].state}
          rows={[
            "eth0 · veth · 10.20.0.2/24",
            t("default route → 10.20.0.1", "default route → 10.20.0.1"),
            "socket · 10.20.0.2:41000",
          ]}
          controls={nodeControls?.client}
        />
        <NatConnector label={t("원본 source", "original source")} />
        <NatNode
          id="nat-router"
          eyebrow="ROUTER NETNS"
          title={draft.mode === "snat" ? "SNAT gateway" : "MASQUERADE gateway"}
          address={visual.nodes[1].address}
          state={visual.nodes[1].state}
          rows={[
            `ip_forward=${draft.forwarding ? "1" : "0"}`,
            `${draft.natHook} · ${visual.translationState}`,
            visual.conntrack
              ? `conntrack · ${visual.conntrack.state}`
              : t("conntrack · 실행 전 비공개", "conntrack · hidden before run"),
          ]}
          controls={nodeControls?.router}
        />
        <NatConnector label={t("번역된 source", "translated source")} />
        <NatNode
          id="external-service"
          eyebrow="UPSTREAM"
          title="external service"
          address={visual.nodes[2].address}
          state={visual.nodes[2].state}
          rows={[
            `listener · ${draft.externalListener ? "LISTEN" : "CLOSED"}`,
            t("reply destination = 보이는 source", "reply destination = visible source"),
            draft.returnRouter === "same-router"
              ? t("return → 같은 NAT router", "return → same NAT router")
              : t("return → 다른 router", "return → different router"),
          ]}
          controls={nodeControls?.external}
        />
      </div>

      <div className="nat-tuple-ledger" aria-label={t("packet tuple 변환 ledger", "Packet tuple translation ledger")}>
        <div><span>ORIGINAL</span><code>{visual.tupleLedger.original}</code></div>
        <div><span>TRANSLATED</span><code>{visual.tupleLedger.translated}</code></div>
        <div><span>REPLY</span><code>{visual.tupleLedger.reply}</code></div>
        <div><span>RESTORED</span><code>{visual.tupleLedger.restored}</code></div>
      </div>

      <div className="nat-path-grid">
        <NatPath title={t("FORWARD · private request", "FORWARD · private request")} stages={forward} t={t} />
        <NatPath title={t("RETURN · external reply", "RETURN · external reply")} stages={reply} t={t} />
      </div>
    </section>
  );
}

function NatNode({
  id,
  eyebrow,
  title,
  address,
  state,
  rows,
  controls,
}: {
  id: string;
  eyebrow: string;
  title: string;
  address: string;
  state: "ready" | "attention";
  rows: string[];
  controls?: ReactNode;
}) {
  return (
    <article className="nat-node" data-node-id={id} data-node-state={state}>
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <code>{address}</code>
      <ul>{rows.map((row) => <li key={row}>{row}</li>)}</ul>
      {controls ? <div className="nat-node-controls">{controls}</div> : null}
    </article>
  );
}

function NatConnector({ label }: { label: string }) {
  return (
    <div className="nat-connector" aria-hidden="true">
      <svg viewBox="0 0 120 28" focusable="false">
        <path d="M4 9h100" />
        <path d="m98 4 10 5-10 5" />
        <path d="M108 20H8" />
        <path d="m14 15-10 5 10 5" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

const stageLabels: Record<NatFlowStage["id"], { ko: string; en: string }> = {
  "client-route": { ko: "client private route", en: "client private route" },
  "client-veth": { ko: "client veth pair", en: "client veth pair" },
  "router-forwarding": { ko: "router IP forwarding", en: "router IP forwarding" },
  "source-translation": { ko: "postrouting source translation", en: "postrouting source translation" },
  "external-listener": { ko: "external 198.51.100.20:443", en: "external 198.51.100.20:443" },
  "reply-to-translated-source": { ko: "reply가 translated source로 route", en: "reply routes to translated source" },
  "conntrack-lookup": { ko: "같은 router conntrack lookup", en: "same-router conntrack lookup" },
  "reverse-translation": { ko: "reverse source translation", en: "reverse source translation" },
  "private-return-route": { ko: "private subnet return route", en: "private-subnet return route" },
  "client-receives-reply": { ko: "client socket이 reply 수신", en: "client socket receives reply" },
};

function NatPath({
  title,
  stages,
  t,
}: {
  title: string;
  stages: NatFlowStage[];
  t: (ko: string, en: string) => string;
}) {
  return (
    <section>
      <h5>{title}</h5>
      <ol>
        {stages.map((stage, index) => (
          <li key={stage.id} data-flow-stage={stage.id} data-stage-status={stage.status}>
            <span>{String(index + 1).padStart(2, "0")} {t(stageLabels[stage.id].ko, stageLabels[stage.id].en)}</span>
            <strong>{stage.status === "passed" ? t("통과", "passed") : stage.status === "blocked" ? t("차단", "blocked") : t("미실행", "not run")}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
