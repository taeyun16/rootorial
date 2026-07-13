import assert from "node:assert/strict";
import test from "node:test";

import {
  createLinuxShellState,
  runLinuxCommand,
  snapshotFilesystem,
} from "../src/features/linux-shell/linuxShell.ts";
import {
  emptyLinuxShellObservations,
  linuxShellTaskState,
  recordLinuxShellObservations,
} from "../src/features/linux-shell/linuxShellMastery.ts";

function run(state, command) {
  return runLinuxCommand(state, command);
}

test("keeps completed observations when clear only erases the visible transcript", () => {
  let state = createLinuxShellState();
  let observations = emptyLinuxShellObservations;

  for (const command of [
    "pwd",
    "cat /etc/os-release",
    "mkdir -p /home/student/lab",
    'echo "absolute paths start at /" > /home/student/lab/notes.txt',
    'echo "change" > /etc/os-release',
  ]) {
    const result = run(state, command);
    state = result.state;
    observations = recordLinuxShellObservations(observations, result);
  }

  assert.deepEqual(
    linuxShellTaskState(observations, snapshotFilesystem(state), true),
    [true, true, true, true, true],
  );

  const clear = run(state, "clear");
  observations = recordLinuxShellObservations(observations, clear);
  assert.equal(clear.clearScreen, true);
  assert.deepEqual(
    linuxShellTaskState(observations, snapshotFilesystem(clear.state), true),
    [true, true, true, true, true],
  );

  assert.deepEqual(
    linuxShellTaskState(
      emptyLinuxShellObservations,
      snapshotFilesystem(createLinuxShellState()),
      true,
    ),
    [false, false, false, false, false],
  );
});

test("records semantic shell evidence instead of trusting lookalike output", () => {
  let state = createLinuxShellState();
  let observations = emptyLinuxShellObservations;

  for (const command of [
    "echo /home/student",
    'echo \'NAME="Rootorial Shell Simulator" ID="rootorial-simulator"\'',
    "mkdir /etc/blocked",
  ]) {
    const result = run(state, command);
    state = result.state;
    observations = recordLinuxShellObservations(observations, result);
  }

  assert.deepEqual(observations, emptyLinuxShellObservations);

  const pwd = run(state, "pwd");
  assert.deepEqual(pwd.evidence, [
    { kind: "printed-working-directory", path: "/home/student" },
  ]);

  const cat = run(state, "cat ../../etc/os-release");
  assert.deepEqual(cat.evidence, [
    { kind: "read-file", path: "/etc/os-release" },
  ]);

  const denied = run(state, 'echo "change" > /etc/os-release');
  assert.deepEqual(denied.evidence, [
    { kind: "write-denied", path: "/etc/os-release" },
  ]);
});

test("starts in the student home with a small inspectable Linux filesystem", () => {
  const state = createLinuxShellState();
  const snapshot = snapshotFilesystem(state);

  assert.equal(state.cwd, "/home/student");
  assert.equal(run(state, "pwd").output, "/home/student");
  assert.equal(run(state, "whoami").output, "student");
  assert.equal(run(state, "uname").output, "Linux");
  assert.match(run(state, "uname -a").output, /wasm32 GNU\/Linux$/);
  assert.match(run(state, "help").output, /mkdir \[-p\]/);

  assert.equal(snapshot["/home/student/readme.txt"].type, "file");
  assert.match(snapshot["/home/student/readme.txt"].content, /shell simulator \(not a real kernel\)/);
  assert.match(snapshot["/etc/os-release"].content, /Rootorial Shell Simulator/);
  assert.match(snapshot["/etc/os-release"].content, /not a real Linux kernel/);
  assert.match(snapshot["/var/log/boot.log"].content, /in-memory teaching filesystem/);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.filesystem), true);
  assert.equal(Object.isFrozen(snapshot), true);
});

test("navigates absolute, relative, home, and previous directories immutably", () => {
  const initial = createLinuxShellState();

  const etc = run(initial, "cd ../../etc");
  assert.equal(etc.exitCode, 0);
  assert.equal(etc.state.cwd, "/etc");
  assert.equal(initial.cwd, "/home/student");
  assert.notStrictEqual(etc.state, initial);

  const previous = run(etc.state, "cd -");
  assert.equal(previous.output, "/home/student");
  assert.equal(previous.state.cwd, "/home/student");

  const root = run(previous.state, "cd /var/log/../..");
  assert.equal(root.state.cwd, "/");

  const home = run(root.state, "cd ~");
  assert.equal(home.state.cwd, "/home/student");

  const fileError = run(home.state, "cd readme.txt");
  assert.equal(fileError.exitCode, 1);
  assert.match(fileError.output, /Not a directory/);
  assert.strictEqual(fileError.state, home.state);
});

test("rejects paths that try to traverse through a regular file", () => {
  const state = createLinuxShellState();

  for (const command of [
    "cd /etc/os-release/..",
    "cat /etc/os-release/../os-release",
  ]) {
    const commandResult = run(state, command);
    assert.equal(commandResult.exitCode, 1, command);
    assert.match(commandResult.output, /Not a directory/, command);
    assert.strictEqual(commandResult.state, state, command);
  }
});

test("lists normal, hidden, and long directory entries", () => {
  let state = createLinuxShellState();
  state = run(state, "touch .profile notes.txt").state;

  const normal = run(state, "ls");
  assert.equal(normal.output.includes(".profile"), false);
  assert.match(normal.output, /notes\.txt/);
  assert.match(normal.output, /readme\.txt/);

  const allLong = run(state, "ls -la");
  assert.match(allLong.output, /drwxr-xr-x.* \.$/m);
  assert.match(allLong.output, /drwxr-xr-x.* \.\.$/m);
  assert.match(allLong.output, /-rw-r--r--.* \.profile$/m);

  const file = run(state, "ls -l readme.txt");
  assert.match(file.output, /-rw-r--r--.* readme\.txt$/);
});

test("creates nested directories and files without mutating earlier snapshots", () => {
  const initial = createLinuxShellState();
  const before = snapshotFilesystem(initial);

  const mkdir = run(initial, 'mkdir -p "course notes"/week-1/labs');
  assert.equal(mkdir.exitCode, 0);
  assert.notStrictEqual(mkdir.state.filesystem, initial.filesystem);

  const touch = run(
    mkdir.state,
    'touch "course notes"/week-1/labs/commands.txt',
  );
  assert.equal(touch.exitCode, 0);

  const after = snapshotFilesystem(touch.state);
  assert.equal(before["/home/student/course notes"], undefined);
  assert.equal(after["/home/student/course notes"].type, "directory");
  assert.equal(
    after["/home/student/course notes/week-1/labs/commands.txt"].content,
    "",
  );
});

test("applies mutating operands in order and preserves earlier side effects", () => {
  const initial = createLinuxShellState();

  const mkdir = run(initial, "mkdir first first/child");
  assert.equal(mkdir.exitCode, 0);
  assert.equal(
    snapshotFilesystem(mkdir.state)["/home/student/first/child"].type,
    "directory",
  );
  assert.equal(snapshotFilesystem(initial)["/home/student/first"], undefined);

  const partialMkdir = run(mkdir.state, "mkdir kept /etc/blocked");
  assert.equal(partialMkdir.exitCode, 1);
  assert.match(partialMkdir.output, /Permission denied/);
  assert.equal(
    snapshotFilesystem(partialMkdir.state)["/home/student/kept"].type,
    "directory",
  );
  assert.equal(snapshotFilesystem(mkdir.state)["/home/student/kept"], undefined);

  const touch = run(partialMkdir.state, "touch good.txt /etc/os-release");
  assert.equal(touch.exitCode, 1);
  assert.match(touch.output, /Permission denied/);
  assert.equal(
    snapshotFilesystem(touch.state)["/home/student/good.txt"].type,
    "file",
  );
  assert.equal(Object.isFrozen(touch.state), true);
  assert.equal(Object.isFrozen(touch.state.filesystem), true);
  assert.equal(
    snapshotFilesystem(partialMkdir.state)["/home/student/good.txt"],
    undefined,
  );

  const remove = run(touch.state, "rm readme.txt missing.txt");
  assert.equal(remove.exitCode, 1);
  assert.match(remove.output, /No such file or directory/);
  assert.equal(
    snapshotFilesystem(remove.state)["/home/student/readme.txt"],
    undefined,
  );
  assert.equal(
    snapshotFilesystem(touch.state)["/home/student/readme.txt"].type,
    "file",
  );
});

test("continues mutating operands after an earlier error", () => {
  const initial = createLinuxShellState();

  const remove = run(initial, "rm missing.txt readme.txt");
  assert.equal(remove.exitCode, 1);
  assert.match(remove.output, /missing\.txt.*No such file or directory/);
  assert.equal(
    snapshotFilesystem(remove.state)["/home/student/readme.txt"],
    undefined,
  );
  assert.equal(
    snapshotFilesystem(initial)["/home/student/readme.txt"].type,
    "file",
  );

  const mkdir = run(initial, "mkdir /etc/blocked made-after-error");
  assert.equal(mkdir.exitCode, 1);
  assert.match(mkdir.output, /Permission denied/);
  assert.equal(
    snapshotFilesystem(mkdir.state)["/home/student/made-after-error"].type,
    "directory",
  );

  const touch = run(
    initial,
    "touch /etc/os-release made-after-error.txt",
  );
  assert.equal(touch.exitCode, 1);
  assert.match(touch.output, /Permission denied/);
  assert.equal(
    snapshotFilesystem(touch.state)["/home/student/made-after-error.txt"].type,
    "file",
  );
  assert.equal(Object.isFrozen(touch.state), true);
  assert.equal(Object.isFrozen(touch.state.filesystem), true);
});

test("cat and ls retain normal output while accumulating operand errors", () => {
  const state = createLinuxShellState();

  const cat = run(state, "cat missing.txt readme.txt /etc");
  assert.equal(cat.exitCode, 1);
  assert.match(cat.output, /missing\.txt: No such file or directory/);
  assert.match(cat.output, /Try: ls, cat readme\.txt/);
  assert.match(cat.output, /\/etc: Is a directory/);
  assert.strictEqual(cat.state, state);

  const ls = run(
    state,
    "ls missing.txt /home/student /etc/os-release/..",
  );
  assert.equal(ls.exitCode, 1);
  assert.match(ls.output, /missing\.txt.*No such file or directory/);
  assert.match(ls.output, /\/home\/student:\nreadme\.txt/);
  assert.match(ls.output, /os-release\/\.\.: Not a directory/);
  assert.strictEqual(ls.state, state);
});

test("trailing slashes require directories for touch and echo redirection", () => {
  const initial = createLinuxShellState();

  const touch = run(initial, "touch fresh/");
  assert.equal(touch.exitCode, 1);
  assert.match(touch.output, /No such file or directory/);
  assert.equal(snapshotFilesystem(touch.state)["/home/student/fresh"], undefined);

  const echo = run(initial, "echo hi > note/");
  assert.equal(echo.exitCode, 1);
  assert.match(echo.output, /No such file or directory/);
  assert.equal(snapshotFilesystem(echo.state)["/home/student/note"], undefined);

  const mkdir = run(initial, "mkdir directory/");
  assert.equal(mkdir.exitCode, 0);
  assert.equal(
    snapshotFilesystem(mkdir.state)["/home/student/directory"].type,
    "directory",
  );
});

test("tokenizes quotes and writes or appends echo output", () => {
  let state = createLinuxShellState();

  let command = run(state, 'echo "hello linux" > lesson.txt');
  assert.equal(command.exitCode, 0);
  assert.equal(command.output, "");
  state = command.state;

  command = run(state, "echo 'second line' >> lesson.txt");
  assert.equal(command.exitCode, 0);
  state = command.state;

  const contents = run(state, "cat lesson.txt");
  assert.equal(contents.output, "hello linux\nsecond line\n");

  const truncate = run(state, "echo -n done > lesson.txt");
  assert.equal(run(truncate.state, "cat lesson.txt").output, "done");

  const quotedOperator = run(state, 'echo "a > b"');
  assert.equal(quotedOperator.output, "a > b");
});

test("enforces root-owned write boundaries while preserving the student lab", () => {
  const initial = createLinuxShellState();
  const before = snapshotFilesystem(initial);

  for (const command of [
    "echo denied > /etc/os-release",
    "echo denied > /owned-at-root",
    "mkdir /owned-at-root",
    "mkdir -p /etc/student-lab",
    "rm /etc/os-release",
  ]) {
    const blocked = run(initial, command);
    assert.equal(blocked.exitCode, 1, command);
    assert.match(blocked.output, /Permission denied/, command);
    assert.strictEqual(blocked.state, initial, command);
  }

  const afterBlocked = snapshotFilesystem(initial);
  assert.deepEqual(afterBlocked, before);
  assert.equal(afterBlocked["/owned-at-root"], undefined);

  let allowed = run(initial, "mkdir -p /home/student/lab");
  assert.equal(allowed.exitCode, 0);
  allowed = run(allowed.state, "echo lesson > /home/student/lab/notes.txt");
  assert.equal(allowed.exitCode, 0);
  assert.equal(
    run(allowed.state, "cat /home/student/lab/notes.txt").output,
    "lesson\n",
  );
  allowed = run(allowed.state, "rm /home/student/lab/notes.txt");
  assert.equal(allowed.exitCode, 0);
  allowed = run(allowed.state, "rm -r /home/student/lab");
  assert.equal(allowed.exitCode, 0);
  assert.equal(snapshotFilesystem(allowed.state)["/home/student/lab"], undefined);
});

test("removes files and recursively removes directories", () => {
  let state = createLinuxShellState();
  state = run(state, "mkdir -p scratch/nested").state;
  state = run(state, "touch scratch/one.txt scratch/nested/two.txt").state;

  const directoryError = run(state, "rm scratch");
  assert.equal(directoryError.exitCode, 1);
  assert.match(directoryError.output, /Is a directory/);
  assert.ok(snapshotFilesystem(directoryError.state)["/home/student/scratch"]);

  const removeFile = run(state, "rm scratch/one.txt");
  assert.equal(
    snapshotFilesystem(removeFile.state)["/home/student/scratch/one.txt"],
    undefined,
  );

  const removeTree = run(removeFile.state, "rm -rf scratch");
  const snapshot = snapshotFilesystem(removeTree.state);
  assert.equal(snapshot["/home/student/scratch"], undefined);
  assert.equal(snapshot["/home/student/scratch/nested/two.txt"], undefined);

  const forceMissing = run(removeTree.state, "rm -f absent.txt");
  assert.equal(forceMissing.exitCode, 0);
  assert.strictEqual(forceMissing.state, removeTree.state);

  for (const command of ["rm -f missing/child", "rm -rf missing/child"]) {
    const forceMissingParent = run(removeTree.state, command);
    assert.equal(forceMissingParent.exitCode, 0, command);
    assert.strictEqual(forceMissingParent.state, removeTree.state, command);
  }

  const forceThroughFile = run(removeTree.state, "rm -f readme.txt/child");
  assert.equal(forceThroughFile.exitCode, 1);
  assert.match(forceThroughFile.output, /Not a directory/);
});

test("reports syntax, path, type, option, and unknown-command errors", () => {
  const state = createLinuxShellState();

  const cases = [
    ["cat missing.txt", 1, /No such file or directory/],
    ["cat /etc", 1, /Is a directory/],
    ["mkdir missing/child", 1, /No such file or directory/],
    ["touch missing/file", 1, /No such file or directory/],
    ["ls -z", 2, /invalid option/],
    ['echo "unterminated', 2, /unterminated quoted string/],
    ["not-a-command", 127, /command not found/],
  ];

  for (const [command, exitCode, message] of cases) {
    const commandResult = run(state, command);
    assert.equal(commandResult.exitCode, exitCode, command);
    assert.match(commandResult.output, message, command);
    assert.strictEqual(commandResult.state, state, command);
  }
});

test("renders a tree and signals terminal clearing without filesystem changes", () => {
  const state = createLinuxShellState();
  const tree = run(state, "tree /home/student");

  assert.equal(tree.exitCode, 0);
  assert.match(tree.output, /^\/home\/student\n/);
  assert.match(tree.output, /└── readme\.txt/);
  assert.match(tree.output, /0 directories, 1 file$/);

  const cleared = run(state, "clear");
  assert.equal(cleared.output, "");
  assert.equal(cleared.exitCode, 0);
  assert.equal(cleared.clearScreen, true);
  assert.strictEqual(cleared.state, state);
});
