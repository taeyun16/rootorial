import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import type { AdvancedChapterConfig } from "../../features/linux-networking/advanced-networking";
import { ChapterContractVisualization } from "../../features/chapters/visualization-registry";
import { canExecuteSequentialPhase, hasMasteredSequentialEvidence } from "../../features/chapters/sequential-execution";
import { useLocale } from "../../features/localization/localization";
import { ExecutableFigure } from "../interactive/ExecutableFigure";
import { DirectChoiceGroup } from "../interactive/DirectChoiceGroup";
import "./advanced-networking.css";

export function AdvancedNetworkJourneyFigure({ config, onMasteryChange }: { config: AdvancedChapterConfig; onMasteryChange?: (mastered: boolean) => void }) {
  const { locale } = useLocale();
  const phases = config.figure.phases;
  const [phaseId, setPhaseId] = useState(phases[0].id);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([phases[0].id]));
  const [prediction, setPrediction] = useState("");
  const phase = phases.find((candidate) => candidate.id === phaseId) ?? phases[0];
  const predictionCopy = {
    "routes-and-packet-paths": {
      question: { ko: "목적지에 맞는 경로를 가장 먼저 결정하는 것은?", en: "What decides the path for a destination first?" },
      correct: "route",
      options: [
        { value: "route", ko: "프리픽스가 가장 구체적인 route", en: "The route with the most specific prefix" },
        { value: "neighbor", ko: "이웃 표의 첫 번째 MAC", en: "The first MAC in the neighbor table" },
        { value: "port", ko: "목적지 TCP port", en: "The destination TCP port" },
      ],
    },
    "sockets-ports-and-tcp": {
      question: { ko: "application이 byte를 읽었다는 마지막 증거는?", en: "What is the final proof that the application read the bytes?" },
      correct: "recv",
      options: [
        { value: "recv", ko: "accepted socket의 recv 반환", en: "recv returns on the accepted socket" },
        { value: "ack", ko: "peer의 TCP ACK", en: "A TCP ACK from the peer" },
        { value: "listen", ko: "LISTEN socket 존재", en: "A listening socket exists" },
      ],
    },
    "dns-and-service-reachability": {
      question: { ko: "서비스 도달 검증에서 DNS 응답 다음 경계는?", en: "Which boundary follows a DNS answer in service verification?" },
      correct: "connect",
      options: [
        { value: "connect", ko: "선택된 주소로 route와 TCP connect", en: "Route and TCP connect to the selected address" },
        { value: "healthy", ko: "즉시 application 정상 판정", en: "Immediately declare the application healthy" },
        { value: "arp-name", ko: "hostname 자체의 MAC 조회", en: "Resolve a MAC for the hostname itself" },
      ],
    },
    "diagnose-a-linux-network": {
      question: { ko: "진단 명령을 실행하기 전에 먼저 고정할 것은?", en: "What should be fixed before running diagnostic commands?" },
      correct: "scope",
      options: [
        { value: "scope", ko: "증상 범위와 관측 위치", en: "Symptom scope and observation point" },
        { value: "restart", ko: "전체 네트워크 재시작", en: "Restart the whole network" },
        { value: "last-log", ko: "마지막 로그 한 줄", en: "The final log line" },
      ],
    },
  } as const;
  const predictionSpec = predictionCopy[config.slug];
  const predictionCorrect = prediction === predictionSpec.correct;
  const mastered = hasMasteredSequentialEvidence({
    predictionCorrect,
    visitedCount: visited.size,
    phaseCount: phases.length,
  });
  const markerId = `journey-arrow-${useId().replace(/:/g, "")}`;
  const nodeById = new Map(config.figure.nodes.map((node) => [node.id, node]));

  useEffect(() => onMasteryChange?.(mastered), [mastered, onMasteryChange]);

  function choose(next: string) {
    const nextIndex = phases.findIndex((candidate) => candidate.id === next);
    if (!canExecuteSequentialPhase({ phaseIndex: nextIndex, visitedCount: visited.size, predictionCorrect })) return;
    setPhaseId(next);
    setVisited((current) => new Set([...current, next]));
  }

  function reset() {
    setPhaseId(phases[0].id);
    setVisited(new Set([phases[0].id]));
    setPrediction("");
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
      <div className="network-figure-prediction">
        <DirectChoiceGroup
          label={predictionSpec.question[locale]}
          value={prediction}
          options={predictionSpec.options.map((option) => ({
            value: option.value,
            label: option[locale],
          }))}
          onChange={setPrediction}
          controlId={`${config.slug}-prediction`}
        />
        <p role="status">
          {prediction === ""
            ? locale === "ko" ? "예측을 선택하면 첫 실행 단계가 열립니다." : "Choose a prediction to unlock the first execution step."
            : predictionCorrect
              ? locale === "ko" ? "예측이 맞았습니다. 증거를 순서대로 실행하세요." : "Prediction confirmed. Execute the evidence in order."
              : locale === "ko" ? "아직 경계가 맞지 않습니다. 첫 판단 지점을 다시 고르세요." : "That boundary does not come first. Choose the first decision point again."}
        </p>
      </div>
      <div className="advanced-command-rail" role="toolbar" aria-label={locale === "ko" ? "실행할 네트워크 관찰 단계" : "Network observation steps to execute"}>
        {phases.map((candidate, index) => <button key={candidate.id} type="button" className={candidate.id === phase.id ? "is-active" : visited.has(candidate.id) ? "is-visited" : undefined} aria-current={candidate.id === phase.id ? "step" : undefined} disabled={!canExecuteSequentialPhase({ phaseIndex: index, visitedCount: visited.size, predictionCorrect })} onClick={() => choose(candidate.id)}><span>{String(index + 1).padStart(2, "0")}</span>{candidate.label[locale]}</button>)}
        <button className="advanced-reset" type="button" onClick={reset} aria-label={locale === "ko" ? "실습 초기화" : "Reset lab"}><ArrowCounterClockwiseIcon /></button>
      </div>

      {predictionCorrect ? <>
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

      <ChapterContractVisualization
        chapterId={`linux-networking/${config.slug}`}
        config={config}
        locale={locale}
        phaseId={phase.id}
        visited={visited}
      />

      <div className="advanced-decision" aria-live="polite"><span>{phase.label[locale]}</span><strong>{phase.decision[locale]}</strong></div>
      <div className="advanced-facts">{phase.facts.map((item) => <div key={`${item.label.en}-${item.value}`}><small>{item.label[locale]}</small><strong>{item.value}</strong></div>)}</div>
      <div className="advanced-terminal"><div><span>$</span><code>{phase.command}</code></div>{phase.output.map((line) => <pre key={line}>{line}</pre>)}</div>
      </> : <div className="network-evidence-locked" role="status">{locale === "ko" ? "예측을 확정하기 전에는 경로·판정·명령 출력을 숨깁니다." : "Path, verdict, and command output stay hidden until the prediction is confirmed."}</div>}
    </ExecutableFigure>
  );
}
