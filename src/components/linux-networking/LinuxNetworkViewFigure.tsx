import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLocale } from "../../features/localization/localization";
import { canExecuteSequentialPhase, hasMasteredSequentialEvidence } from "../../features/chapters/sequential-execution";
import {
  networkViewPhaseIds,
  networkViewPhaseSnapshot,
  networkOperationalState,
  type HostNetworkInterface,
  type NetworkAdminState,
  type NetworkViewEvidenceCommandId,
  type NetworkViewPhaseId,
  type NetworkViewPhaseSnapshot,
} from "../../features/linux-networking/interfaces-addresses-and-loopback";
import { ExecutableFigure } from "../interactive/ExecutableFigure";
import { DirectChoiceGroup } from "../interactive/DirectChoiceGroup";
import "./interfaces-addresses-loopback.css";

type LinuxNetworkViewFigureProps = {
  onMasteryChange?: (mastered: boolean) => void;
};

type ProbeResult = "idle" | "pass" | "blocked";

const phaseCommands: Record<NetworkViewPhaseId, string> = {
  observe: "ip -br link show",
  "eth0-up": "ip link set eth0 up",
  "address-added": "ip addr add 10.0.0.2/24 dev eth0",
  "lo-up": "ip link set lo up",
  "localhost-pass": "getent ahostsv4 localhost && ip route get 127.0.0.1",
  "lo-down-counterfactual": "ip link set lo down && ip route get 127.0.0.1",
};

const phaseEvidenceCommands: Record<
  NetworkViewPhaseId,
  readonly NetworkViewEvidenceCommandId[]
> = {
  observe: ["ip-brief-link"],
  "eth0-up": ["ip-brief-link", "eth0-operstate"],
  "address-added": ["ip-brief-address", "eth0-operstate"],
  "lo-up": ["ip-brief-address"],
  "localhost-pass": ["getent-localhost-v4", "route-get-loopback"],
  "lo-down-counterfactual": ["getent-localhost-v4", "route-get-loopback"],
};

const phaseMutationCommands: Partial<Record<NetworkViewPhaseId, string>> = {
  "eth0-up": "ip link set eth0 up",
  "address-added": "ip addr add 10.0.0.2/24 dev eth0",
  "lo-up": "ip link set lo up",
  "lo-down-counterfactual": "ip link set lo down",
};

function phaseOutput(snapshot: NetworkViewPhaseSnapshot): string {
  const lines: string[] = [];
  const evidence = phaseEvidenceCommands[snapshot.id]
    .map((id) => snapshot.commands[id]);
  const mutation = phaseMutationCommands[snapshot.id];
  if (mutation) lines.push(`$ ${mutation}`);
  evidence.forEach((output) => {
    lines.push(`$ ${output.command}`, ...output.lines);
  });
  if (snapshot.id === "localhost-pass") {
    lines.push("ethernet frame: none", "localhost trace: usable inside host");
  } else if (snapshot.id === "lo-down-counterfactual") {
    lines.push("ethernet frame: none", `localhost trace: blocked (${snapshot.localhostTrace.failure})`);
  }
  return lines.join("\n");
}

function requiredInterface(
  snapshot: NetworkViewPhaseSnapshot,
  id: "lo" | "eth0",
): HostNetworkInterface {
  const networkInterface = snapshot.machine.interfaces.find(
    (candidate) => candidate.id === id,
  );
  if (!networkInterface) {
    throw new Error(`Required interface missing from network-view phase: ${id}`);
  }
  return networkInterface;
}

function interfaceAddress(networkInterface: HostNetworkInterface) {
  return networkInterface.ipv4[0] ?? null;
}

function interfaceLinkIdentity(networkInterface: HostNetworkInterface) {
  return networkInterface.linkIdentity.kind === "ethernet"
    ? networkInterface.linkIdentity.mac
    : "not applicable · loopback";
}

function activeInterface(id: NetworkViewPhaseId): "all" | "eth0" | "lo" {
  if (id === "observe") return "all";
  if (id === "eth0-up" || id === "address-added") return "eth0";
  return "lo";
}

function probeResult(snapshot: NetworkViewPhaseSnapshot): ProbeResult {
  if (
    snapshot.id === "localhost-pass"
    || snapshot.id === "lo-down-counterfactual"
  ) {
    return snapshot.localhostTrace.usable ? "pass" : "blocked";
  }
  return "idle";
}

const copy = {
  ko: {
    kicker: "INTERACTIVE LAB · ONE HOST NETWORK STATE",
    title: "인터페이스·주소·루프백을 한 화면에서 분리해 보세요",
    description: "명령을 실행할 때마다 한 호스트에서 바뀐 상태가 그림과 상태표에 함께 표시됩니다. 무엇이 생겼고, 바뀌었으며, 그대로인지 비교하세요.",
    commandList: "실행할 Linux 네트워크 명령",
    commandHelp: "명령을 선택하거나 방향키로 이동하세요. Home과 End는 처음과 마지막 명령으로 이동합니다.",
    reset: "처음 상태로 되돌리기",
    visited: "확인한 단계",
    hostView: "ONE HOST · NETWORK STATE",
    process: "PROCESS",
    processIdle: "local probe 대기",
    processProbe: "localhost 경로 추적",
    localStack: "LOCAL NETWORK STACK",
    loopbackLane: "LOOPBACK PATH",
    ethernetLane: "ETHERNET PATH",
    localOnly: "현재 호스트 안에서 끝남",
    wire: "WIRE",
    noFrame: "Ethernet frame 없음",
    exists: "존재",
    yes: "있음",
    admin: "ADMIN",
    operstate: "OPERSTATE",
    carrier: "LINK",
    mac: "LINK IDENTITY",
    address: "IPv4 ADDRESS",
    prefix: "PREFIX",
    interfaceTable: "현재 Linux 인터페이스 상태",
    interfaceName: "INTERFACE",
    commandOutput: "현재 Linux 명령 실행 결과",
    activeCommand: "현재 명령",
    delta: "이번에 바뀐 것",
    invariant: "그대로인 것",
    noAddress: "없음",
    phases: [
      {
        short: "INSPECT",
        label: "인터페이스 존재 확인",
        delta: "lo와 eth0 행이 보입니다. eth0의 operstate는 DOWN이고 UP flag가 없어 admin도 down입니다.",
        invariant: "행의 존재, UP flag의 admin 상태, operstate 열은 서로 다른 증거입니다.",
        announcement: "기준 상태. lo와 eth0 인터페이스가 존재합니다. eth0의 operstate는 down이고 UP flag가 없어 관리 상태도 down입니다. lo에는 127.0.0.1 slash 8이 남아 있습니다.",
      },
      {
        short: "ADMIN UP",
        label: "eth0 관리 상태 올리기",
        delta: "eth0에 UP flag가 생겨 admin은 up이지만 operstate는 DOWN, 연결 신호는 NO-CARRIER로 남습니다.",
        invariant: "관리 상태를 UP으로 바꿔도 carrier나 operstate가 자동으로 UP이 되지는 않습니다.",
        announcement: "eth0 관리 상태가 up으로 바뀌었습니다. 연결 신호는 no carrier이고 MAC 주소는 유지되며 IPv4 주소는 아직 없습니다.",
      },
      {
        short: "ADD ADDRESS",
        label: "eth0에 주소 붙이기",
        delta: "10.0.0.2/24가 eth0에 붙고 10.0.0.0/24 네트워크가 파생되지만 연결 신호는 NO-CARRIER로 남습니다.",
        invariant: "주소와 프리픽스는 인터페이스의 MAC 주소나 관리 상태와 별개입니다.",
        announcement: "eth0에 10.0.0.2 slash 24를 할당했습니다. 관리 상태와 MAC 주소는 그대로입니다.",
      },
      {
        short: "LOOPBACK UP",
        label: "lo 사용 가능하게 만들기",
        delta: "lo의 UP flag가 켜지고 127.0.0.1/8은 그대로 유지됩니다.",
        invariant: "루프백도 존재 여부, 주소, 관리 상태를 각각 가집니다.",
        announcement: "lo 관리 상태가 up으로 바뀌었습니다. 루프백 주소 127.0.0.1 slash 8은 그대로입니다.",
      },
      {
        short: "LOCAL PROBE",
        label: "localhost 경로 실행",
        delta: "localhost가 127.0.0.1로 해석되고 로컬 네트워크 스택 안에서 확인 요청이 성공합니다.",
        invariant: "루프백 패킷은 eth0나 Ethernet 선을 지나지 않습니다.",
        announcement: "localhost 확인 요청이 성공했습니다. 경로는 프로세스에서 lo와 로컬 네트워크 스택 안에서 끝나며 Ethernet frame은 없습니다.",
      },
      {
        short: "BREAK LO",
        label: "주소를 남기고 lo 내리기",
        delta: "127.0.0.1/8은 남아 있지만 lo가 DOWN이라 같은 확인 요청이 차단됩니다.",
        invariant: "주소가 있다는 사실만으로 인터페이스를 사용할 수 있다고 판단할 수 없습니다.",
        announcement: "lo를 down으로 바꿨습니다. 127.0.0.1 slash 8은 남아 있지만 localhost 확인 요청은 차단됩니다.",
      },
    ],
  },
  en: {
    kicker: "INTERACTIVE LAB · ONE HOST NETWORK STATE",
    title: "Separate interfaces, addresses, and loopback in one state view",
    description: "Each command updates the diagram and state table for the same host. Compare what appeared, changed, and stayed fixed.",
    commandList: "Linux network commands to execute",
    commandHelp: "Choose a command or move with the arrow keys. Home and End move to the first and last commands.",
    reset: "Return to the starting state",
    visited: "Steps checked",
    hostView: "ONE HOST · NETWORK STATE",
    process: "PROCESS",
    processIdle: "local probe waiting",
    processProbe: "trace localhost",
    localStack: "LOCAL NETWORK STACK",
    loopbackLane: "LOOPBACK PATH",
    ethernetLane: "ETHERNET PATH",
    localOnly: "ends inside this host",
    wire: "WIRE",
    noFrame: "No Ethernet frame",
    exists: "EXISTS",
    yes: "yes",
    admin: "ADMIN",
    operstate: "OPERSTATE",
    carrier: "LINK",
    mac: "LINK IDENTITY",
    address: "IPv4 ADDRESS",
    prefix: "PREFIX",
    interfaceTable: "Current Linux interface state",
    interfaceName: "INTERFACE",
    commandOutput: "Current Linux command output",
    activeCommand: "ACTIVE COMMAND",
    delta: "WHAT CHANGED",
    invariant: "WHAT STAYED FIXED",
    noAddress: "none",
    phases: [
      {
        short: "INSPECT",
        label: "Observe interface existence",
        delta: "Rows for lo and eth0 exist. eth0 operstate is DOWN and the absent UP flag proves admin is down.",
        invariant: "Row existence, the admin UP flag, and the operstate column are separate evidence.",
        announcement: "Baseline. The lo and eth0 interfaces exist. Eth0 operstate is down and its absent UP flag proves admin is also down. Lo still has 127.0.0.1 slash 8.",
      },
      {
        short: "ADMIN UP",
        label: "Set eth0 admin up",
        delta: "eth0 gains the admin UP flag, but operstate stays DOWN, carrier stays NO-CARRIER, and no IPv4 address appears.",
        invariant: "Admin UP cannot create carrier or make operstate UP by itself.",
        announcement: "The eth0 admin state changed to up. Carrier remains no carrier, its MAC stayed fixed, and it still has no IPv4 address.",
      },
      {
        short: "ADD ADDRESS",
        label: "Attach an eth0 address",
        delta: "10.0.0.2/24 attaches to eth0 and derives the 10.0.0.0/24 network while carrier remains NO-CARRIER.",
        invariant: "An address and prefix are separate from link identity and admin state.",
        announcement: "Assigned 10.0.0.2 slash 24 to eth0. Its admin state and MAC did not change.",
      },
      {
        short: "LOOPBACK UP",
        label: "Make lo usable",
        delta: "The lo UP flag turns on while 127.0.0.1/8 stays attached.",
        invariant: "Loopback also has separate existence, address, and admin state.",
        announcement: "The lo admin state changed to up. Its loopback address 127.0.0.1 slash 8 stayed fixed.",
      },
      {
        short: "LOCAL PROBE",
        label: "Run the localhost path",
        delta: "localhost resolves to 127.0.0.1 and the probe succeeds inside the local stack.",
        invariant: "A loopback packet crosses neither eth0 nor an Ethernet wire.",
        announcement: "The localhost probe passed. The path closes from the process through lo and the local stack with no Ethernet frame.",
      },
      {
        short: "BREAK LO",
        label: "Keep the address, lower lo",
        delta: "127.0.0.1/8 remains, but the same probe is blocked while lo is DOWN.",
        invariant: "Address presence alone does not prove that an interface is usable.",
        announcement: "Lo changed to down. 127.0.0.1 slash 8 remains, but the localhost probe is blocked.",
      },
    ],
  },
} as const;

function stateLabel(state: NetworkAdminState) {
  return state.toUpperCase();
}

function carrierLabel(networkInterface: HostNetworkInterface) {
  if (networkInterface.kind === "loopback") return "N/A · LOOPBACK";
  return networkInterface.carrierState === "up" ? "UP" : "NO-CARRIER";
}

export function LinuxNetworkViewFigure({
  onMasteryChange,
}: LinuxNetworkViewFigureProps) {
  const { locale } = useLocale();
  const t = copy[locale];
  const [activeIndex, setActiveIndex] = useState(0);
  const [visited, setVisited] = useState<Set<NetworkViewPhaseId>>(
    () => new Set([networkViewPhaseIds[0]]),
  );
  const [prediction, setPrediction] = useState("");
  const predictionGroupRef = useRef<HTMLDivElement>(null);
  const commandListRef = useRef<HTMLOListElement>(null);
  const commandHelpId = useId();
  const phaseId = networkViewPhaseIds[activeIndex];
  const snapshot = networkViewPhaseSnapshot(phaseId);
  const phaseCopy = t.phases[activeIndex];
  const predictionCorrect = prediction === "interface-state";
  const mastered = hasMasteredSequentialEvidence({ predictionCorrect, visitedCount: visited.size, phaseCount: networkViewPhaseIds.length });
  const maxUnlockedIndex = predictionCorrect
    ? Math.min(visited.size, networkViewPhaseIds.length - 1)
    : -1;
  const currentProbeResult = probeResult(snapshot);
  const isProbe = currentProbeResult !== "idle";
  const loopbackPath = currentProbeResult === "pass"
    ? "active"
    : currentProbeResult === "blocked"
      ? "blocked"
      : "idle";
  const wireFrame = currentProbeResult === "idle" ? "idle" : "none";
  const currentCommand = phaseCommands[phaseId];
  const currentOutput = phaseOutput(snapshot);
  const currentActiveInterface = activeInterface(phaseId);
  const loopback = requiredInterface(snapshot, "lo");
  const ethernet = requiredInterface(snapshot, "eth0");
  const loopbackAddress = interfaceAddress(loopback);
  const ethernetAddress = interfaceAddress(ethernet);

  useEffect(() => {
    onMasteryChange?.(mastered);
  }, [mastered, onMasteryChange]);

  function selectPhase(index: number) {
    const boundedIndex = Math.max(
      0,
      Math.min(index, networkViewPhaseIds.length - 1),
    );
    const nextId = networkViewPhaseIds[boundedIndex];
    if (!canExecuteSequentialPhase({ phaseIndex: boundedIndex, visitedCount: visited.size, predictionCorrect })) return;
    setActiveIndex(boundedIndex);
    setVisited((current) => {
      if (current.has(nextId)) return current;
      return new Set([...current, nextId]);
    });
  }

  function handleCommandKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = Math.min(index + 1, maxUnlockedIndex);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = Math.max(index - 1, 0);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = maxUnlockedIndex;
    }
    if (nextIndex === null || nextIndex < 0) return;
    event.preventDefault();
    selectPhase(nextIndex);
    commandListRef.current
      ?.querySelectorAll<HTMLButtonElement>("button[data-command-trigger]")
      .item(nextIndex)
      .focus();
  }

  function reset() {
    setActiveIndex(0);
    setVisited(new Set([networkViewPhaseIds[0]]));
    setPrediction("");
    requestAnimationFrame(() => {
      predictionGroupRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    });
  }

  const interfaceRows = [
    { id: "lo", state: loopback, address: loopbackAddress },
    { id: "eth0", state: ethernet, address: ethernetAddress },
  ] as const;

  return (
    <ExecutableFigure
      kicker={t.kicker}
      title={t.title}
      description={t.description}
      className="linux-network-view-figure"
      headingLevel={3}
      testId="linux-network-view-figure"
      figureAttributes={{
        "data-component": "linux-network-view-explorer",
        "data-network-view-phase": snapshot.id,
        "data-active-interface": currentActiveInterface,
        "data-probe-result": currentProbeResult,
        "data-interactive-ready": "true",
        "data-mastered": mastered ? "true" : "false",
      }}
      footer={(
        <dl className="linux-network-view-invariant">
          <div>
            <dt>{t.activeCommand}</dt>
            <dd><code>{currentCommand}</code></dd>
          </div>
          <div>
            <dt>{t.delta}</dt>
            <dd><strong>{phaseCopy.delta}</strong></dd>
          </div>
          <div>
            <dt>{t.invariant}</dt>
            <dd>{phaseCopy.invariant}</dd>
          </div>
        </dl>
      )}
    >
      <div className="network-figure-prediction">
        <DirectChoiceGroup
          label={locale === "ko" ? "localhost 이름 해석 다음에 전달을 결정하는 것은?" : "After resolving localhost, what determines delivery?"}
          value={prediction}
          options={[
            { value: "interface-state", label: locale === "ko" ? "현재 network view의 lo 상태와 주소" : "The lo state and address in the current network view" },
            { value: "ethernet", label: locale === "ko" ? "eth0 carrier와 gateway MAC" : "eth0 carrier and the gateway MAC" },
            { value: "name-only", label: locale === "ko" ? "localhost 이름의 존재만" : "Only the existence of the localhost name" },
          ]}
          onChange={setPrediction}
          controlId="network-view-delivery-prediction"
          groupRef={predictionGroupRef}
        />
        <p role="status">{prediction === ""
          ? locale === "ko" ? "전달 경계를 예측하면 상태 변경 명령이 열립니다." : "Predict the delivery boundary to unlock state-changing commands."
          : predictionCorrect
            ? locale === "ko" ? "예측이 맞았습니다. 한 번에 한 상태만 바꾸세요." : "Prediction confirmed. Change one state at a time."
            : locale === "ko" ? "이 경로는 Ethernet을 지나지 않습니다. 현재 local network view를 다시 보세요." : "This path does not cross Ethernet. Reconsider the current local network view."}</p>
      </div>
      {predictionCorrect ? <>
      <div className="linux-network-view-workspace">
        <div className="linux-network-command-column">
          <ol
            ref={commandListRef}
            aria-label={t.commandList}
            aria-describedby={commandHelpId}
          >
            {networkViewPhaseIds.map((id, index) => {
              const active = index === activeIndex;
              const item = t.phases[index];
              return (
                <li
                  key={id}
                  data-command-id={id}
                  data-command-state={active ? "active" : "idle"}
                  data-command-visited={visited.has(id) ? "true" : "false"}
                >
                  <button
                    type="button"
                    data-command-trigger={id}
                    aria-current={active ? "step" : undefined}
                    aria-label={`${index + 1} of ${networkViewPhaseIds.length}: ${item.label}`}
                    tabIndex={active ? 0 : -1}
                    disabled={!canExecuteSequentialPhase({ phaseIndex: index, visitedCount: visited.size, predictionCorrect })}
                    onClick={() => selectPhase(index)}
                    onKeyDown={(event) => handleCommandKeyDown(event, index)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.short}</strong>
                    <code>{phaseCommands[id]}</code>
                  </button>
                </li>
              );
            })}
          </ol>
          <p id={commandHelpId}>{t.commandHelp}</p>
          <div className="linux-network-command-meta">
            <span>{t.visited} · {visited.size}/{networkViewPhaseIds.length}</span>
            <button type="button" data-testid="linux-network-view-reset" onClick={reset}>
              <ArrowCounterClockwiseIcon aria-hidden="true" />
              {t.reset}
            </button>
          </div>
        </div>

        <section
          className="linux-network-view-canvas"
          role="group"
          aria-label={`${t.hostView}. ${phaseCopy.announcement}`}
          data-loopback-path={loopbackPath}
          data-wire-frame={wireFrame}
        >
          <header>
            <span>{t.hostView}</span>
            <strong>{currentCommand}</strong>
          </header>

          <div className="linux-network-host-scene">
            <div
              className="linux-network-process-node"
              data-probe-state={currentProbeResult}
            >
              <span>{t.process}</span>
              <strong>{isProbe ? t.processProbe : t.processIdle}</strong>
            </div>

            <div className="linux-network-kernel-plane">
              <span>{t.localStack}</span>
              <div
                className="linux-network-path linux-network-loopback-path"
                data-path-kind="loopback"
                data-path-state={loopbackPath}
                aria-hidden="true"
              >
                <i />
                <b>{currentProbeResult === "blocked" ? "BLOCKED" : currentProbeResult === "pass" ? "LOCAL" : "LO"}</b>
              </div>
              <div
                className="linux-network-path linux-network-ethernet-path"
                data-path-kind="ethernet"
                data-path-state="idle"
                aria-hidden="true"
              >
                <i />
                <b>{wireFrame === "none" ? t.noFrame : t.wire}</b>
              </div>

              <article
                className="linux-network-interface-node is-loopback"
                data-interface-id="lo"
                data-interface-exists="true"
                data-admin-state={loopback.adminState}
                data-carrier-state={loopback.carrierState}
                data-address-count={loopback.ipv4.length}
              >
                <header>
                  <span>LOOPBACK</span>
                  <strong>lo</strong>
                </header>
                <dl>
                  <div><dt>{t.admin}</dt><dd>{stateLabel(loopback.adminState)}</dd></div>
                  <div><dt>{t.address}</dt><dd>{loopbackAddress ? `${loopbackAddress.address}/${loopbackAddress.prefixLength}` : t.noAddress}</dd></div>
                </dl>
                <p>{t.localOnly}</p>
              </article>

              <article
                className="linux-network-interface-node is-ethernet"
                data-interface-id="eth0"
                data-interface-exists="true"
                data-admin-state={ethernet.adminState}
                data-carrier-state={ethernet.carrierState}
                data-address-count={ethernet.ipv4.length}
              >
                <header>
                  <span>ETHERNET</span>
                  <strong>eth0</strong>
                </header>
                <dl>
                  <div><dt>{t.admin}</dt><dd>{stateLabel(ethernet.adminState)}</dd></div>
                  <div><dt>{t.address}</dt><dd>{ethernetAddress ? `${ethernetAddress.address}/${ethernetAddress.prefixLength}` : t.noAddress}</dd></div>
                </dl>
                <p>{interfaceLinkIdentity(ethernet)}</p>
              </article>
            </div>
          </div>
        </section>
      </div>

      <div className="linux-network-evidence-grid">
        <div className="linux-network-interface-ledger-wrap">
          <table
            className="linux-network-interface-ledger"
            data-testid="linux-network-interface-ledger"
          >
            <caption>{t.interfaceTable}</caption>
            <thead>
              <tr>
                <th scope="col">{t.interfaceName}</th>
                <th scope="col">{t.exists}</th>
                <th scope="col">{t.admin}</th>
                <th scope="col">{t.operstate}</th>
                <th scope="col">{t.carrier}</th>
                <th scope="col">{t.mac}</th>
                <th scope="col">{t.address}</th>
                <th scope="col">{t.prefix}</th>
              </tr>
            </thead>
            <tbody>
              {interfaceRows.map(({ id, state, address }) => (
                <tr
                  key={id}
                  data-interface-row={id}
                  data-admin-state={state.adminState}
                  data-carrier-state={state.carrierState}
                >
                  <th scope="row" data-column={t.interfaceName}>{id}</th>
                  <td data-column={t.exists}>{t.yes}</td>
                  <td data-column={t.admin}><strong>{stateLabel(state.adminState)}</strong></td>
                  <td data-column={t.operstate}><strong>{networkOperationalState(state)}</strong></td>
                  <td
                    className="linux-network-carrier-cell"
                    data-column={t.carrier}
                    data-carrier-state={state.carrierState}
                  >{carrierLabel(state)}</td>
                  <td data-column={t.mac}><code>{interfaceLinkIdentity(state)}</code></td>
                  <td data-column={t.address}><code>{address?.address ?? t.noAddress}</code></td>
                  <td data-column={t.prefix}><code>{address ? `/${address.prefixLength}` : t.noAddress}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <pre
          className="linux-network-command-output"
          aria-label={t.commandOutput}
          data-command-output={snapshot.id}
        ><code>{currentOutput}</code></pre>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {phaseCopy.announcement}
      </p>
      </> : <div className="network-evidence-locked" role="status">
        {locale === "ko" ? "예측을 확정하기 전에는 interface 상태와 명령 출력을 숨깁니다." : "Interface state and command output stay hidden until the prediction is confirmed."}
      </div>}
    </ExecutableFigure>
  );
}
