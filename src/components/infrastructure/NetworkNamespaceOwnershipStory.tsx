import {
  ArrowRightIcon,
  PushPinIcon,
} from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  getOwnershipStoryDelta,
  getOwnershipStorySnapshot,
  ownershipStoryStepIds,
  type OwnershipStoryDelta,
  type OwnershipStoryDeltaRow,
  type OwnershipStoryNamespaceId,
  type OwnershipStoryObjectId,
  type OwnershipStorySnapshot,
  type OwnershipStoryStepId,
} from "../../features/infrastructure/network-namespace-ownership-story";
import { useLocale } from "../../features/localization/localization";
import "./network-namespace-ownership-story.css";

type NetworkNamespaceOwnershipStoryProps = {
  initialStep?: OwnershipStoryStepId;
  onStepChange?: (step: OwnershipStoryStepId) => void;
};

type OwnershipDeltaKind = "baseline" | "changed" | "preserved" | "created";
type ComparisonSide = "before" | "after";

const copy = {
  ko: {
    kicker: "FIGURE 03",
    title: "어떤 object가 실제로 바뀌었을까요?",
    intro: "명령을 선택하고 BEFORE와 AFTER를 비교해 보세요. 이동 경로가 아니라 kernel object의 소유권 변화가 핵심입니다.",
    commandList: "비교할 kernel 연산",
    commandHelp: "명령을 선택해 소유권 변화를 비교하세요. 방향키로 단계 사이를 이동할 수 있습니다.",
    before: "BEFORE",
    after: "AFTER",
    baseline: "BASELINE",
    kernel: "ONE LINUX KERNEL",
    host: "host netns",
    app: "app netns",
    socketTable: "SOCKET TABLE",
    process: "THREAD",
    interface: "INTERFACE",
    hostSocket: "HOST SOCKET",
    appSocket: "APP SOCKET",
    pinned: "생성 namespace에 고정",
    object: "OBJECT",
    why: "WHY",
    none: "없음",
    deltaTable: "kernel 연산 전후 소유권 변화",
    deltaKinds: {
      baseline: "기준",
      changed: "변경",
      preserved: "유지",
      created: "생성",
    },
    objectLabels: {
      thread: "THREAD",
      interface: "INTERFACE · eth-app",
      "host-listener": "HOST SOCKET · 127.0.0.1:8080",
      "app-listener": "APP SOCKET · 127.0.0.1:8080",
    },
    reasons: {
      thread: "setns()는 현재 thread가 사용할 network view를 바꿉니다.",
      interface: "interface는 한 번에 하나의 namespace만 소유하며 이동은 복제가 아닙니다.",
      "host-listener": "이미 생성된 socket은 생성 당시 namespace에 고정됩니다.",
      "app-listener": "app 안에서 새로 만든 socket은 app socket table에 생성됩니다.",
    },
    steps: [
      {
        index: "00",
        short: "TWO VIEWS",
        label: "두 view 관측",
        summary: "하나의 kernel 안에서도 host와 app은 서로 다른 network object 집합을 조회합니다.",
        invariant: "같은 kernel을 공유해도 route·neighbor·socket table은 namespace별로 분리됩니다.",
        announcement: "기준 상태. host와 app의 network view가 분리되어 있고 host listener는 host socket table에 있습니다.",
      },
      {
        index: "01",
        short: "MOVE INTERFACE",
        label: "interface 이동",
        summary: "eth-app 하나가 host에서 app으로 이동하고 host view에서는 사라집니다.",
        invariant: "interface는 한 번에 정확히 하나의 network namespace만 소유합니다.",
        announcement: "eth-app interface가 host에서 app namespace로 이동했습니다. host에는 복사본이 남지 않습니다.",
      },
      {
        index: "02",
        short: "MOVE THREAD",
        label: "setns(app)",
        summary: "thread는 app으로 이동하지만 먼저 만든 listener는 host socket table에 남습니다.",
        invariant: "새 syscall은 현재 thread view를 사용하지만 기존 socket의 creation namespace는 바뀌지 않습니다.",
        announcement: "thread는 app namespace로 이동했습니다. host에서 만든 listener는 host socket table에 그대로 남아 있습니다.",
      },
      {
        index: "03",
        short: "CREATE SOCKET",
        label: "socket 생성",
        summary: "app 안에서 새 socket을 만들면 같은 endpoint를 가진 listener가 두 table에 공존합니다.",
        invariant: "socket은 생성 시점의 namespace에 고정되며 thread 이동은 이전 socket을 이주시키지 않습니다.",
        announcement: "app namespace에 새 listener를 만들었습니다. 같은 endpoint가 host와 app socket table에 각각 존재합니다.",
      },
    ],
  },
  en: {
    kicker: "FIGURE 03",
    title: "Which object actually changed?",
    intro: "Choose a command and compare BEFORE with AFTER. The ownership delta matters more than a drawn travel path.",
    commandList: "Kernel operations to compare",
    commandHelp: "Choose a command to compare its ownership effect. Use the arrow keys to move between steps.",
    before: "BEFORE",
    after: "AFTER",
    baseline: "BASELINE",
    kernel: "ONE LINUX KERNEL",
    host: "host netns",
    app: "app netns",
    socketTable: "SOCKET TABLE",
    process: "THREAD",
    interface: "INTERFACE",
    hostSocket: "HOST SOCKET",
    appSocket: "APP SOCKET",
    pinned: "pinned to creation netns",
    object: "OBJECT",
    why: "WHY",
    none: "absent",
    deltaTable: "Ownership changes before and after the kernel operation",
    deltaKinds: {
      baseline: "baseline",
      changed: "changed",
      preserved: "preserved",
      created: "created",
    },
    objectLabels: {
      thread: "THREAD",
      interface: "INTERFACE · eth-app",
      "host-listener": "HOST SOCKET · 127.0.0.1:8080",
      "app-listener": "APP SOCKET · 127.0.0.1:8080",
    },
    reasons: {
      thread: "setns() changes the network view used by the current thread.",
      interface: "An interface has one owning namespace; moving it is not copying it.",
      "host-listener": "An existing socket remains pinned to its creation namespace.",
      "app-listener": "A socket created inside app is inserted into app's socket table.",
    },
    steps: [
      {
        index: "00",
        short: "TWO VIEWS",
        label: "Observe two views",
        summary: "Host and app consult different network-object sets inside one kernel.",
        invariant: "Routes, neighbors, and socket tables stay namespace-local even when the kernel is shared.",
        announcement: "Baseline. Host and app have separate network views, and the host listener belongs to the host socket table.",
      },
      {
        index: "01",
        short: "MOVE INTERFACE",
        label: "Move interface",
        summary: "The single eth-app object moves from host to app and disappears from the host view.",
        invariant: "An interface has exactly one owning network namespace.",
        announcement: "The eth-app interface moved from host to app. No copy remains in the host namespace.",
      },
      {
        index: "02",
        short: "MOVE THREAD",
        label: "setns(app)",
        summary: "The thread enters app while its earlier listener remains in the host socket table.",
        invariant: "New syscalls use the current thread view, but an existing socket keeps its creation namespace.",
        announcement: "The thread moved to app. The listener created in host remains in the host socket table.",
      },
      {
        index: "03",
        short: "CREATE SOCKET",
        label: "Create socket",
        summary: "Creating a socket inside app lets identical endpoints coexist in two tables.",
        invariant: "A socket is pinned to its namespace at creation; moving a thread never migrates an older socket.",
        announcement: "A new listener was created in app. The same endpoint now exists in host and app socket tables.",
      },
    ],
  },
} as const;

type StoryCopy = (typeof copy)[keyof typeof copy];

function getDeltaKind(
  delta: OwnershipStoryDelta,
  objectId: OwnershipStoryObjectId,
): OwnershipDeltaKind {
  if (delta.changedRows.some((row) => row.objectId === objectId)) return "changed";
  if (delta.createdRows.some((row) => row.objectId === objectId)) return "created";
  if (delta.preservedRows.some((row) => row.objectId === objectId)) {
    return delta.previousStepId === null ? "baseline" : "preserved";
  }
  return "baseline";
}

function objectHook(side: ComparisonSide, id: string) {
  return side === "after"
    ? { "data-object-id": id }
    : { "data-reference-object-id": id };
}

function SnapshotScene({
  copy: t,
  side,
  snapshot,
  delta,
  announcement,
}: {
  copy: StoryCopy;
  side: ComparisonSide;
  snapshot: OwnershipStorySnapshot;
  delta: OwnershipStoryDelta;
  announcement: string;
}) {
  const hostListener = snapshot.listeners.find(({ id }) => id === "host-listener");
  const appListener = snapshot.listeners.find(({ id }) => id === "app-listener");
  const showDelta = side === "after";

  return (
    <article
      className="namespace-ownership-comparison-panel"
      data-comparison-side={side}
      data-snapshot-step={snapshot.stepId}
    >
      <strong className="namespace-ownership-comparison-label">
        {side === "before" ? t.before : t.after}
      </strong>
      <div
        className="namespace-ownership-scene-canvas"
        role="img"
        aria-label={`${side === "before" ? t.before : t.after}: ${announcement}`}
      >
        <img
          src="/illustrations/network-namespace-ownership-scene-v2.webp"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <span className="namespace-story-kernel-label">{t.kernel}</span>
        <span className="namespace-story-boundary-label namespace-story-boundary-label-host">{t.host}</span>
        <span className="namespace-story-boundary-label namespace-story-boundary-label-app">{t.app}</span>
        <span className="namespace-story-table-label namespace-story-table-label-host">{t.socketTable}</span>
        <span className="namespace-story-table-label namespace-story-table-label-app">{t.socketTable}</span>

        <div
          className="namespace-story-actor namespace-story-thread"
          data-object-kind="thread"
          data-owner-namespace={snapshot.threadNamespace}
          data-delta-kind={showDelta ? getDeltaKind(delta, "thread") : undefined}
          {...objectHook(side, "story-thread")}
        >
          <i aria-hidden="true" />
          <span>{t.process}</span>
          <small>{snapshot.threadNamespace}</small>
        </div>

        <div
          className="namespace-story-actor namespace-story-interface"
          data-object-kind="interface"
          data-owner-namespace={snapshot.interfaceNamespace}
          data-delta-kind={showDelta ? getDeltaKind(delta, "interface") : undefined}
          {...objectHook(side, "eth-app")}
        >
          <i aria-hidden="true" />
          <span>eth-app</span>
          <small>{snapshot.interfaceNamespace}</small>
        </div>

        {hostListener ? (
          <div
            className="namespace-story-actor namespace-story-listener namespace-story-host-listener"
            data-object-kind="socket"
            data-owner-namespace={hostListener.namespaceId}
            data-delta-kind={showDelta ? getDeltaKind(delta, "host-listener") : undefined}
            {...objectHook(side, "host-listener")}
          >
            <small>{t.hostSocket}</small>
            <span>{hostListener.endpoint}</span>
            <PushPinIcon aria-hidden="true" weight="fill" />
          </div>
        ) : null}

        {appListener ? (
          <div
            className="namespace-story-actor namespace-story-listener namespace-story-app-listener"
            data-object-kind="socket"
            data-owner-namespace={appListener.namespaceId}
            data-delta-kind={showDelta ? getDeltaKind(delta, "app-listener") : undefined}
            {...objectHook(side, "app-listener")}
          >
            <small>{t.appSocket}</small>
            <span>{appListener.endpoint}</span>
          </div>
        ) : null}

        <span className="namespace-story-pinned-note">
          <PushPinIcon aria-hidden="true" weight="fill" />
          {t.pinned}
        </span>
      </div>
    </article>
  );
}

function ownerLabel(
  owner: OwnershipStoryNamespaceId | null,
  none: string,
) {
  return owner === null ? none : `${owner} netns`;
}

function DeltaRow({
  copy: t,
  row,
  kind,
}: {
  copy: StoryCopy;
  row: OwnershipStoryDeltaRow;
  kind: OwnershipDeltaKind;
}) {
  return (
    <div
      className="namespace-ownership-delta-row"
      role="row"
      data-delta-object-id={row.objectId}
      data-delta-kind={kind}
    >
      <div role="cell" data-column={t.object}>
        <i aria-hidden="true" data-object-kind={row.objectKind} />
        <strong>{t.objectLabels[row.objectId]}</strong>
      </div>
      <code role="cell" data-column={t.before}>{ownerLabel(row.beforeOwner, t.none)}</code>
      <div role="cell" data-column={t.after}>
        <code>{ownerLabel(row.afterOwner, t.none)}</code>
        <span>{t.deltaKinds[kind]}</span>
      </div>
      <p role="cell" data-column={t.why}>{t.reasons[row.objectId]}</p>
    </div>
  );
}

export function NetworkNamespaceOwnershipStory({
  initialStep = "separate-views",
  onStepChange,
}: NetworkNamespaceOwnershipStoryProps) {
  const { locale } = useLocale();
  const t = copy[locale];
  const initialIndex = Math.max(0, ownershipStoryStepIds.indexOf(initialStep));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const commandListRef = useRef<HTMLOListElement>(null);
  const titleId = useId();
  const introId = useId();
  const commandHelpId = useId();
  const activeStepId = ownershipStoryStepIds[activeIndex];
  const activeSnapshot = getOwnershipStorySnapshot(activeStepId);
  const delta = getOwnershipStoryDelta(activeStepId);
  const beforeStepId = delta.previousStepId ?? activeStepId;
  const beforeSnapshot = getOwnershipStorySnapshot(beforeStepId);
  const beforeIndex = ownershipStoryStepIds.indexOf(beforeStepId);
  const activeStepCopy = t.steps[activeIndex];
  const beforeStepCopy = t.steps[Math.max(0, beforeIndex)];
  const deltaRows = [
    ...delta.changedRows,
    ...delta.createdRows,
    ...delta.preservedRows,
  ].sort((left, right) => {
    const order: OwnershipStoryObjectId[] = [
      "thread",
      "host-listener",
      "interface",
      "app-listener",
    ];
    return order.indexOf(left.objectId) - order.indexOf(right.objectId);
  });

  useEffect(() => {
    onStepChange?.(activeStepId);
  }, [activeStepId, onStepChange]);

  function selectStep(index: number) {
    setActiveIndex(Math.max(0, Math.min(index, ownershipStoryStepIds.length - 1)));
  }

  function handleCommandKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % ownershipStoryStepIds.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + ownershipStoryStepIds.length) % ownershipStoryStepIds.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = ownershipStoryStepIds.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    selectStep(nextIndex);
    commandListRef.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      .item(nextIndex)
      .focus();
  }

  return (
    <figure
      className="namespace-ownership-story"
      aria-labelledby={titleId}
      aria-describedby={introId}
      data-testid="namespace-ownership-scenario-player"
      data-component="namespace-ownership-delta-explorer"
      data-active-stage={activeStepId}
      data-interactive-ready="true"
    >
      <header className="namespace-ownership-story-header">
        <p>{t.kicker}</p>
        <h3 id={titleId}>{t.title}</h3>
        <span id={introId}>{t.intro}</span>
      </header>

      <div className="namespace-ownership-workspace">
        <div className="namespace-ownership-command-column">
          <ol
            ref={commandListRef}
            aria-label={t.commandList}
            aria-describedby={commandHelpId}
          >
            {ownershipStoryStepIds.map((stepId, index) => {
              const step = t.steps[index];
              const snapshot = getOwnershipStorySnapshot(stepId);
              const active = index === activeIndex;
              return (
                <li
                  key={stepId}
                  data-ownership-stage={stepId}
                  data-stage-state={active ? "active" : "idle"}
                >
                  <button
                    type="button"
                    aria-current={active ? "step" : undefined}
                    aria-label={`${index + 1} of ${ownershipStoryStepIds.length}: ${step.label}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => selectStep(index)}
                    onKeyDown={(event) => handleCommandKeyDown(event, index)}
                  >
                    <span>{step.index}</span>
                    <strong>{step.label}</strong>
                    <code>{snapshot.command}</code>
                  </button>
                </li>
              );
            })}
          </ol>
          <p id={commandHelpId}>{t.commandHelp}</p>
        </div>

        <div className="namespace-ownership-comparison">
          <SnapshotScene
            copy={t}
            side="before"
            snapshot={beforeSnapshot}
            delta={delta}
            announcement={beforeStepCopy.announcement}
          />
          <ArrowRightIcon
            className="namespace-ownership-comparison-arrow"
            aria-hidden="true"
            weight="bold"
          />
          <SnapshotScene
            copy={t}
            side="after"
            snapshot={activeSnapshot}
            delta={delta}
            announcement={activeStepCopy.announcement}
          />
        </div>
      </div>

      <div className="namespace-ownership-delta-table" role="table" aria-label={t.deltaTable}>
        <div className="namespace-ownership-delta-header" role="row">
          <span role="columnheader">{t.object}</span>
          <span role="columnheader">{t.before}</span>
          <span role="columnheader">{t.after}</span>
          <span role="columnheader">{t.why}</span>
        </div>
        {deltaRows.map((row) => (
          <DeltaRow
            copy={t}
            row={row}
            kind={getDeltaKind(delta, row.objectId)}
            key={row.objectId}
          />
        ))}
      </div>

      <div className="namespace-ownership-invariant">
        <strong>{activeStepCopy.summary}</strong>
        <p>{activeStepCopy.invariant}</p>
      </div>

      <figcaption>
        <span>{t.kicker}</span>
        <p><code>{activeSnapshot.command}</code> — {activeStepCopy.summary}</p>
      </figcaption>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {activeStepCopy.announcement}
      </p>
    </figure>
  );
}
