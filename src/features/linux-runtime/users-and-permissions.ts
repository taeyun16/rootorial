export type PermissionClass = "owner" | "group" | "other";
export type PermissionBit = "read" | "write" | "execute";
export type PermissionNodeType = "directory" | "file";
export type PermissionTarget = "directory" | "file";
export type PermissionOperation =
  | "read-file"
  | "append-file"
  | "execute-file"
  | "list-directory"
  | "traverse-directory"
  | "create-entry"
  | "delete-file";

export type PermissionIdentity = Readonly<{
  id: string;
  name: string;
  effectiveUid: number;
  effectiveGid: number;
  supplementaryGids: readonly number[];
}>;

export type PermissionNode = Readonly<{
  path: string;
  type: PermissionNodeType;
  ownerUid: number;
  groupGid: number;
  mode: string;
}>;

export type PermissionWorkspace = Readonly<{
  directory: PermissionNode;
  file: PermissionNode;
}>;

export type PermissionCheck = Readonly<{
  path: string;
  nodeType: PermissionNodeType;
  permissionClass: PermissionClass;
  requiredBit: "r" | "w" | "x";
  granted: boolean;
  purpose: "path-search" | "target" | "parent-directory";
}>;

export type PermissionDecision = Readonly<{
  actorId: string;
  operation: PermissionOperation;
  allowed: boolean;
  checks: readonly PermissionCheck[];
  firstFailure: PermissionCheck | null;
}>;

export const permissionGroups = Object.freeze({
  1001: "mina",
  1002: "joon",
  1003: "guest",
  2000: "reviewers",
  3000: "ops",
  4000: "deploy",
} as const);

export const permissionUsers = Object.freeze({
  mina: Object.freeze({
    id: "mina",
    name: "Mina",
    effectiveUid: 1001,
    effectiveGid: 1001,
    supplementaryGids: Object.freeze([2000]),
  }),
  joon: Object.freeze({
    id: "joon",
    name: "Joon",
    effectiveUid: 1002,
    effectiveGid: 1002,
    supplementaryGids: Object.freeze([2000]),
  }),
  guest: Object.freeze({
    id: "guest",
    name: "Guest",
    effectiveUid: 1003,
    effectiveGid: 1003,
    supplementaryGids: Object.freeze([]),
  }),
  runner: Object.freeze({
    id: "runner",
    name: "Runner",
    effectiveUid: 1100,
    effectiveGid: 4000,
    supplementaryGids: Object.freeze([]),
  }),
} as const satisfies Record<string, PermissionIdentity>);

export type PermissionUserId = keyof typeof permissionUsers;

const initialDirectory = Object.freeze({
  path: "/srv/release",
  type: "directory" as const,
  ownerUid: 1001,
  groupGid: 2000,
  mode: "0700",
});

const initialFile = Object.freeze({
  path: "/srv/release/plan.txt",
  type: "file" as const,
  ownerUid: 1001,
  groupGid: 2000,
  mode: "0666",
});

function freezeWorkspace(workspace: PermissionWorkspace): PermissionWorkspace {
  return Object.freeze({
    directory: Object.freeze({ ...workspace.directory }),
    file: Object.freeze({ ...workspace.file }),
  });
}

export function createPermissionWorkspace(): PermissionWorkspace {
  return freezeWorkspace({ directory: initialDirectory, file: initialFile });
}

export const permissionWorkspacePresets = Object.freeze({
  "missing-traversal": createPermissionWorkspace(),
  "deletion-trap": freezeWorkspace({
    directory: { ...initialDirectory, mode: "0770" },
    file: { ...initialFile, mode: "0440" },
  }),
  "world-open": freezeWorkspace({
    directory: { ...initialDirectory, mode: "0777" },
    file: { ...initialFile, mode: "0666" },
  }),
  "wrong-group": freezeWorkspace({
    directory: { ...initialDirectory, mode: "0750" },
    file: { ...initialFile, groupGid: 3000, mode: "0640" },
  }),
});

export type PermissionWorkspacePresetId = keyof typeof permissionWorkspacePresets;

function classIndex(permissionClass: PermissionClass): number {
  if (permissionClass === "owner") return 1;
  if (permissionClass === "group") return 2;
  return 3;
}

export function permissionClassFor(
  actor: PermissionIdentity,
  node: PermissionNode,
): PermissionClass {
  if (actor.effectiveUid === node.ownerUid) return "owner";
  if (
    actor.effectiveGid === node.groupGid
    || actor.supplementaryGids.includes(node.groupGid)
  ) return "group";
  return "other";
}

function digitFor(node: PermissionNode, permissionClass: PermissionClass): number {
  return Number(node.mode[classIndex(permissionClass)] ?? "0");
}

function bitMask(bit: PermissionBit): number {
  if (bit === "read") return 4;
  if (bit === "write") return 2;
  return 1;
}

function bitLetter(bit: PermissionBit): "r" | "w" | "x" {
  if (bit === "read") return "r";
  if (bit === "write") return "w";
  return "x";
}

export function hasPermissionBit(
  actor: PermissionIdentity,
  node: PermissionNode,
  bit: PermissionBit,
): boolean {
  const permissionClass = permissionClassFor(actor, node);
  return (digitFor(node, permissionClass) & bitMask(bit)) !== 0;
}

function check(
  actor: PermissionIdentity,
  node: PermissionNode,
  bit: PermissionBit,
  purpose: PermissionCheck["purpose"],
): PermissionCheck {
  return Object.freeze({
    path: node.path,
    nodeType: node.type,
    permissionClass: permissionClassFor(actor, node),
    requiredBit: bitLetter(bit),
    granted: hasPermissionBit(actor, node, bit),
    purpose,
  });
}

export function evaluatePermission(
  workspace: PermissionWorkspace,
  actor: PermissionIdentity,
  operation: PermissionOperation,
): PermissionDecision {
  const checks: PermissionCheck[] = [];
  const add = (
    node: PermissionNode,
    bit: PermissionBit,
    purpose: PermissionCheck["purpose"],
  ) => checks.push(check(actor, node, bit, purpose));

  if (operation === "list-directory") {
    add(workspace.directory, "read", "target");
  } else if (operation === "traverse-directory") {
    add(workspace.directory, "execute", "target");
  } else if (operation === "create-entry" || operation === "delete-file") {
    add(workspace.directory, "write", "parent-directory");
    add(workspace.directory, "execute", "parent-directory");
  } else {
    add(workspace.directory, "execute", "path-search");
    if (operation === "read-file") add(workspace.file, "read", "target");
    if (operation === "append-file") add(workspace.file, "write", "target");
    if (operation === "execute-file") add(workspace.file, "execute", "target");
  }

  const firstFailure = checks.find(({ granted }) => !granted) ?? null;
  return Object.freeze({
    actorId: actor.id,
    operation,
    allowed: firstFailure === null,
    checks: Object.freeze(checks),
    firstFailure,
  });
}

export function modeTriplets(mode: string) {
  const digits = mode.slice(-3).split("").map(Number);
  return digits.map((digit) => [
    digit & 4 ? "r" : "-",
    digit & 2 ? "w" : "-",
    digit & 1 ? "x" : "-",
  ].join("")) as [string, string, string];
}

export function modeSymbol(node: PermissionNode) {
  return `${node.type === "directory" ? "d" : "-"}${modeTriplets(node.mode).join("")}`;
}

export type ChmodFormat = "octal" | "symbolic";

type ChmodSuccess = Readonly<{
  ok: true;
  mode: string;
  format: ChmodFormat;
}>;

type ChmodFailure = Readonly<{
  ok: false;
  error: "invalid-octal" | "invalid-symbolic";
}>;

export type ChmodResult = ChmodSuccess | ChmodFailure;

const symbolicClause = /^([ugoa]+)([+=-])([rwx]*)$/;

function normalizedMode(value: string): string | null {
  const trimmed = value.trim();
  if (/^[0-7]{3}$/.test(trimmed)) return `0${trimmed}`;
  if (/^0[0-7]{3}$/.test(trimmed)) return trimmed;
  return null;
}

function classesFor(symbols: string): PermissionClass[] {
  if (symbols.includes("a")) return ["owner", "group", "other"];
  const classes: PermissionClass[] = [];
  if (symbols.includes("u")) classes.push("owner");
  if (symbols.includes("g")) classes.push("group");
  if (symbols.includes("o")) classes.push("other");
  return classes;
}

export function applyChmodExpression(currentMode: string, expression: string): ChmodResult {
  const octal = normalizedMode(expression);
  if (octal) return Object.freeze({ ok: true, mode: octal, format: "octal" });
  if (/^[0-9]+$/.test(expression.trim())) {
    return Object.freeze({ ok: false, error: "invalid-octal" });
  }

  const digits = currentMode.slice(-3).split("").map(Number);
  const clauses = expression.trim().split(",");
  if (!expression.trim() || clauses.some((clause) => !symbolicClause.test(clause))) {
    return Object.freeze({ ok: false, error: "invalid-symbolic" });
  }

  for (const clause of clauses) {
    const match = symbolicClause.exec(clause);
    if (!match) return Object.freeze({ ok: false, error: "invalid-symbolic" });
    const [, classes, operator, letters] = match;
    const mask = (letters.includes("r") ? 4 : 0)
      | (letters.includes("w") ? 2 : 0)
      | (letters.includes("x") ? 1 : 0);
    for (const permissionClass of classesFor(classes)) {
      const index = classIndex(permissionClass) - 1;
      if (operator === "+") digits[index] |= mask;
      if (operator === "-") digits[index] &= ~mask;
      if (operator === "=") digits[index] = mask;
    }
  }

  return Object.freeze({
    ok: true,
    mode: `0${digits.join("")}`,
    format: "symbolic",
  });
}

export function chmodWorkspace(
  workspace: PermissionWorkspace,
  target: PermissionTarget,
  expression: string,
): Readonly<{ workspace: PermissionWorkspace; result: ChmodResult }> {
  const result = applyChmodExpression(workspace[target].mode, expression);
  if (!result.ok) return Object.freeze({ workspace, result });
  return Object.freeze({
    workspace: freezeWorkspace({
      ...workspace,
      [target]: { ...workspace[target], mode: result.mode },
    }),
    result,
  });
}

export function permissionLabChmodEvidence(
  before: PermissionWorkspace,
  after: PermissionWorkspace,
  target: PermissionTarget,
  format: ChmodFormat,
) {
  const changed = before[target].mode !== after[target].mode;
  const beforeRead = evaluatePermission(before, permissionUsers.joon, "read-file");
  const afterRead = evaluatePermission(after, permissionUsers.joon, "read-file");
  return Object.freeze({
    symbolicChmodApplied:
      changed
      && format === "symbolic"
      && target === "directory"
      && !beforeRead.allowed
      && beforeRead.firstFailure?.purpose === "path-search"
      && beforeRead.firstFailure.requiredBit === "x"
      && afterRead.allowed,
    octalChmodApplied:
      changed
      && format === "octal"
      && target === "file"
      && after.file.mode === "0640",
  });
}

export function chgrpWorkspace(
  workspace: PermissionWorkspace,
  target: PermissionTarget,
  groupGid: number,
): PermissionWorkspace {
  return freezeWorkspace({
    ...workspace,
    [target]: { ...workspace[target], groupGid },
  });
}

export type ReleasePolicyCheck = Readonly<{
  id: string;
  actorId: PermissionUserId;
  operation: PermissionOperation;
  expected: boolean;
  actual: boolean;
  decision: PermissionDecision;
}>;

const releasePolicy = Object.freeze([
  ["owner-read", "mina", "read-file", true],
  ["owner-append", "mina", "append-file", true],
  ["owner-create", "mina", "create-entry", true],
  ["owner-delete", "mina", "delete-file", true],
  ["reviewer-read", "joon", "read-file", true],
  ["reviewer-list", "joon", "list-directory", true],
  ["reviewer-append-denied", "joon", "append-file", false],
  ["reviewer-create-denied", "joon", "create-entry", false],
  ["reviewer-delete-denied", "joon", "delete-file", false],
  ["guest-read-denied", "guest", "read-file", false],
  ["guest-traverse-denied", "guest", "traverse-directory", false],
  ["guest-list-denied", "guest", "list-directory", false],
  ["owner-execute-denied", "mina", "execute-file", false],
  ["reviewer-execute-denied", "joon", "execute-file", false],
  ["guest-execute-denied", "guest", "execute-file", false],
] as const);

export function evaluateReleasePolicy(workspace: PermissionWorkspace) {
  const checks: ReleasePolicyCheck[] = releasePolicy.map(
    ([id, actorId, operation, expected]) => {
      const decision = evaluatePermission(
        workspace,
        permissionUsers[actorId],
        operation,
      );
      return Object.freeze({
        id,
        actorId,
        operation,
        expected,
        actual: decision.allowed,
        decision,
      });
    },
  );
  const configurationViolations: string[] = [];
  if (workspace.directory.ownerUid !== 1001) configurationViolations.push("directory-owner-not-mina");
  if (workspace.directory.groupGid !== 2000) configurationViolations.push("directory-group-not-reviewers");
  if (workspace.directory.mode !== "0750") configurationViolations.push("directory-mode-not-0750");
  if (workspace.file.ownerUid !== 1001) configurationViolations.push("file-owner-not-mina");
  if (workspace.file.groupGid !== 2000) configurationViolations.push("file-group-not-reviewers");
  if (workspace.file.mode !== "0640") configurationViolations.push("file-mode-not-0640");
  return Object.freeze({
    passed:
      checks.every(({ expected, actual }) => expected === actual)
      && configurationViolations.length === 0,
    checks: Object.freeze(checks),
    failures: Object.freeze(
      checks.filter(({ expected, actual }) => expected !== actual),
    ),
    configurationViolations: Object.freeze(configurationViolations),
  });
}

export type PermissionLabEvidence = Readonly<{
  pathDenialObserved: boolean;
  symbolicChmodApplied: boolean;
  octalChmodApplied: boolean;
  policyPassed: boolean;
}>;

export function canMasterPermissionLab(
  workspace: PermissionWorkspace,
  evidence: PermissionLabEvidence,
) {
  return evidence.pathDenialObserved
    && evidence.symbolicChmodApplied
    && evidence.octalChmodApplied
    && evidence.policyPassed
    && evaluateReleasePolicy(workspace).passed;
}

export const permissionIncidentIds = Object.freeze([
  "missing-traversal",
  "delete-boundary",
  "group-mismatch",
  "deploy-script",
] as const);

export type PermissionIncidentId = typeof permissionIncidentIds[number];

export const permissionIncidentPatchIds = Object.freeze({
  "missing-traversal": Object.freeze([
    "directory-group-execute",
    "file-group-read",
    "directory-group-write",
    "world-open",
  ]),
  "delete-boundary": Object.freeze([
    "directory-group-no-write",
    "file-group-no-write",
    "file-owner-only",
    "world-open",
  ]),
  "group-mismatch": Object.freeze([
    "file-group-reviewers",
    "file-other-read",
    "file-world-write",
    "directory-group-reviewers",
  ]),
  "deploy-script": Object.freeze([
    "script-group-execute-private",
    "script-everyone-execute",
    "script-group-write",
    "script-remove-owner-execute",
  ]),
} as const);

export type PermissionIncidentPatch =
  typeof permissionIncidentPatchIds[PermissionIncidentId][number];

export function createPermissionIncident(id: PermissionIncidentId): PermissionWorkspace {
  if (id === "missing-traversal") {
    return freezeWorkspace({
      directory: { ...initialDirectory, mode: "0740" },
      file: { ...initialFile, mode: "0640" },
    });
  }
  if (id === "delete-boundary") {
    return freezeWorkspace({
      directory: { ...initialDirectory, mode: "0770" },
      file: { ...initialFile, mode: "0440" },
    });
  }
  if (id === "group-mismatch") {
    return freezeWorkspace({
      directory: { ...initialDirectory, mode: "0750" },
      file: { ...initialFile, groupGid: 3000, mode: "0640" },
    });
  }
  return freezeWorkspace({
    directory: { ...initialDirectory, groupGid: 4000, mode: "0750" },
    file: {
      ...initialFile,
      path: "/srv/release/deploy.sh",
      groupGid: 4000,
      mode: "0744",
    },
  });
}

function applyIncidentPatch(
  id: PermissionIncidentId,
  patch: PermissionIncidentPatch,
): PermissionWorkspace {
  let workspace = createPermissionIncident(id);
  if (patch === "directory-group-execute") return chmodWorkspace(workspace, "directory", "g+x").workspace;
  if (patch === "file-group-read") return chmodWorkspace(workspace, "file", "g+r").workspace;
  if (patch === "directory-group-write") return chmodWorkspace(workspace, "directory", "g+w").workspace;
  if (patch === "world-open") {
    workspace = chmodWorkspace(workspace, "directory", "0777").workspace;
    return chmodWorkspace(workspace, "file", "0777").workspace;
  }
  if (patch === "directory-group-no-write") return chmodWorkspace(workspace, "directory", "g-w").workspace;
  if (patch === "file-group-no-write") return chmodWorkspace(workspace, "file", "g-w").workspace;
  if (patch === "file-owner-only") return chmodWorkspace(workspace, "file", "0400").workspace;
  if (patch === "file-group-reviewers") return chgrpWorkspace(workspace, "file", 2000);
  if (patch === "file-other-read") return chmodWorkspace(workspace, "file", "o+r").workspace;
  if (patch === "file-world-write") return chmodWorkspace(workspace, "file", "0666").workspace;
  if (patch === "directory-group-reviewers") return chgrpWorkspace(workspace, "directory", 2000);
  if (patch === "script-group-execute-private") return chmodWorkspace(workspace, "file", "0750").workspace;
  if (patch === "script-everyone-execute") return chmodWorkspace(workspace, "file", "0755").workspace;
  if (patch === "script-group-write") return chmodWorkspace(workspace, "file", "0770").workspace;
  if (patch === "script-remove-owner-execute") return chmodWorkspace(workspace, "file", "0640").workspace;
  return workspace;
}

type IncidentExpectation = Readonly<{
  actorId: PermissionUserId;
  operation: PermissionOperation;
  expected: boolean;
}>;

function incidentExpectations(id: PermissionIncidentId): readonly IncidentExpectation[] {
  if (id === "missing-traversal") {
    return [
      { actorId: "joon", operation: "read-file", expected: true },
      { actorId: "joon", operation: "append-file", expected: false },
      { actorId: "joon", operation: "create-entry", expected: false },
      { actorId: "guest", operation: "read-file", expected: false },
    ];
  }
  if (id === "delete-boundary") {
    return [
      { actorId: "joon", operation: "read-file", expected: true },
      { actorId: "joon", operation: "delete-file", expected: false },
      { actorId: "joon", operation: "create-entry", expected: false },
      { actorId: "guest", operation: "read-file", expected: false },
    ];
  }
  if (id === "group-mismatch") {
    return [
      { actorId: "joon", operation: "read-file", expected: true },
      { actorId: "joon", operation: "append-file", expected: false },
      { actorId: "guest", operation: "read-file", expected: false },
    ];
  }
  return [
    { actorId: "runner", operation: "read-file", expected: true },
    { actorId: "runner", operation: "execute-file", expected: true },
    { actorId: "runner", operation: "append-file", expected: false },
    { actorId: "guest", operation: "read-file", expected: false },
    { actorId: "guest", operation: "execute-file", expected: false },
  ];
}

export function evaluatePermissionIncidentRepair(
  id: PermissionIncidentId,
  patch: PermissionIncidentPatch,
) {
  const workspace = applyIncidentPatch(id, patch);
  const checks = incidentExpectations(id).map((expectation) => {
    const decision = evaluatePermission(
      workspace,
      permissionUsers[expectation.actorId],
      expectation.operation,
    );
    return Object.freeze({
      ...expectation,
      actual: decision.allowed,
      decision,
    });
  });
  const configurationViolations: string[] = [];
  if (id === "group-mismatch") {
    if (workspace.file.groupGid !== 2000) configurationViolations.push("file-group-not-reviewers");
    if (hasPermissionBit(permissionUsers.guest, workspace.file, "read")) {
      configurationViolations.push("file-other-read-overgrant");
    }
    if (hasPermissionBit(permissionUsers.joon, workspace.file, "write")) {
      configurationViolations.push("reviewer-write-overgrant");
    }
  }
  if (id === "deploy-script") {
    if (!hasPermissionBit(permissionUsers.runner, workspace.file, "read")) {
      configurationViolations.push("deploy-group-missing-read");
    }
    if (!hasPermissionBit(permissionUsers.runner, workspace.file, "execute")) {
      configurationViolations.push("deploy-group-missing-execute");
    }
    if (hasPermissionBit(permissionUsers.runner, workspace.file, "write")) {
      configurationViolations.push("deploy-group-write-overgrant");
    }
    if (
      hasPermissionBit(permissionUsers.guest, workspace.file, "read")
      || hasPermissionBit(permissionUsers.guest, workspace.file, "execute")
    ) configurationViolations.push("script-other-overgrant");
  }
  return Object.freeze({
    workspace,
    checks: Object.freeze(checks),
    correct:
      checks.every(({ expected, actual }) => expected === actual)
      && configurationViolations.length === 0,
    missing: Object.freeze(checks.filter(({ expected, actual }) => expected && !actual)),
    overgrants: Object.freeze(checks.filter(({ expected, actual }) => !expected && actual)),
    configurationViolations: Object.freeze(configurationViolations),
  });
}

export function canCompletePermissionsChapter({
  accessLabComplete,
  incidentsComplete,
  conceptsMastered,
}: {
  accessLabComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return accessLabComplete && incidentsComplete && conceptsMastered;
}
