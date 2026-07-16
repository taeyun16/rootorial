export const networkNamespaceIds = ["host", "app", "data"] as const;

export type NetworkNamespaceId = typeof networkNamespaceIds[number];

export type NamespaceInterface = {
  id: string;
  name: string;
  namespaceId: NetworkNamespaceId;
  kind: "loopback" | "ethernet";
  up: boolean;
};

export type NamespaceProcess = {
  id: string;
  label: string;
  namespaceId: NetworkNamespaceId;
};

export type NamespaceListener = {
  id: string;
  processId: string;
  namespaceId: NetworkNamespaceId;
  address: "127.0.0.1" | "0.0.0.0";
  port: number;
};

export type NamespaceMachine = {
  interfaces: readonly NamespaceInterface[];
  processes: readonly NamespaceProcess[];
  listeners: readonly NamespaceListener[];
};

export type LoopbackConnectionReason =
  | "connected"
  | "source-process-missing"
  | "loopback-down"
  | "connection-refused";

export type LoopbackConnectionResult = {
  ok: boolean;
  reason: LoopbackConnectionReason;
  sourceNamespaceId: NetworkNamespaceId | null;
  listener: NamespaceListener | null;
};

export type NamespaceTopologyDraft = {
  appProcessNamespace: NetworkNamespaceId;
  dataProcessNamespace: NetworkNamespaceId;
  appProbeNamespace: NetworkNamespaceId;
  dataProbeNamespace: NetworkNamespaceId;
  appListenerNamespace: NetworkNamespaceId;
  dataListenerNamespace: NetworkNamespaceId;
  appLoopbackUp: boolean;
  dataLoopbackUp: boolean;
};

export type NamespaceTopologyCheckId =
  | "separate-service-boundaries"
  | "app-local-health"
  | "data-local-health"
  | "host-localhost-empty"
  | "app-localhost-cannot-see-data";

export type NamespaceTopologyEvaluation = {
  passed: boolean;
  checks: Readonly<Record<NamespaceTopologyCheckId, boolean>>;
  appHealth: LoopbackConnectionResult;
  dataHealth: LoopbackConnectionResult;
  hostLocal8080: LoopbackConnectionResult;
  hostLocal5432: LoopbackConnectionResult;
  appLocal5432: LoopbackConnectionResult;
  machine: NamespaceMachine;
};

export const namespaceTopologyPresets = {
  collapsed: {
    appProcessNamespace: "host",
    dataProcessNamespace: "host",
    appProbeNamespace: "host",
    dataProbeNamespace: "host",
    appListenerNamespace: "host",
    dataListenerNamespace: "host",
    appLoopbackUp: false,
    dataLoopbackUp: false,
  },
  "isolated-but-down": {
    appProcessNamespace: "app",
    dataProcessNamespace: "data",
    appProbeNamespace: "app",
    dataProbeNamespace: "data",
    appListenerNamespace: "app",
    dataListenerNamespace: "data",
    appLoopbackUp: false,
    dataLoopbackUp: false,
  },
  "working-boundaries": {
    appProcessNamespace: "app",
    dataProcessNamespace: "data",
    appProbeNamespace: "app",
    dataProbeNamespace: "data",
    appListenerNamespace: "app",
    dataListenerNamespace: "data",
    appLoopbackUp: true,
    dataLoopbackUp: true,
  },
} as const satisfies Record<string, NamespaceTopologyDraft>;

function cloneListener(listener: NamespaceListener): NamespaceListener {
  return { ...listener };
}

function cloneMachine(machine: NamespaceMachine): NamespaceMachine {
  return {
    interfaces: machine.interfaces.map((networkInterface) => ({ ...networkInterface })),
    processes: machine.processes.map((process) => ({ ...process })),
    listeners: machine.listeners.map(cloneListener),
  };
}

export function createNamespaceMachine(draft: NamespaceTopologyDraft): NamespaceMachine {
  return {
    interfaces: [
      { id: "host-lo", name: "lo", namespaceId: "host", kind: "loopback", up: true },
      { id: "app-lo", name: "lo", namespaceId: "app", kind: "loopback", up: draft.appLoopbackUp },
      { id: "data-lo", name: "lo", namespaceId: "data", kind: "loopback", up: draft.dataLoopbackUp },
    ],
    processes: [
      { id: "host-probe", label: "host probe", namespaceId: "host" },
      { id: "app-service", label: "app service", namespaceId: draft.appProcessNamespace },
      { id: "data-service", label: "data service", namespaceId: draft.dataProcessNamespace },
      { id: "app-probe", label: "app health probe", namespaceId: draft.appProbeNamespace },
      { id: "data-probe", label: "data health probe", namespaceId: draft.dataProbeNamespace },
      { id: "app-local-5432-probe", label: "app localhost:5432 probe", namespaceId: draft.appProcessNamespace },
    ],
    listeners: [
      {
        id: "app-listener",
        processId: "app-service",
        namespaceId: draft.appListenerNamespace,
        address: "127.0.0.1",
        port: 8080,
      },
      {
        id: "data-listener",
        processId: "data-service",
        namespaceId: draft.dataListenerNamespace,
        address: "127.0.0.1",
        port: 5432,
      },
    ],
  };
}

export function evaluateLoopbackConnection(
  machine: NamespaceMachine,
  sourceProcessId: string,
  port: number,
): LoopbackConnectionResult {
  const process = machine.processes.find((candidate) => candidate.id === sourceProcessId);
  if (!process) {
    return { ok: false, reason: "source-process-missing", sourceNamespaceId: null, listener: null };
  }
  const loopback = machine.interfaces.find(
    (candidate) => candidate.namespaceId === process.namespaceId && candidate.kind === "loopback",
  );
  if (!loopback?.up) {
    return {
      ok: false,
      reason: "loopback-down",
      sourceNamespaceId: process.namespaceId,
      listener: null,
    };
  }
  const listener = machine.listeners.find(
    (candidate) => candidate.namespaceId === process.namespaceId
      && candidate.port === port
      && (candidate.address === "127.0.0.1" || candidate.address === "0.0.0.0"),
  );
  if (!listener) {
    return {
      ok: false,
      reason: "connection-refused",
      sourceNamespaceId: process.namespaceId,
      listener: null,
    };
  }
  return {
    ok: true,
    reason: "connected",
    sourceNamespaceId: process.namespaceId,
    listener: cloneListener(listener),
  };
}

export function evaluateNamespaceTopology(
  draft: NamespaceTopologyDraft,
): NamespaceTopologyEvaluation {
  const machine = createNamespaceMachine(draft);
  const appHealth = evaluateLoopbackConnection(machine, "app-probe", 8080);
  const dataHealth = evaluateLoopbackConnection(machine, "data-probe", 5432);
  const hostLocal8080 = evaluateLoopbackConnection(machine, "host-probe", 8080);
  const hostLocal5432 = evaluateLoopbackConnection(machine, "host-probe", 5432);
  const appLocal5432 = evaluateLoopbackConnection(machine, "app-local-5432-probe", 5432);
  const separateServiceBoundaries = draft.appProcessNamespace === "app"
    && draft.dataProcessNamespace === "data"
    && draft.appListenerNamespace === "app"
    && draft.dataListenerNamespace === "data";
  const checks: Record<NamespaceTopologyCheckId, boolean> = {
    "separate-service-boundaries": separateServiceBoundaries,
    "app-local-health": appHealth.ok && appHealth.listener?.id === "app-listener",
    "data-local-health": dataHealth.ok && dataHealth.listener?.id === "data-listener",
    "host-localhost-empty": !hostLocal8080.ok && !hostLocal5432.ok,
    "app-localhost-cannot-see-data": !appLocal5432.ok,
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    appHealth,
    dataHealth,
    hostLocal8080,
    hostLocal5432,
    appLocal5432,
    machine: cloneMachine(machine),
  };
}

export type NamespaceInspection = {
  namespaceId: NetworkNamespaceId;
  interfaces: readonly NamespaceInterface[];
  listeners: readonly NamespaceListener[];
};

export function inspectNetworkNamespace(
  machine: NamespaceMachine,
  namespaceId: NetworkNamespaceId,
): NamespaceInspection {
  return {
    namespaceId,
    interfaces: machine.interfaces
      .filter((candidate) => candidate.namespaceId === namespaceId)
      .map((candidate) => ({ ...candidate })),
    listeners: machine.listeners
      .filter((candidate) => candidate.namespaceId === namespaceId)
      .map(cloneListener),
  };
}

export type NamespaceIncidentId =
  | "wrong-inspection-context"
  | "loopback-down"
  | "socket-created-before-setns"
  | "wildcard-stays-local";

export type NamespaceIncidentRepair =
  | "inspect-app"
  | "inspect-host"
  | "bring-app-loopback-up"
  | "move-probe-host"
  | "recreate-listener-in-app"
  | "enable-host-loopback"
  | "run-probe-in-app"
  | "bind-wildcard-on-host";

export type NamespaceIncidentFixture = {
  id: NamespaceIncidentId;
  machine: NamespaceMachine;
  observerNamespace: NetworkNamespaceId;
  repairOptions: readonly NamespaceIncidentRepair[];
};

function incidentBaseMachine(values: {
  appLoopbackUp?: boolean;
  appProcessNamespace?: NetworkNamespaceId;
  appListenerNamespace?: NetworkNamespaceId;
  appListenerAddress?: "127.0.0.1" | "0.0.0.0";
} = {}): NamespaceMachine {
  const draft: NamespaceTopologyDraft = {
    ...namespaceTopologyPresets["working-boundaries"],
    appProcessNamespace: values.appProcessNamespace ?? "app",
    appListenerNamespace: values.appListenerNamespace ?? "app",
    appLoopbackUp: values.appLoopbackUp ?? true,
  };
  const machine = createNamespaceMachine(draft);
  return {
    ...machine,
    listeners: machine.listeners.map((listener) => listener.id === "app-listener"
      ? { ...listener, address: values.appListenerAddress ?? listener.address }
      : { ...listener }),
  };
}

export const namespaceIncidentFixtures: Readonly<Record<NamespaceIncidentId, NamespaceIncidentFixture>> = {
  "wrong-inspection-context": {
    id: "wrong-inspection-context",
    machine: incidentBaseMachine(),
    observerNamespace: "host",
    repairOptions: ["inspect-app", "inspect-host"],
  },
  "loopback-down": {
    id: "loopback-down",
    machine: incidentBaseMachine({ appLoopbackUp: false }),
    observerNamespace: "app",
    repairOptions: ["bring-app-loopback-up", "move-probe-host"],
  },
  "socket-created-before-setns": {
    id: "socket-created-before-setns",
    machine: incidentBaseMachine({ appListenerNamespace: "host" }),
    observerNamespace: "app",
    repairOptions: ["recreate-listener-in-app", "enable-host-loopback"],
  },
  "wildcard-stays-local": {
    id: "wildcard-stays-local",
    machine: incidentBaseMachine({ appListenerAddress: "0.0.0.0" }),
    observerNamespace: "host",
    repairOptions: ["run-probe-in-app", "bind-wildcard-on-host"],
  },
};

export type NamespaceIncidentEvaluation = {
  passed: boolean;
  incidentId: NamespaceIncidentId;
  repair: NamespaceIncidentRepair;
  reason:
    | "target-listener-observed"
    | "loopback-restored"
    | "listener-recreated-in-target"
    | "wildcard-confirmed-namespace-local"
    | "wrong-observation-scope"
    | "loopback-still-down"
    | "listener-still-in-host"
    | "wildcard-does-not-cross-namespaces";
  connection: LoopbackConnectionResult | null;
  inspection: NamespaceInspection | null;
};

export function evaluateNamespaceIncident(
  incidentId: NamespaceIncidentId,
  repair: NamespaceIncidentRepair,
): NamespaceIncidentEvaluation {
  const fixture = namespaceIncidentFixtures[incidentId];
  let machine = cloneMachine(fixture.machine);

  if (incidentId === "wrong-inspection-context") {
    const namespaceId = repair === "inspect-app" ? "app" : "host";
    const inspection = inspectNetworkNamespace(machine, namespaceId);
    const passed = inspection.listeners.some((listener) => listener.id === "app-listener");
    return {
      passed,
      incidentId,
      repair,
      reason: passed ? "target-listener-observed" : "wrong-observation-scope",
      connection: null,
      inspection,
    };
  }

  if (incidentId === "loopback-down") {
    if (repair === "bring-app-loopback-up") {
      machine = {
        ...machine,
        interfaces: machine.interfaces.map((candidate) =>
          candidate.id === "app-lo" ? { ...candidate, up: true } : { ...candidate }),
      };
    }
    if (repair === "move-probe-host") {
      machine = {
        ...machine,
        processes: machine.processes.map((candidate) =>
          candidate.id === "app-probe" ? { ...candidate, namespaceId: "host" } : { ...candidate }),
      };
    }
    const connection = evaluateLoopbackConnection(machine, "app-probe", 8080);
    const passed = connection.ok && connection.sourceNamespaceId === "app";
    return {
      passed,
      incidentId,
      repair,
      reason: passed ? "loopback-restored" : "loopback-still-down",
      connection,
      inspection: inspectNetworkNamespace(machine, "app"),
    };
  }

  if (incidentId === "socket-created-before-setns") {
    if (repair === "recreate-listener-in-app") {
      machine = {
        ...machine,
        listeners: machine.listeners.map((candidate) =>
          candidate.id === "app-listener" ? { ...candidate, namespaceId: "app" } : { ...candidate }),
      };
    }
    const connection = evaluateLoopbackConnection(machine, "app-probe", 8080);
    const hostConnection = evaluateLoopbackConnection(machine, "host-probe", 8080);
    const passed = connection.ok && !hostConnection.ok;
    return {
      passed,
      incidentId,
      repair,
      reason: passed ? "listener-recreated-in-target" : "listener-still-in-host",
      connection,
      inspection: inspectNetworkNamespace(machine, "app"),
    };
  }

  const sourceProcessId = repair === "run-probe-in-app" ? "app-probe" : "host-probe";
  const connection = evaluateLoopbackConnection(machine, sourceProcessId, 8080);
  const hostConnection = evaluateLoopbackConnection(machine, "host-probe", 8080);
  const passed = repair === "run-probe-in-app" && connection.ok && !hostConnection.ok;
  return {
    passed,
    incidentId,
    repair,
    reason: passed ? "wildcard-confirmed-namespace-local" : "wildcard-does-not-cross-namespaces",
    connection,
    inspection: inspectNetworkNamespace(machine, repair === "run-probe-in-app" ? "app" : "host"),
  };
}

export function canCompleteNetworkNamespacesChapter(state: {
  topologyLabComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return state.topologyLabComplete && state.incidentsComplete && state.conceptsMastered;
}
