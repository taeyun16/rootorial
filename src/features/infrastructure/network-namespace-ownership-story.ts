import type { NetworkNamespaceId } from "./network-namespaces";

export const ownershipStoryStepIds = [
  "separate-views",
  "interface-moves",
  "thread-enters-app",
  "socket-created-in-app",
] as const;

export type OwnershipStoryStepId = typeof ownershipStoryStepIds[number];
export type OwnershipStoryNamespaceId = Extract<NetworkNamespaceId, "host" | "app">;
export type OwnershipStoryPlayback = "idle" | "playing" | "paused" | "complete";

export type OwnershipStoryObjectId =
  | "interface"
  | "thread"
  | "host-listener"
  | "app-listener";

export type OwnershipStoryObjectKind = "interface" | "thread" | "socket";

export type OwnershipStoryDeltaRow = {
  objectId: OwnershipStoryObjectId;
  objectKind: OwnershipStoryObjectKind;
  beforeOwner: OwnershipStoryNamespaceId | null;
  afterOwner: OwnershipStoryNamespaceId | null;
};

export type OwnershipStoryDelta = {
  stepId: OwnershipStoryStepId;
  previousStepId: OwnershipStoryStepId | null;
  changedRows: readonly OwnershipStoryDeltaRow[];
  preservedRows: readonly OwnershipStoryDeltaRow[];
  createdRows: readonly OwnershipStoryDeltaRow[];
};

export type OwnershipStoryListener = {
  id: "host-listener" | "app-listener";
  namespaceId: OwnershipStoryNamespaceId;
  createdIn: OwnershipStoryNamespaceId;
  endpoint: "127.0.0.1:8080";
};

export type OwnershipStorySnapshot = {
  stepId: OwnershipStoryStepId;
  threadNamespace: OwnershipStoryNamespaceId;
  interfaceNamespace: OwnershipStoryNamespaceId;
  listeners: readonly OwnershipStoryListener[];
  tables: Readonly<Record<OwnershipStoryNamespaceId, {
    route: "route A" | "route B";
    neighbor: "neighbor A" | "neighbor B";
  }>>;
  activeActor: "views" | "interface" | "thread" | "app-listener";
  command: string;
};

const tables = {
  host: { route: "route A", neighbor: "neighbor A" },
  app: { route: "route B", neighbor: "neighbor B" },
} as const;

const hostListener = {
  id: "host-listener",
  namespaceId: "host",
  createdIn: "host",
  endpoint: "127.0.0.1:8080",
} as const satisfies OwnershipStoryListener;

export const ownershipStorySnapshots: Readonly<Record<
  OwnershipStoryStepId,
  OwnershipStorySnapshot
>> = {
  "separate-views": {
    stepId: "separate-views",
    threadNamespace: "host",
    interfaceNamespace: "host",
    listeners: [hostListener],
    tables,
    activeActor: "views",
    command: "host$ ss -lnt\napp$ ss -lnt",
  },
  "interface-moves": {
    stepId: "interface-moves",
    threadNamespace: "host",
    interfaceNamespace: "app",
    listeners: [hostListener],
    tables,
    activeActor: "interface",
    command: "ip link set eth-app netns app",
  },
  "thread-enters-app": {
    stepId: "thread-enters-app",
    threadNamespace: "app",
    interfaceNamespace: "app",
    listeners: [hostListener],
    tables,
    activeActor: "thread",
    command: "setns(app)",
  },
  "socket-created-in-app": {
    stepId: "socket-created-in-app",
    threadNamespace: "app",
    interfaceNamespace: "app",
    listeners: [
      hostListener,
      {
        id: "app-listener",
        namespaceId: "app",
        createdIn: "app",
        endpoint: "127.0.0.1:8080",
      },
    ],
    tables,
    activeActor: "app-listener",
    command: "socket(); bind(127.0.0.1:8080); listen()",
  },
};

const ownershipStoryObjects = [
  { objectId: "interface", objectKind: "interface" },
  { objectId: "thread", objectKind: "thread" },
  { objectId: "host-listener", objectKind: "socket" },
  { objectId: "app-listener", objectKind: "socket" },
] as const satisfies readonly Pick<
  OwnershipStoryDeltaRow,
  "objectId" | "objectKind"
>[];

function getObjectOwner(
  snapshot: OwnershipStorySnapshot,
  objectId: OwnershipStoryObjectId,
): OwnershipStoryNamespaceId | null {
  if (objectId === "interface") return snapshot.interfaceNamespace;
  if (objectId === "thread") return snapshot.threadNamespace;
  return snapshot.listeners.find(({ id }) => id === objectId)?.namespaceId ?? null;
}

function createDeltaRow(
  object: typeof ownershipStoryObjects[number],
  beforeOwner: OwnershipStoryNamespaceId | null,
  afterOwner: OwnershipStoryNamespaceId | null,
): OwnershipStoryDeltaRow {
  return {
    ...object,
    beforeOwner,
    afterOwner,
  };
}

function createOwnershipStoryDelta(
  stepId: OwnershipStoryStepId,
  previousStepId: OwnershipStoryStepId | null,
): OwnershipStoryDelta {
  const current = ownershipStorySnapshots[stepId];
  const previous = previousStepId === null
    ? null
    : ownershipStorySnapshots[previousStepId];
  const changedRows: OwnershipStoryDeltaRow[] = [];
  const preservedRows: OwnershipStoryDeltaRow[] = [];
  const createdRows: OwnershipStoryDeltaRow[] = [];

  for (const object of ownershipStoryObjects) {
    const afterOwner = getObjectOwner(current, object.objectId);
    const beforeOwner = previous === null
      ? afterOwner
      : getObjectOwner(previous, object.objectId);

    // An object that is absent on both sides has no ownership fact to explain.
    if (beforeOwner === null && afterOwner === null) continue;

    const row = createDeltaRow(object, beforeOwner, afterOwner);
    if (beforeOwner === null) {
      createdRows.push(row);
    } else if (beforeOwner !== afterOwner) {
      changedRows.push(row);
    } else {
      preservedRows.push(row);
    }
  }

  return {
    stepId,
    previousStepId,
    changedRows,
    preservedRows,
    createdRows,
  };
}

export const ownershipStoryDeltas: Readonly<Record<
  OwnershipStoryStepId,
  OwnershipStoryDelta
>> = {
  "separate-views": createOwnershipStoryDelta("separate-views", null),
  "interface-moves": createOwnershipStoryDelta("interface-moves", "separate-views"),
  "thread-enters-app": createOwnershipStoryDelta("thread-enters-app", "interface-moves"),
  "socket-created-in-app": createOwnershipStoryDelta("socket-created-in-app", "thread-enters-app"),
};

export function getOwnershipStorySnapshot(
  stepId: OwnershipStoryStepId,
): OwnershipStorySnapshot {
  return ownershipStorySnapshots[stepId];
}

export function getOwnershipStoryDelta(
  stepId: OwnershipStoryStepId,
): OwnershipStoryDelta {
  return ownershipStoryDeltas[stepId];
}
