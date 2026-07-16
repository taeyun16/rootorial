import assert from "node:assert/strict";
import test from "node:test";
import {
  applyChmodExpression,
  canCompletePermissionsChapter,
  canMasterPermissionLab,
  chmodWorkspace,
  createPermissionIncident,
  createPermissionWorkspace,
  evaluatePermission,
  evaluatePermissionIncidentRepair,
  evaluateReleasePolicy,
  hasPermissionBit,
  modeSymbol,
  permissionClassFor,
  permissionLabChmodEvidence,
  permissionUsers,
} from "../src/features/linux-runtime/users-and-permissions.ts";

test("selects exactly one permission class and includes supplementary groups", () => {
  const ownerAndMember = permissionUsers.mina;
  const groupMember = permissionUsers.joon;
  const node = {
    path: "/srv/release/owner-shadow.txt",
    type: "file",
    ownerUid: 1001,
    groupGid: 2000,
    mode: "0040",
  };

  assert.equal(permissionClassFor(ownerAndMember, node), "owner");
  assert.equal(hasPermissionBit(ownerAndMember, node, "read"), false);
  assert.equal(permissionClassFor(groupMember, node), "group");
  assert.equal(hasPermissionBit(groupMember, node, "read"), true);
  assert.equal(permissionClassFor(permissionUsers.guest, node), "other");
});

test("requires directory search before a readable target file can be opened", () => {
  let workspace = createPermissionWorkspace();
  const denied = evaluatePermission(workspace, permissionUsers.joon, "read-file");
  assert.equal(denied.allowed, false);
  assert.deepEqual(denied.firstFailure, {
    path: "/srv/release",
    nodeType: "directory",
    permissionClass: "group",
    requiredBit: "x",
    granted: false,
    purpose: "path-search",
  });

  const changed = chmodWorkspace(workspace, "directory", "g+rx");
  assert.equal(changed.result.ok, true);
  workspace = changed.workspace;
  assert.equal(workspace.directory.mode, "0750");
  assert.equal(evaluatePermission(workspace, permissionUsers.joon, "read-file").allowed, true);
});

test("models create and unlink from parent write plus search, not file write", () => {
  const workspace = createPermissionIncident("delete-boundary");
  assert.equal(workspace.file.mode, "0440");
  assert.equal(evaluatePermission(workspace, permissionUsers.joon, "delete-file").allowed, true);

  const repaired = chmodWorkspace(workspace, "directory", "g-w").workspace;
  assert.equal(evaluatePermission(repaired, permissionUsers.joon, "read-file").allowed, true);
  const deniedDelete = evaluatePermission(repaired, permissionUsers.joon, "delete-file");
  assert.equal(deniedDelete.allowed, false);
  assert.equal(deniedDelete.firstFailure?.path, "/srv/release");
  assert.equal(deniedDelete.firstFailure?.requiredBit, "w");
});

test("applies bounded symbolic and octal chmod expressions without mutating on errors", () => {
  assert.deepEqual(applyChmodExpression("0700", "g+rx"), {
    ok: true,
    mode: "0750",
    format: "symbolic",
  });
  assert.deepEqual(applyChmodExpression("0666", "640"), {
    ok: true,
    mode: "0640",
    format: "octal",
  });
  assert.deepEqual(applyChmodExpression("0777", "go-rwx,u=rw"), {
    ok: true,
    mode: "0600",
    format: "symbolic",
  });
  assert.deepEqual(applyChmodExpression("0640", "888"), {
    ok: false,
    error: "invalid-octal",
  });
  assert.deepEqual(applyChmodExpression("0640", "g+z"), {
    ok: false,
    error: "invalid-symbolic",
  });
});

test("grades the release policy by required allows and denials rather than a preset id", () => {
  let workspace = createPermissionWorkspace();
  assert.equal(evaluateReleasePolicy(workspace).passed, false);

  workspace = chmodWorkspace(workspace, "directory", "g+rx").workspace;
  workspace = chmodWorkspace(workspace, "file", "0640").workspace;
  assert.equal(modeSymbol(workspace.directory), "drwxr-x---");
  assert.equal(modeSymbol(workspace.file), "-rw-r-----");
  assert.equal(evaluateReleasePolicy(workspace).passed, true);

  const evidence = {
    pathDenialObserved: true,
    symbolicChmodApplied: true,
    octalChmodApplied: true,
    policyPassed: true,
  };
  assert.equal(canMasterPermissionLab(workspace, evidence), true);
  for (const missing of Object.keys(evidence)) {
    assert.equal(canMasterPermissionLab(workspace, { ...evidence, [missing]: false }), false);
  }

  let broad = chmodWorkspace(workspace, "directory", "0777").workspace;
  broad = chmodWorkspace(broad, "file", "0777").workspace;
  assert.equal(evaluateReleasePolicy(broad).passed, false);
  assert.equal(canMasterPermissionLab(broad, evidence), false);

  const hiddenFileOvergrant = chmodWorkspace(workspace, "file", "0647").workspace;
  const hiddenDirectoryOvergrant = chmodWorkspace(workspace, "directory", "0752").workspace;
  assert.deepEqual(evaluateReleasePolicy(hiddenFileOvergrant).configurationViolations, [
    "file-mode-not-0640",
  ]);
  assert.deepEqual(evaluateReleasePolicy(hiddenDirectoryOvergrant).configurationViolations, [
    "directory-mode-not-0750",
  ]);
  assert.equal(evaluateReleasePolicy(hiddenFileOvergrant).passed, false);
  assert.equal(evaluateReleasePolicy(hiddenDirectoryOvergrant).passed, false);
  assert.equal(canMasterPermissionLab(hiddenFileOvergrant, evidence), false);
  assert.equal(canMasterPermissionLab(hiddenDirectoryOvergrant, evidence), false);
});

test("records only causal symbolic and target octal chmod evidence", () => {
  const initial = createPermissionWorkspace();
  const openedPath = chmodWorkspace(initial, "directory", "g+x").workspace;
  assert.deepEqual(
    permissionLabChmodEvidence(initial, openedPath, "directory", "symbolic"),
    { symbolicChmodApplied: true, octalChmodApplied: false },
  );

  const noOpDirectory = chmodWorkspace(openedPath, "directory", "u+r").workspace;
  assert.deepEqual(
    permissionLabChmodEvidence(openedPath, noOpDirectory, "directory", "symbolic"),
    { symbolicChmodApplied: false, octalChmodApplied: false },
  );
  assert.deepEqual(
    permissionLabChmodEvidence(initial, initial, "directory", "octal"),
    { symbolicChmodApplied: false, octalChmodApplied: false },
  );

  const minimizedFile = chmodWorkspace(openedPath, "file", "0640").workspace;
  assert.deepEqual(
    permissionLabChmodEvidence(openedPath, minimizedFile, "file", "octal"),
    { symbolicChmodApplied: false, octalChmodApplied: true },
  );
  const broadFile = chmodWorkspace(openedPath, "file", "0644").workspace;
  assert.deepEqual(
    permissionLabChmodEvidence(openedPath, broadFile, "file", "octal"),
    { symbolicChmodApplied: false, octalChmodApplied: false },
  );
});

test("repairs four permission incidents from access semantics and rejects overgrants", () => {
  assert.equal(
    evaluatePermissionIncidentRepair("missing-traversal", "directory-group-execute").correct,
    true,
  );
  assert.equal(
    evaluatePermissionIncidentRepair("missing-traversal", "world-open").correct,
    false,
  );
  assert.ok(
    evaluatePermissionIncidentRepair("missing-traversal", "world-open").overgrants.length > 0,
  );
  assert.equal(
    evaluatePermissionIncidentRepair("delete-boundary", "directory-group-no-write").correct,
    true,
  );
  assert.equal(
    evaluatePermissionIncidentRepair("delete-boundary", "file-group-no-write").correct,
    false,
  );
  assert.equal(
    evaluatePermissionIncidentRepair("group-mismatch", "file-group-reviewers").correct,
    true,
  );
  assert.equal(
    evaluatePermissionIncidentRepair("group-mismatch", "file-other-read").correct,
    false,
  );
  assert.equal(
    evaluatePermissionIncidentRepair("deploy-script", "script-group-execute-private").correct,
    true,
  );
  assert.equal(
    evaluatePermissionIncidentRepair("deploy-script", "script-everyone-execute").correct,
    false,
  );
});

test("requires the access lab, all incidents, and concepts for chapter completion", () => {
  const complete = {
    accessLabComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompletePermissionsChapter(complete), true);
  for (const missing of Object.keys(complete)) {
    assert.equal(canCompletePermissionsChapter({ ...complete, [missing]: false }), false);
  }
});
