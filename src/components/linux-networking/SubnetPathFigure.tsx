import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import { canExecuteSequentialPhase, hasMasteredSequentialEvidence } from "../../features/chapters/sequential-execution";
import {
  SUBNET_GATEWAY_ADDRESS,
  SUBNET_PEER_ADDRESS,
  SUBNET_REMOTE_ADDRESS,
  subnetPhaseIds,
  subnetPhaseSnapshot,
  type SubnetPhaseId,
} from "../../features/linux-networking/subnets-neighbors-and-gateways";
import { ExecutableFigure } from "../interactive/ExecutableFigure";
import { DirectChoiceGroup } from "../interactive/DirectChoiceGroup";
import "./subnets-neighbors-gateways.css";

const labels = {
  ko: ["/24 경계 읽기", "같은 링크: ARP", "이웃에게 전송", "원격: 게이트웨이", "원격 프레임 전송", "기본 경로 제거"],
  en: ["Read the /24", "Same link: ARP", "Send to peer", "Remote: gateway", "Send remote frame", "Remove default route"],
} as const;

export function SubnetPathFigure({ onMasteryChange }: { onMasteryChange?: (mastered: boolean) => void }) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [phase, setPhase] = useState<SubnetPhaseId>("inspect-prefix");
  const [visited, setVisited] = useState<Set<SubnetPhaseId>>(() => new Set(["inspect-prefix"]));
  const [prediction, setPrediction] = useState("");
  const snapshot = subnetPhaseSnapshot(phase);
  const decision = snapshot.decision;
  const currentIndex = subnetPhaseIds.indexOf(phase);
  const predictionCorrect = prediction === "gateway";
  const mastered = hasMasteredSequentialEvidence({ predictionCorrect, visitedCount: visited.size, phaseCount: subnetPhaseIds.length });

  useEffect(() => onMasteryChange?.(mastered), [mastered, onMasteryChange]);

  function choose(next: SubnetPhaseId) {
    const nextIndex = subnetPhaseIds.indexOf(next);
    if (!canExecuteSequentialPhase({ phaseIndex: nextIndex, visitedCount: visited.size, predictionCorrect })) return;
    setPhase(next);
    setVisited((current) => new Set([...current, next]));
  }

  function reset() {
    setPhase("inspect-prefix");
    setVisited(new Set(["inspect-prefix"]));
    setPrediction("");
  }

  return (
    <ExecutableFigure
      className="subnet-path-figure"
      testId="subnet-path-figure"
      kicker="EXECUTABLE FIGURE · ONE PACKET, TWO DESTINATIONS"
      title={t("목적지를 바꾸고 다음 홉과 프레임을 비교하세요", "Change the destination and compare the next hop and frame")}
      description={t("상단 명령을 순서대로 실행하면 같은 /24의 이웃과 원격 목적지가 서로 다른 Ethernet 목적지를 선택하는 과정을 볼 수 있습니다.", "Run the commands in order to see why an on-link peer and a remote destination select different Ethernet destinations.")}
      figureAttributes={{ "data-phase": phase, "data-mastered": mastered }}
      footer={<span>{mastered ? t("모든 경로 상태를 관찰했습니다.", "Every path state has been observed.") : t(`${visited.size} / ${subnetPhaseIds.length} 상태 관찰`, `${visited.size} / ${subnetPhaseIds.length} states observed`)}</span>}
    >
      <div className="network-figure-prediction">
        <DirectChoiceGroup
          label={t("203.0.113.20으로 보낼 때 ARP할 대상은?", "Which address should ARP resolve when sending to 203.0.113.20?")}
          value={prediction}
          options={[
            { value: "gateway", label: t("같은 링크의 기본 게이트웨이 10.20.0.1", "The on-link default gateway 10.20.0.1") },
            { value: "remote", label: t("원격 목적지 203.0.113.20", "The remote destination 203.0.113.20") },
            { value: "dns", label: t("DNS resolver 주소", "The DNS resolver address") },
          ]}
          onChange={setPrediction}
          controlId="subnet-next-hop-prediction"
        />
        <p role="status">{prediction === ""
          ? t("다음 홉을 예측하면 경로 실행이 열립니다.", "Predict the next hop to unlock path execution.")
          : predictionCorrect
            ? t("예측이 맞았습니다. 상태를 순서대로 실행하세요.", "Prediction confirmed. Execute each state in order.")
            : t("원격 주소는 현재 링크에 없습니다. 현재 링크에서 도달 가능한 대상을 다시 고르세요.", "The remote address is not on this link. Choose the reachable target on the current link.")}</p>
      </div>
      <div className="subnet-command-rail" role="toolbar" aria-label={t("패킷 경로 명령", "Packet path commands")}>
        {subnetPhaseIds.map((id, index) => (
          <button key={id} type="button" className={phase === id ? "is-active" : visited.has(id) ? "is-visited" : undefined} aria-current={phase === id ? "step" : undefined} disabled={!canExecuteSequentialPhase({ phaseIndex: index, visitedCount: visited.size, predictionCorrect })} onClick={() => choose(id)}>
            <span>{String(index + 1).padStart(2, "0")}</span>{labels[locale][index]}
          </button>
        ))}
        <button className="subnet-reset" type="button" onClick={reset} aria-label={t("실습 초기화", "Reset lab")}><ArrowCounterClockwiseIcon /></button>
      </div>

      {predictionCorrect ? <>
      <div className="subnet-stage">
        <div className="subnet-boundary-label">10.20.0.0/24 · LOCAL LINK</div>
        <div className="subnet-node subnet-host">
          <small>THIS HOST · eth0</small><strong>10.20.0.2/24</strong><code>02:00:00:00:00:02</code>
        </div>
        <div className={`subnet-path subnet-path-peer${decision.destination === SUBNET_PEER_ADDRESS ? " is-current" : ""}${decision.status === "neighbor-resolution" ? " is-arp" : ""}`} aria-hidden="true"><span /></div>
        <div className="subnet-node subnet-peer">
          <small>ON-LINK PEER</small><strong>{SUBNET_PEER_ADDRESS}</strong><code>…:44</code>
        </div>
        <div className={`subnet-path subnet-path-gateway${decision.nextHop === SUBNET_GATEWAY_ADDRESS ? " is-current" : ""}${decision.status === "neighbor-resolution" ? " is-arp" : ""}`} aria-hidden="true"><span /></div>
        <div className="subnet-node subnet-gateway">
          <small>DEFAULT GATEWAY</small><strong>{SUBNET_GATEWAY_ADDRESS}</strong><code>…:01</code>
        </div>
        <div className={`subnet-path subnet-path-remote${decision.destination === SUBNET_REMOTE_ADDRESS && decision.status !== "blocked" ? " is-current" : ""}`} aria-hidden="true"><span /></div>
        <div className="subnet-node subnet-remote">
          <small>REMOTE DESTINATION</small><strong>{SUBNET_REMOTE_ADDRESS}</strong><code>outside /24</code>
        </div>
        {decision.status === "blocked" ? <div className="subnet-blocked" role="status">× {t("기본 경로 없음", "NO DEFAULT ROUTE")}</div> : null}
      </div>

      <div className="subnet-decision-strip" aria-live="polite">
        <div><small>{t("같은 링크?", "ON LINK?")}</small><strong>{decision.onLink ? t("예", "YES") : t("아니요", "NO")}</strong></div>
        <div><small>{t("다음 홉 IP", "NEXT-HOP IP")}</small><strong>{decision.nextHop ?? "—"}</strong></div>
        <div><small>{t("Ethernet 목적지", "ETHERNET DST")}</small><strong>{decision.ethernetDestination ?? (decision.arpTarget ? `ARP → ${decision.arpTarget}` : "—")}</strong></div>
        <div><small>{t("IP 목적지", "IP DST")}</small><strong>{decision.ipDestination}</strong></div>
      </div>

      <div className="subnet-terminal">
        <div><span>$</span><code>{snapshot.command}</code></div>
        {snapshot.output.map((line) => <pre key={line}>{line}</pre>)}
      </div>
      <p className="subnet-phase-note"><strong>{currentIndex + 1} / 6</strong> {t("ARP는 다음 홉의 MAC을 찾습니다. 원격 IP 자체의 MAC을 찾지 않습니다.", "ARP resolves the next hop's MAC. It does not resolve the remote IP's MAC.")}</p>
      </> : <div className="network-evidence-locked" role="status">{t("예측을 확정하기 전에는 다음 홉과 프레임 판정을 숨깁니다.", "Next-hop and frame verdicts stay hidden until the prediction is confirmed.")}</div>}
    </ExecutableFigure>
  );
}
