import { useState } from "react";
import {
  evaluateNetworkViewIncidentRepair,
  networkViewIncidentIds,
  networkViewRepairIds,
  type NetworkViewIncidentId as IncidentId,
  type NetworkViewRepairId as RepairId,
} from "../../features/linux-networking/interfaces-addresses-and-loopback";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";

const copy = {
  ko: {
    reset: "장애 복구 초기화",
    kicker: "별도 실습 · 한 경계만 복구하기",
    title: "출력을 읽고 고장 난 조건 하나만 복구하세요",
    description: "네 가지 장애는 비슷한 통신 실패를 만들지만 관찰 결과와 필요한 최소 조치가 다릅니다.",
    solved: "해결한 장애",
    allSolved: "네 가지 장애를 모두 정확히 복구했습니다.",
    evidence: "관찰 결과",
    execute: "실행할 최소 조치",
    correct: "고장 난 경계를 정확히 복구했습니다",
    incorrect: "다른 상태를 바꿨습니다",
    incidents: {
      "interface-absent": {
        title: "사건 1 · eth0 행이 없다",
        symptom: "eth0 장치가 인터페이스 목록에서 보이지 않습니다.",
        evidence: "$ ip -br link\nlo               UP             UNKNOWN\n# eth0 row absent",
        correct: "인터페이스가 없으므로 관리 상태나 주소를 바꾸기 전에 장치 또는 드라이버를 복구해야 합니다.",
        incorrect: "존재하지 않는 eth0에는 링크 상태나 주소를 설정할 수 없습니다.",
      },
      "admin-down": {
        title: "사건 2 · eth0 DOWN",
        symptom: "인터페이스와 MAC 주소는 보이고 operstate는 DOWN이며 UP flag가 없습니다.",
        evidence: "$ ip -br link\nlo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>\neth0             DOWN           02:00:00:00:00:02 <BROADCAST,MULTICAST>",
        correct: "eth0는 이미 존재합니다. UP flag가 없으므로 admin 상태만 up으로 바꾸는 것이 가장 작은 복구입니다.",
        incorrect: "DOWN은 operstate입니다. 이 사건의 admin down은 flag 목록에 UP이 없다는 증거로 판정하세요.",
      },
      "carrier-down": {
        title: "사건 3 · UP, NO-CARRIER",
        symptom: "관리 상태는 up이지만 연결 상대가 감지되지 않습니다.",
        evidence: "$ ip -br link\neth0             UP             02:00:00:00:00:02\n$ cat /sys/class/net/eth0/carrier\n0",
        correct: "관리 상태는 이미 up입니다. 케이블 또는 가상 peer 환경을 복구해 연결 신호만 되돌렸습니다.",
        incorrect: "ip link set up을 반복하거나 주소를 바꿔도 carrier 0은 복구되지 않습니다.",
      },
      "loopback-address-missing": {
        title: "사건 4 · localhost delivery 실패",
        symptom: "이름은 127.0.0.1로 해석되지만 lo에 주소가 없습니다.",
        evidence: "$ getent ahostsv4 localhost\n127.0.0.1       STREAM localhost\n$ ip -br address show lo\nlo               UP",
        correct: "이름 연결은 이미 정상입니다. lo에 host 범위 주소 127.0.0.1/8만 복구했습니다.",
        incorrect: "localhost 이름 해석과 lo 주소 할당은 별도입니다. 관찰 결과에서 비어 있는 항목을 복구하세요.",
      },
    },
    repairs: {
      "restore-interface": "장치/드라이버 복구 → eth0 생성",
      "bring-admin-up": "ip link set eth0 up",
      "restore-carrier": "케이블/가상 peer 복구",
      "restore-loopback-address": "127.0.0.1/8을 lo에 복구",
    },
  },
  en: {
    reset: "Reset incidents",
    kicker: "SEPARATE ACTIVITY · REPAIR ONE BOUNDARY",
    title: "Read the evidence and repair only the broken state",
    description: "The four incidents produce similar communication failures, but their evidence and smallest repairs differ.",
    solved: "Incidents solved",
    allSolved: "All four incident boundaries were repaired precisely.",
    evidence: "Observed evidence",
    execute: "Smallest repair to execute",
    correct: "Boundary repaired precisely",
    incorrect: "That changed a different state",
    incidents: {
      "interface-absent": {
        title: "Incident 1 · No eth0 row",
        symptom: "The eth0 device is absent from the interface list.",
        evidence: "$ ip -br link\nlo               UP             UNKNOWN\n# eth0 row absent",
        correct: "The interface is absent, so restoring the device or driver must precede admin or address changes.",
        incorrect: "Link or address state cannot be changed on an eth0 object that does not exist.",
      },
      "admin-down": {
        title: "Incident 2 · eth0 DOWN",
        symptom: "The object and MAC are visible, operstate is DOWN, and the UP flag is absent.",
        evidence: "$ ip -br link\nlo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>\neth0             DOWN           02:00:00:00:00:02 <BROADCAST,MULTICAST>",
        correct: "The eth0 object already exists. The absent UP flag makes changing only admin state the smallest repair.",
        incorrect: "DOWN is operstate. In this incident, the missing UP flag is the evidence that admin is down.",
      },
      "carrier-down": {
        title: "Incident 3 · UP, NO-CARRIER",
        symptom: "Admin state is up, but no link partner is detected.",
        evidence: "$ ip -br link\neth0             UP             02:00:00:00:00:02\n$ cat /sys/class/net/eth0/carrier\n0",
        correct: "Admin was already up. Restoring the cable or virtual peer changed only carrier.",
        incorrect: "Repeating ip link set up or changing an address cannot repair carrier 0.",
      },
      "loopback-address-missing": {
        title: "Incident 4 · localhost delivery fails",
        symptom: "The name resolves to 127.0.0.1, but lo has no address.",
        evidence: "$ getent ahostsv4 localhost\n127.0.0.1       STREAM localhost\n$ ip -br address show lo\nlo               UP",
        correct: "The name mapping was healthy. Only the host-scope 127.0.0.1/8 assignment on lo was restored.",
        incorrect: "localhost resolution and the lo address assignment are separate. Repair the empty axis shown by the evidence.",
      },
    },
    repairs: {
      "restore-interface": "Restore device/driver → create eth0",
      "bring-admin-up": "ip link set eth0 up",
      "restore-carrier": "Restore cable/virtual peer",
      "restore-loopback-address": "Restore 127.0.0.1/8 on lo",
    },
  },
} as const;

export function InterfacesAddressesLoopbackIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const t = copy[locale];
  const [activeIncident, setActiveIncident] = useState<IncidentId>(networkViewIncidentIds[0]);
  const [solved, setSolved] = useState<Partial<Record<IncidentId, true>>>({});
  const [lastAttempt, setLastAttempt] = useState<{ incident: IncidentId; repair: RepairId; correct: boolean } | null>(null);
  const solvedCount = networkViewIncidentIds.filter((id) => solved[id]).length;
  const incident = t.incidents[activeIncident];

  function executeRepair(repair: RepairId) {
    const correct = evaluateNetworkViewIncidentRepair(activeIncident, repair).correct;
    const nextSolved = correct ? { ...solved, [activeIncident]: true as const } : solved;
    setSolved(nextSolved);
    setLastAttempt({ incident: activeIncident, repair, correct });
    onCompletionChange?.(networkViewIncidentIds.every((id) => nextSolved[id]));
  }

  function chooseIncident(id: IncidentId) {
    setActiveIncident(id);
    setLastAttempt(null);
  }

  function reset() {
    setActiveIncident(networkViewIncidentIds[0]);
    setSolved({});
    setLastAttempt(null);
    onCompletionChange?.(false);
  }

  const activeFeedback = lastAttempt?.incident === activeIncident ? lastAttempt : null;

  return (
    <InteractiveLab
      kicker={t.kicker}
      title={t.title}
      description={t.description}
      actions={<button type="button" className="button button-secondary" onClick={reset}>{t.reset}</button>}
      className="network-view-incident-lab"
    >
      <div className="network-view-incident-progress" role="status" aria-live="polite">
        <strong>{solvedCount} / {networkViewIncidentIds.length}</strong>{" "}
        <span>{solvedCount === networkViewIncidentIds.length ? t.allSolved : t.solved}</span>
      </div>
      <div className="network-view-incident-workspace">
        <ol className="network-view-incident-rail" aria-label={t.solved}>
          {networkViewIncidentIds.map((id, index) => (
            <li key={id}>
              <button
                type="button"
                aria-current={activeIncident === id ? "true" : undefined}
                onClick={() => chooseIncident(id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{t.incidents[id].title}</strong>
                <span aria-label={solved[id] ? (locale === "ko" ? "해결됨" : "Solved") : (locale === "ko" ? "미해결" : "Unsolved")}>{solved[id] ? "✓" : "○"}</span>
              </button>
            </li>
          ))}
        </ol>

        <section className="network-view-incident-console" aria-labelledby={`${activeIncident}-incident-title`}>
          <header>
            <h4 id={`${activeIncident}-incident-title`}>{incident.title}</h4>
            <span>{incident.symptom}</span>
          </header>
          <div>
            <strong>{t.evidence}</strong>
            <pre className="network-view-incident-evidence"><code>{incident.evidence}</code></pre>
          </div>
          <div>
            <strong>{t.execute}</strong>
            <div className="network-view-repair-actions">
              {networkViewRepairIds.map((repair) => (
                <button
                  type="button"
                  className="network-view-repair-action"
                  onClick={() => executeRepair(repair)}
                  key={repair}
                >
                  {t.repairs[repair]}
                </button>
              ))}
            </div>
          </div>
          {activeFeedback ? (
            <div
              className="network-view-incident-feedback"
              data-result={activeFeedback.correct ? "correct" : "incorrect"}
              role="status"
              aria-live="polite"
            >
              <strong>{activeFeedback.correct ? t.correct : t.incorrect}</strong>
              <p>{activeFeedback.correct ? incident.correct : incident.incorrect}</p>
            </div>
          ) : null}
        </section>
      </div>
    </InteractiveLab>
  );
}
