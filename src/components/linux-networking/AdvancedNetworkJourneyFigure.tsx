import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import type { AdvancedChapterConfig } from "../../features/linux-networking/advanced-networking";
import { useLocale } from "../../features/localization/localization";
import { ExecutableFigure } from "../interactive/ExecutableFigure";
import "./advanced-networking.css";

export function AdvancedNetworkJourneyFigure({ config, onMasteryChange }: { config: AdvancedChapterConfig; onMasteryChange?: (mastered: boolean) => void }) {
  const { locale } = useLocale();
  const phases = config.figure.phases;
  const [phaseId, setPhaseId] = useState(phases[0].id);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([phases[0].id]));
  const phase = phases.find((candidate) => candidate.id === phaseId) ?? phases[0];
  const mastered = phases.every((candidate) => visited.has(candidate.id));
  const markerId = `journey-arrow-${useId().replace(/:/g, "")}`;
  const nodeById = new Map(config.figure.nodes.map((node) => [node.id, node]));

  useEffect(() => onMasteryChange?.(mastered), [mastered, onMasteryChange]);

  function choose(next: string) {
    setPhaseId(next);
    setVisited((current) => new Set([...current, next]));
  }

  function reset() {
    setPhaseId(phases[0].id);
    setVisited(new Set([phases[0].id]));
  }

  return (
    <ExecutableFigure
      className={`advanced-network-figure advanced-network-figure-${config.slug}`}
      testId={`${config.slug}-figure`}
      kicker={config.figure.kicker}
      title={config.figure.title[locale]}
      description={config.figure.description[locale]}
      figureAttributes={{ "data-phase": phase.id, "data-mastered": mastered, "data-chapter": config.slug }}
      footer={<span>{mastered ? locale === "ko" ? "모든 증거 상태를 실행했습니다." : "Every evidence state has been executed." : `${visited.size} / ${phases.length} ${locale === "ko" ? "상태 실행" : "states executed"}`}</span>}
    >
      <div className="advanced-command-rail" role="toolbar" aria-label={locale === "ko" ? "실행할 네트워크 관찰 단계" : "Network observation steps to execute"}>
        {phases.map((candidate, index) => <button key={candidate.id} type="button" className={candidate.id === phase.id ? "is-active" : visited.has(candidate.id) ? "is-visited" : undefined} aria-current={candidate.id === phase.id ? "step" : undefined} onClick={() => choose(candidate.id)}><span>{String(index + 1).padStart(2, "0")}</span>{candidate.label[locale]}</button>)}
        <button className="advanced-reset" type="button" onClick={reset} aria-label={locale === "ko" ? "실습 초기화" : "Reset lab"}><ArrowCounterClockwiseIcon /></button>
      </div>

      <div className="advanced-network-canvas">
        <svg viewBox="0 0 960 310" role="img" aria-label={`${config.figure.title[locale]} · ${phase.decision[locale]}`}>
          <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
          {config.figure.edges.map((candidate) => {
            const from = nodeById.get(candidate.from)!;
            const to = nodeById.get(candidate.to)!;
            const active = phase.activeEdges.includes(candidate.id);
            return <g key={candidate.id} className={`journey-edge${active ? " is-active" : ""}`} data-edge-id={candidate.id}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd={`url(#${markerId})`} />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 12} textAnchor="middle">{candidate.label[locale]}</text>
              {active ? <circle className="journey-packet" cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="8" /> : null}
            </g>;
          })}
          {config.figure.nodes.map((candidate) => {
            const active = phase.activeNodes.includes(candidate.id);
            return <g key={candidate.id} transform={`translate(${candidate.x - 72} ${candidate.y - 42})`} className={`journey-node journey-node-${candidate.kind}${active ? " is-active" : ""}`} data-node-id={candidate.id}>
              <rect width="144" height="84" rx="18" />
              <circle cx="18" cy="18" r="5" />
              <text className="journey-node-label" x="72" y="37" textAnchor="middle">{candidate.label[locale]}</text>
              <text className="journey-node-detail" x="72" y="59" textAnchor="middle">{candidate.detail}</text>
            </g>;
          })}
        </svg>
      </div>

      <div className="advanced-decision" aria-live="polite"><span>{phase.label[locale]}</span><strong>{phase.decision[locale]}</strong></div>
      <div className="advanced-facts">{phase.facts.map((item) => <div key={`${item.label.en}-${item.value}`}><small>{item.label[locale]}</small><strong>{item.value}</strong></div>)}</div>
      <div className="advanced-terminal"><div><span>$</span><code>{phase.command}</code></div>{phase.output.map((line) => <pre key={line}>{line}</pre>)}</div>
    </ExecutableFigure>
  );
}
