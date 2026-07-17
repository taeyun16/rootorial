import {
  networkNamespaceIds,
  type LoopbackConnectionReason,
  type NamespaceTopologyEvaluation,
  type NetworkNamespaceId,
} from "./network-namespaces.ts";

export type NamespaceBoundaryState =
  | "collapsed"
  | "isolated-down"
  | "misconfigured"
  | "working-boundaries";

export type NamespaceGradeState = "not-run" | "passed" | "failed";

export type NamespaceVisualObjectKind = "interface" | "process" | "probe" | "listener";

export type NamespaceVisualObject = {
  id: string;
  kind: NamespaceVisualObjectKind;
  ownerNamespace: NetworkNamespaceId;
  label: string;
  detail: string;
};

export type NamespaceVisualBoundary = {
  id: NetworkNamespaceId;
  loopbackUp: boolean;
  objects: readonly NamespaceVisualObject[];
};

export type NamespaceVisualProbeId =
  | "app-health"
  | "data-health"
  | "host-8080"
  | "host-5432"
  | "app-5432";

export type NamespaceVisualProbeResult = "not-run" | LoopbackConnectionReason;

export type NamespaceVisualProbe = {
  id: NamespaceVisualProbeId;
  sourceNamespace: NetworkNamespaceId;
  port: number;
  computedResult: LoopbackConnectionReason;
  displayedResult: NamespaceVisualProbeResult;
  listenerId: string | null;
};

export type NetworkNamespaceVisualState = {
  boundaryState: NamespaceBoundaryState;
  gradeState: NamespaceGradeState;
  boundaries: readonly NamespaceVisualBoundary[];
  probes: readonly NamespaceVisualProbe[];
  crossNamespacePath: "absent";
};

function processKind(id: string): "process" | "probe" {
  return id.includes("probe") ? "probe" : "process";
}

function boundaryState(evaluation: NamespaceTopologyEvaluation): NamespaceBoundaryState {
  const appLoopback = evaluation.machine.interfaces.find(({ id }) => id === "app-lo");
  const dataLoopback = evaluation.machine.interfaces.find(({ id }) => id === "data-lo");
  const workloadProcesses = evaluation.machine.processes.filter(({ id }) => id !== "host-probe");
  const collapsed = workloadProcesses.every(({ namespaceId }) => namespaceId === "host")
    && evaluation.machine.listeners.every(({ namespaceId }) => namespaceId === "host");
  if (collapsed) return "collapsed";

  const probesHaveExpectedOwners = evaluation.machine.processes.every((process) => {
    if (process.id === "app-probe" || process.id === "app-local-5432-probe") {
      return process.namespaceId === "app";
    }
    if (process.id === "data-probe") return process.namespaceId === "data";
    return true;
  });
  const servicesHaveExpectedOwners = evaluation.checks["separate-service-boundaries"];
  if (
    servicesHaveExpectedOwners
    && probesHaveExpectedOwners
    && (!appLoopback?.up || !dataLoopback?.up)
  ) return "isolated-down";
  if (evaluation.passed) return "working-boundaries";
  return "misconfigured";
}

export function buildNetworkNamespaceVisualState(
  preview: NamespaceTopologyEvaluation,
  gradeState: NamespaceGradeState = "not-run",
): NetworkNamespaceVisualState {
  const boundaries = networkNamespaceIds.map((namespaceId): NamespaceVisualBoundary => {
    const networkInterface = preview.machine.interfaces.find(
      (candidate) => candidate.namespaceId === namespaceId && candidate.kind === "loopback",
    );
    const objects: NamespaceVisualObject[] = [];
    if (networkInterface) {
      objects.push({
        id: networkInterface.id,
        kind: "interface",
        ownerNamespace: namespaceId,
        label: networkInterface.name,
        detail: networkInterface.up ? "up" : "down",
      });
    }
    for (const process of preview.machine.processes.filter(
      (candidate) => candidate.namespaceId === namespaceId,
    )) {
      objects.push({
        id: process.id,
        kind: processKind(process.id),
        ownerNamespace: namespaceId,
        label: process.label,
        detail: "network syscalls",
      });
    }
    for (const listener of preview.machine.listeners.filter(
      (candidate) => candidate.namespaceId === namespaceId,
    )) {
      objects.push({
        id: listener.id,
        kind: "listener",
        ownerNamespace: namespaceId,
        label: `${listener.address}:${listener.port}`,
        detail: "socket table",
      });
    }
    return {
      id: namespaceId,
      loopbackUp: networkInterface?.up ?? false,
      objects,
    };
  });

  const results = [
    ["app-health", preview.appHealth, 8080],
    ["data-health", preview.dataHealth, 5432],
    ["host-8080", preview.hostLocal8080, 8080],
    ["host-5432", preview.hostLocal5432, 5432],
    ["app-5432", preview.appLocal5432, 5432],
  ] as const;
  const probes = results.map(([id, result, port]): NamespaceVisualProbe => ({
    id,
    sourceNamespace: result.sourceNamespaceId ?? "host",
    port,
    computedResult: result.reason,
    displayedResult: gradeState === "not-run" ? "not-run" : result.reason,
    listenerId: result.listener?.id ?? null,
  }));

  return {
    boundaryState: boundaryState(preview),
    gradeState,
    boundaries,
    probes,
    crossNamespacePath: "absent",
  };
}
