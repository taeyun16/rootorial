export type LinuxFilesystemEntry =
  | Readonly<{
      type: "directory";
      mode: string;
      owner: string;
    }>
  | Readonly<{
      type: "file";
      mode: string;
      owner: string;
      content: string;
    }>;

export type LinuxFilesystem = Readonly<Record<string, LinuxFilesystemEntry>>;

export type LinuxShellState = Readonly<{
  cwd: string;
  previousCwd: string;
  home: string;
  username: string;
  hostname: string;
  filesystem: LinuxFilesystem;
}>;

export type LinuxCommandEvidence =
  | Readonly<{ kind: "printed-working-directory"; path: string }>
  | Readonly<{ kind: "read-file"; path: string }>
  | Readonly<{ kind: "write-denied"; path: string }>;

export type LinuxCommandResult = Readonly<{
  state: LinuxShellState;
  output: string;
  exitCode: number;
  clearScreen: boolean;
  evidence: readonly LinuxCommandEvidence[];
}>;

export type LinuxFilesystemSnapshotEntry =
  | Readonly<{
      type: "directory";
      mode: string;
      owner: string;
    }>
  | Readonly<{
      type: "file";
      mode: string;
      owner: string;
      content: string;
    }>;

export type LinuxFilesystemSnapshot = Readonly<
  Record<string, LinuxFilesystemSnapshotEntry>
>;

type MutableFilesystem = Record<string, LinuxFilesystemEntry>;

type ShellToken =
  | Readonly<{ kind: "word"; value: string }>
  | Readonly<{ kind: "redirect"; value: ">" | ">>" }>;

type TokenizeResult =
  | Readonly<{ tokens: readonly ShellToken[] }>
  | Readonly<{ error: string }>;

class ShellPathResolutionError extends Error {
  readonly operand: string;
  readonly reason: "No such file or directory" | "Not a directory";

  constructor(
    operand: string,
    reason: "No such file or directory" | "Not a directory",
  ) {
    super(reason);
    this.name = "ShellPathResolutionError";
    this.operand = operand;
    this.reason = reason;
  }
}

const FIXED_LISTING_DATE = "Jul 13 00:00";

const HELP_OUTPUT = [
  "Available commands:",
  "  help                     Show this command list",
  "  pwd                      Print the current directory",
  "  ls [-a] [-l] [path]      List files and directories",
  "  cd [path|~|-]            Change the current directory",
  "  cat file...              Print file contents",
  "  mkdir [-p] directory...  Create directories",
  "  touch file...            Create empty files",
  "  echo text [> file]       Print or write text (>> appends)",
  "  rm [-r] [-f] path...     Remove files or directories",
  "  clear                    Clear the terminal",
  "  whoami                   Print the current user",
  "  uname [-a|-s|-n|-r|-m]   Print system information",
  "  tree [path]              Display the filesystem tree",
].join("\n");

function directoryEntry(owner = "root"): LinuxFilesystemEntry {
  return Object.freeze({
    type: "directory" as const,
    mode: "drwxr-xr-x",
    owner,
  });
}

function fileEntry(content: string, owner = "root"): LinuxFilesystemEntry {
  return Object.freeze({
    type: "file" as const,
    mode: "-rw-r--r--",
    owner,
    content,
  });
}

function freezeFilesystem(filesystem: MutableFilesystem): LinuxFilesystem {
  return Object.freeze(filesystem);
}

function freezeState(state: {
  cwd: string;
  previousCwd: string;
  home: string;
  username: string;
  hostname: string;
  filesystem: LinuxFilesystem;
}): LinuxShellState {
  return Object.freeze(state);
}

function result(
  state: LinuxShellState,
  output = "",
  exitCode = 0,
  clearScreen = false,
  evidence: readonly LinuxCommandEvidence[] = [],
): LinuxCommandResult {
  return Object.freeze({
    state,
    output,
    exitCode,
    clearScreen,
    evidence: Object.freeze([...evidence]),
  });
}

function errorResult(
  state: LinuxShellState,
  output: string,
  exitCode = 1,
  evidence: readonly LinuxCommandEvidence[] = [],
): LinuxCommandResult {
  return result(state, output, exitCode, false, evidence);
}

function compareNames(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function basename(path: string): string {
  if (path === "/") return "/";
  return path.slice(path.lastIndexOf("/") + 1);
}

function parentPath(path: string): string {
  if (path === "/") return "/";
  const separator = path.lastIndexOf("/");
  return separator <= 0 ? "/" : path.slice(0, separator);
}

function expandHome(input: string, home: string): string {
  let candidate = input;
  if (candidate === "~") {
    candidate = home;
  } else if (candidate.startsWith("~/")) {
    candidate = `${home}/${candidate.slice(2)}`;
  }

  return candidate;
}

function resolvePath(
  state: LinuxShellState,
  input: string,
  options: Readonly<{
    allowMissingIntermediates?: boolean;
    allowMissingTrailingDirectory?: boolean;
    filesystem?: LinuxFilesystem;
  }> = {},
): string {
  const candidate = expandHome(input, state.home);
  const filesystem = options.filesystem ?? state.filesystem;

  const absolute = candidate.startsWith("/")
    ? candidate
    : `${state.cwd}/${candidate}`;
  const segments: string[] = [];

  for (const segment of absolute.split("/")) {
    if (!segment) continue;

    const current = `/${segments.join("/")}`;
    const currentEntry = filesystem[current];
    if (currentEntry?.type === "file") {
      throw new ShellPathResolutionError(input, "Not a directory");
    }
    if (
      !currentEntry &&
      current !== "/" &&
      !options.allowMissingIntermediates
    ) {
      throw new ShellPathResolutionError(input, "No such file or directory");
    }

    if (segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const path = `/${segments.join("/")}`;
  if (absolute.endsWith("/") && path !== "/") {
    const trailingEntry = filesystem[path];
    if (trailingEntry?.type === "file") {
      throw new ShellPathResolutionError(input, "Not a directory");
    }
    if (!trailingEntry && !options.allowMissingTrailingDirectory) {
      throw new ShellPathResolutionError(input, "No such file or directory");
    }
  }
  return path;
}

function hasPermission(
  state: LinuxShellState,
  entry: LinuxFilesystemEntry,
  permission: "write" | "execute",
): boolean {
  if (state.username === "root") return true;

  const ownerMatches = entry.owner === state.username;
  const bits = entry.mode.slice(ownerMatches ? 1 : 7, ownerMatches ? 4 : 10);
  if (permission === "write") return bits[1] === "w";
  return bits[2] === "x" || bits[2] === "t";
}

function canModifyDirectory(
  state: LinuxShellState,
  filesystem: LinuxFilesystem,
  path: string,
): boolean {
  const entry = filesystem[path];
  return (
    entry?.type === "directory" &&
    hasPermission(state, entry, "write") &&
    hasPermission(state, entry, "execute")
  );
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function tokenize(commandLine: string): TokenizeResult {
  const tokens: ShellToken[] = [];
  let buffer = "";
  let tokenStarted = false;
  let quote: "'" | '"' | null = null;

  const flushWord = () => {
    if (!tokenStarted) return;
    tokens.push(Object.freeze({ kind: "word", value: buffer }));
    buffer = "";
    tokenStarted = false;
  };

  for (let index = 0; index < commandLine.length; index += 1) {
    const character = commandLine[index];

    if (quote) {
      if (character === quote) {
        quote = null;
        tokenStarted = true;
        continue;
      }
      if (character === "\\" && quote === '"') {
        index += 1;
        if (index >= commandLine.length) {
          return { error: "shell: syntax error: trailing escape" };
        }
        buffer += commandLine[index];
        tokenStarted = true;
        continue;
      }
      buffer += character;
      tokenStarted = true;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      tokenStarted = true;
      continue;
    }

    if (/\s/.test(character)) {
      flushWord();
      continue;
    }

    if (character === "\\") {
      index += 1;
      if (index >= commandLine.length) {
        return { error: "shell: syntax error: trailing escape" };
      }
      buffer += commandLine[index];
      tokenStarted = true;
      continue;
    }

    if (character === ">") {
      flushWord();
      if (commandLine[index + 1] === ">") {
        tokens.push(Object.freeze({ kind: "redirect", value: ">>" }));
        index += 1;
      } else {
        tokens.push(Object.freeze({ kind: "redirect", value: ">" }));
      }
      continue;
    }

    buffer += character;
    tokenStarted = true;
  }

  if (quote) {
    return { error: "shell: syntax error: unterminated quoted string" };
  }

  flushWord();
  return { tokens };
}

function wordsOnly(
  state: LinuxShellState,
  command: string,
  tokens: readonly ShellToken[],
): readonly string[] | LinuxCommandResult {
  const redirect = tokens.find((token) => token.kind === "redirect");
  if (redirect) {
    return errorResult(
      state,
      `${command}: redirection is only supported with echo`,
      2,
    );
  }
  return tokens.map((token) => token.value);
}

function replaceFilesystem(
  state: LinuxShellState,
  filesystem: MutableFilesystem,
): LinuxShellState {
  return freezeState({
    ...state,
    filesystem: freezeFilesystem(filesystem),
  });
}

function stateAfterFilesystemChanges(
  state: LinuxShellState,
  filesystem: MutableFilesystem,
  changed: boolean,
): LinuxShellState {
  return changed ? replaceFilesystem(state, filesystem) : state;
}

function pathResolutionErrorMessage(
  command: string,
  error: unknown,
): string {
  if (!(error instanceof ShellPathResolutionError)) throw error;
  return `${command}: ${error.operand}: ${error.reason}`;
}

function finishOperandCommand(
  state: LinuxShellState,
  outputParts: readonly string[],
  hadError: boolean,
  separator = "\n",
  evidence: readonly LinuxCommandEvidence[] = [],
): LinuxCommandResult {
  return result(
    state,
    outputParts.join(separator),
    hadError ? 1 : 0,
    false,
    evidence,
  );
}

function renderCatOutput(
  parts: readonly Readonly<{
    kind: "content" | "diagnostic";
    value: string;
  }>[],
): string {
  let output = "";
  let previousKind: "content" | "diagnostic" | undefined;

  for (const part of parts) {
    if (
      (part.kind === "diagnostic" || previousKind === "diagnostic") &&
      output &&
      !output.endsWith("\n")
    ) {
      output += "\n";
    }
    output += part.value;
    previousKind = part.kind;
  }

  return output;
}

function listChildren(
  filesystem: LinuxFilesystem,
  path: string,
): readonly Readonly<{
  path: string;
  name: string;
  entry: LinuxFilesystemEntry;
}>[] {
  return Object.keys(filesystem)
    .filter((candidate) => candidate !== path && parentPath(candidate) === path)
    .map((candidate) => ({
      path: candidate,
      name: basename(candidate),
      entry: filesystem[candidate],
    }))
    .sort((left, right) => compareNames(left.name, right.name));
}

function formatLongEntry(name: string, entry: LinuxFilesystemEntry): string {
  const links = entry.type === "directory" ? 2 : 1;
  const size = entry.type === "directory" ? 4096 : byteLength(entry.content);
  return `${entry.mode} ${links} ${entry.owner} ${entry.owner} ${String(size).padStart(4, " ")} ${FIXED_LISTING_DATE} ${name}`;
}

function executeLs(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  let showAll = false;
  let longFormat = false;
  let parsingOptions = true;
  const operands: string[] = [];

  for (const argument of arguments_) {
    if (parsingOptions && argument === "--") {
      parsingOptions = false;
      continue;
    }
    if (parsingOptions && argument.startsWith("-") && argument !== "-") {
      for (const option of argument.slice(1)) {
        if (option === "a") showAll = true;
        else if (option === "l") longFormat = true;
        else {
          return errorResult(state, `ls: invalid option -- '${option}'`, 2);
        }
      }
      continue;
    }
    operands.push(argument);
  }

  const targets = operands.length > 0 ? operands : ["."];
  const sections: string[] = [];
  let hadError = false;

  for (const target of targets) {
    let path: string;
    try {
      path = resolvePath(state, target);
    } catch (error) {
      sections.push(pathResolutionErrorMessage("ls", error));
      hadError = true;
      continue;
    }
    const entry = state.filesystem[path];
    if (!entry) {
      sections.push(
        `ls: cannot access '${target}': No such file or directory`,
      );
      hadError = true;
      continue;
    }

    let listing: string;
    if (entry.type === "file") {
      listing = longFormat
        ? formatLongEntry(basename(path), entry)
        : basename(path);
    } else {
      const children = listChildren(state.filesystem, path).filter(
        (child) => showAll || !child.name.startsWith("."),
      );
      const visible = showAll
        ? [
            { path, name: ".", entry },
            {
              path: parentPath(path),
              name: "..",
              entry: state.filesystem[parentPath(path)],
            },
            ...children,
          ]
        : children;

      listing = longFormat
        ? visible.map((child) => formatLongEntry(child.name, child.entry)).join("\n")
        : visible.map((child) => child.name).join("  ");
    }

    sections.push(
      targets.length > 1 ? `${target}:\n${listing}` : listing,
    );
  }

  return finishOperandCommand(state, sections, hadError, "\n\n");
}

function executeCd(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  if (arguments_.length > 1) {
    return errorResult(state, "cd: too many arguments");
  }

  const target = arguments_[0] ?? state.home;
  const path = target === "-" ? state.previousCwd : resolvePath(state, target);
  const entry = state.filesystem[path];

  if (!entry) {
    return errorResult(state, `cd: ${target}: No such file or directory`);
  }
  if (entry.type !== "directory") {
    return errorResult(state, `cd: ${target}: Not a directory`);
  }

  const nextState = freezeState({
    ...state,
    cwd: path,
    previousCwd: state.cwd,
  });
  return result(nextState, target === "-" ? path : "");
}

function executeCat(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  if (arguments_.length === 0) {
    return errorResult(state, "cat: missing file operand");
  }

  const parts: Array<{
    kind: "content" | "diagnostic";
    value: string;
  }> = [];
  const evidence: LinuxCommandEvidence[] = [];
  let hadError = false;
  for (const argument of arguments_) {
    let path: string;
    try {
      path = resolvePath(state, argument);
    } catch (error) {
      parts.push({
        kind: "diagnostic",
        value: pathResolutionErrorMessage("cat", error),
      });
      hadError = true;
      continue;
    }
    const entry = state.filesystem[path];
    if (!entry) {
      parts.push({
        kind: "diagnostic",
        value: `cat: ${argument}: No such file or directory`,
      });
      hadError = true;
      continue;
    }
    if (entry.type === "directory") {
      parts.push({
        kind: "diagnostic",
        value: `cat: ${argument}: Is a directory`,
      });
      hadError = true;
      continue;
    }
    parts.push({ kind: "content", value: entry.content });
    evidence.push(Object.freeze({ kind: "read-file", path }));
  }

  return finishOperandCommand(
    state,
    [renderCatOutput(parts)],
    hadError,
    "",
    evidence,
  );
}

function executeMkdir(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  let createParents = false;
  let parsingOptions = true;
  const operands: string[] = [];

  for (const argument of arguments_) {
    if (parsingOptions && argument === "--") {
      parsingOptions = false;
      continue;
    }
    if (parsingOptions && argument.startsWith("-") && argument !== "-") {
      for (const option of argument.slice(1)) {
        if (option === "p") createParents = true;
        else {
          return errorResult(state, `mkdir: invalid option -- '${option}'`, 2);
        }
      }
      continue;
    }
    operands.push(argument);
  }

  if (operands.length === 0) {
    return errorResult(state, "mkdir: missing operand");
  }

  const filesystem: MutableFilesystem = { ...state.filesystem };
  let changed = false;
  const diagnostics: string[] = [];

  operandLoop: for (const operand of operands) {
    let path: string;
    try {
      path = resolvePath(state, operand, {
        allowMissingIntermediates: createParents,
        allowMissingTrailingDirectory: true,
        filesystem,
      });
    } catch (error) {
      diagnostics.push(pathResolutionErrorMessage("mkdir", error));
      continue;
    }
    const existing = filesystem[path];
    if (existing) {
      if (createParents && existing.type === "directory") continue;
      diagnostics.push(
        `mkdir: cannot create directory '${operand}': File exists`,
      );
      continue;
    }

    if (createParents) {
      const segments = path.split("/").filter(Boolean);
      let current = "";
      for (const segment of segments) {
        current += `/${segment}`;
        const currentEntry = filesystem[current];
        if (currentEntry?.type === "file") {
          diagnostics.push(
            `mkdir: cannot create directory '${operand}': Not a directory`,
          );
          continue operandLoop;
        }
        if (!currentEntry) {
          if (!canModifyDirectory(state, filesystem, parentPath(current))) {
            diagnostics.push(
              `mkdir: cannot create directory '${operand}': Permission denied`,
            );
            continue operandLoop;
          }
          filesystem[current] = directoryEntry(state.username);
          changed = true;
        }
      }
      continue;
    }

    const parent = filesystem[parentPath(path)];
    if (!parent) {
      diagnostics.push(
        `mkdir: cannot create directory '${operand}': No such file or directory`,
      );
      continue;
    }
    if (parent.type !== "directory") {
      diagnostics.push(
        `mkdir: cannot create directory '${operand}': Not a directory`,
      );
      continue;
    }
    if (!canModifyDirectory(state, filesystem, parentPath(path))) {
      diagnostics.push(
        `mkdir: cannot create directory '${operand}': Permission denied`,
      );
      continue;
    }
    filesystem[path] = directoryEntry(state.username);
    changed = true;
  }

  return finishOperandCommand(
    stateAfterFilesystemChanges(state, filesystem, changed),
    diagnostics,
    diagnostics.length > 0,
  );
}

function executeTouch(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  if (arguments_.length === 0) {
    return errorResult(state, "touch: missing file operand");
  }
  const unsupportedOption = arguments_.find(
    (argument) => argument.startsWith("-") && argument !== "-",
  );
  if (unsupportedOption) {
    return errorResult(
      state,
      `touch: invalid option -- '${unsupportedOption.slice(1, 2)}'`,
      2,
    );
  }

  const filesystem: MutableFilesystem = { ...state.filesystem };
  let changed = false;
  const diagnostics: string[] = [];
  for (const operand of arguments_) {
    let path: string;
    try {
      path = resolvePath(state, operand, { filesystem });
    } catch (error) {
      diagnostics.push(pathResolutionErrorMessage("touch", error));
      continue;
    }
    const existing = filesystem[path];
    if (existing) {
      if (!hasPermission(state, existing, "write")) {
        diagnostics.push(
          `touch: cannot touch '${operand}': Permission denied`,
        );
        continue;
      }
      continue;
    }

    const parent = filesystem[parentPath(path)];
    if (!parent) {
      diagnostics.push(
        `touch: cannot touch '${operand}': No such file or directory`,
      );
      continue;
    }
    if (parent.type !== "directory") {
      diagnostics.push(
        `touch: cannot touch '${operand}': Not a directory`,
      );
      continue;
    }
    if (!canModifyDirectory(state, filesystem, parentPath(path))) {
      diagnostics.push(
        `touch: cannot touch '${operand}': Permission denied`,
      );
      continue;
    }
    filesystem[path] = fileEntry("", state.username);
    changed = true;
  }

  return finishOperandCommand(
    stateAfterFilesystemChanges(state, filesystem, changed),
    diagnostics,
    diagnostics.length > 0,
  );
}

function executeEcho(
  state: LinuxShellState,
  tokens: readonly ShellToken[],
): LinuxCommandResult {
  const redirects = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === "redirect");

  if (redirects.length > 1) {
    return errorResult(state, "echo: syntax error near unexpected token '>'", 2);
  }

  const redirect = redirects[0];
  const textTokens = redirect ? tokens.slice(0, redirect.index) : tokens;
  if (textTokens.some((token) => token.kind !== "word")) {
    return errorResult(state, "echo: invalid redirection", 2);
  }

  let words = textTokens.map((token) => token.value);
  let appendNewline = true;
  if (words[0] === "-n") {
    appendNewline = false;
    words = words.slice(1);
  }
  const text = words.join(" ");

  if (!redirect) {
    return result(state, text);
  }

  const destinationTokens = tokens.slice(redirect.index + 1);
  if (
    destinationTokens.length !== 1 ||
    destinationTokens[0].kind !== "word"
  ) {
    return errorResult(state, "echo: syntax error: expected one output file", 2);
  }

  const operand = destinationTokens[0].value;
  const path = resolvePath(state, operand);
  const existing = state.filesystem[path];
  if (existing?.type === "directory") {
    return errorResult(state, `echo: ${operand}: Is a directory`);
  }
  if (existing && !hasPermission(state, existing, "write")) {
    return errorResult(
      state,
      `echo: ${operand}: Permission denied`,
      1,
      [Object.freeze({ kind: "write-denied", path })],
    );
  }

  const parent = state.filesystem[parentPath(path)];
  if (!parent) {
    return errorResult(state, `echo: ${operand}: No such file or directory`);
  }
  if (parent.type !== "directory") {
    return errorResult(state, `echo: ${operand}: Not a directory`);
  }
  if (
    !existing &&
    !canModifyDirectory(state, state.filesystem, parentPath(path))
  ) {
    return errorResult(
      state,
      `echo: ${operand}: Permission denied`,
      1,
      [Object.freeze({ kind: "write-denied", path })],
    );
  }

  const payload = `${text}${appendNewline ? "\n" : ""}`;
  const content =
    redirect.token.value === ">>" && existing?.type === "file"
      ? existing.content + payload
      : payload;
  const filesystem: MutableFilesystem = {
    ...state.filesystem,
    [path]: existing?.type === "file"
      ? Object.freeze({ ...existing, content })
      : fileEntry(content, state.username),
  };

  return result(replaceFilesystem(state, filesystem));
}

function pathContains(parent: string, child: string): boolean {
  return parent === "/" || child === parent || child.startsWith(`${parent}/`);
}

function executeRm(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  let recursive = false;
  let force = false;
  let parsingOptions = true;
  const operands: string[] = [];

  for (const argument of arguments_) {
    if (parsingOptions && argument === "--") {
      parsingOptions = false;
      continue;
    }
    if (parsingOptions && argument.startsWith("-") && argument !== "-") {
      for (const option of argument.slice(1)) {
        if (option === "r" || option === "R") recursive = true;
        else if (option === "f") force = true;
        else return errorResult(state, `rm: invalid option -- '${option}'`, 2);
      }
      continue;
    }
    operands.push(argument);
  }

  if (operands.length === 0) {
    return force ? result(state) : errorResult(state, "rm: missing operand");
  }

  const filesystem: MutableFilesystem = { ...state.filesystem };
  let changed = false;
  const diagnostics: string[] = [];
  for (const operand of operands) {
    let path: string;
    try {
      path = resolvePath(state, operand, { filesystem });
    } catch (error) {
      if (
        force &&
        error instanceof ShellPathResolutionError &&
        error.reason === "No such file or directory"
      ) {
        continue;
      }
      diagnostics.push(pathResolutionErrorMessage("rm", error));
      continue;
    }
    const entry = filesystem[path];
    if (!entry) {
      if (force) continue;
      diagnostics.push(
        `rm: cannot remove '${operand}': No such file or directory`,
      );
      continue;
    }
    if (path === "/") {
      diagnostics.push("rm: refusing to remove root directory '/'");
      continue;
    }
    if (entry.type === "directory" && !recursive) {
      diagnostics.push(
        `rm: cannot remove '${operand}': Is a directory`,
      );
      continue;
    }
    if (!canModifyDirectory(state, filesystem, parentPath(path))) {
      diagnostics.push(
        `rm: cannot remove '${operand}': Permission denied`,
      );
      continue;
    }
    if (entry.type === "directory" && pathContains(path, state.cwd)) {
      diagnostics.push(
        `rm: cannot remove '${operand}': Directory contains the current working directory`,
      );
      continue;
    }
    for (const candidate of Object.keys(filesystem)) {
      if (candidate === path || candidate.startsWith(`${path}/`)) {
        delete filesystem[candidate];
        changed = true;
      }
    }
  }

  return finishOperandCommand(
    stateAfterFilesystemChanges(state, filesystem, changed),
    diagnostics,
    diagnostics.length > 0,
  );
}

function executeUname(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  if (arguments_.length > 1) {
    return errorResult(state, "uname: extra operand", 2);
  }

  const option = arguments_[0] ?? "-s";
  const values: Record<string, string> = {
    "-s": "Linux",
    "-n": state.hostname,
    "-r": "6.8.0-rootorial",
    "-m": "wasm32",
    "-a": `Linux ${state.hostname} 6.8.0-rootorial #1 SMP PREEMPT_DYNAMIC wasm32 GNU/Linux`,
  };
  const output = values[option];
  if (!output) {
    return errorResult(state, `uname: invalid option -- '${option}'`, 2);
  }
  return result(state, output);
}

function executeTree(
  state: LinuxShellState,
  arguments_: readonly string[],
): LinuxCommandResult {
  if (arguments_.length > 1) {
    return errorResult(state, "tree: too many arguments");
  }

  const operand = arguments_[0] ?? ".";
  const path = resolvePath(state, operand);
  const entry = state.filesystem[path];
  if (!entry) {
    return errorResult(state, `${operand} [error opening dir]`);
  }

  const lines = [operand === "/" ? "/" : operand];
  let directoryCount = 0;
  let fileCount = 0;

  const walk = (directory: string, prefix: string) => {
    const children = listChildren(state.filesystem, directory);
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? "└──" : "├──"} ${child.name}`);
      if (child.entry.type === "directory") {
        directoryCount += 1;
        walk(child.path, `${prefix}${last ? "    " : "│   "}`);
      } else {
        fileCount += 1;
      }
    });
  };

  if (entry.type === "directory") {
    walk(path, "");
  } else {
    fileCount = 1;
  }

  lines.push(
    "",
    `${directoryCount} ${directoryCount === 1 ? "directory" : "directories"}, ${fileCount} ${fileCount === 1 ? "file" : "files"}`,
  );
  return result(state, lines.join("\n"));
}

export function createLinuxShellState(): LinuxShellState {
  const filesystem = freezeFilesystem({
    "/": directoryEntry(),
    "/etc": directoryEntry(),
    "/etc/os-release": fileEntry(
      [
        'NAME="Rootorial Shell Simulator"',
        'PRETTY_NAME="Rootorial Shell Simulator (not a real Linux kernel)"',
        'ID="rootorial-simulator"',
        'VERSION_ID="1"',
        "",
      ].join("\n"),
    ),
    "/home": directoryEntry(),
    "/home/student": directoryEntry("student"),
    "/home/student/readme.txt": fileEntry(
      [
        "Welcome to the Rootorial shell simulator (not a real kernel)!",
        "Try: ls, cat readme.txt, pwd, and tree /",
        "",
      ].join("\n"),
      "student",
    ),
    "/tmp": Object.freeze({
      type: "directory" as const,
      mode: "drwxrwxrwt",
      owner: "root",
    }),
    "/var": directoryEntry(),
    "/var/log": directoryEntry(),
    "/var/log/boot.log": fileEntry(
      [
        "[sim 0.000] Starting the Rootorial shell simulator...",
        "[sim 0.042] Mounted the in-memory teaching filesystem.",
        "[sim 0.084] Started the interactive student shell.",
        "",
      ].join("\n"),
    ),
  });

  return freezeState({
    cwd: "/home/student",
    previousCwd: "/home/student",
    home: "/home/student",
    username: "student",
    hostname: "rootorial",
    filesystem,
  });
}

export function runLinuxCommand(
  state: LinuxShellState,
  commandLine: string,
): LinuxCommandResult {
  const tokenized = tokenize(commandLine);
  if ("error" in tokenized) {
    return errorResult(state, tokenized.error, 2);
  }
  if (tokenized.tokens.length === 0) return result(state);

  const [commandToken, ...argumentTokens] = tokenized.tokens;
  if (commandToken.kind !== "word") {
    return errorResult(state, "shell: syntax error near unexpected token '>'", 2);
  }

  try {
    if (commandToken.value === "echo") {
      return executeEcho(state, argumentTokens);
    }

    const arguments_ = wordsOnly(
      state,
      commandToken.value,
      argumentTokens,
    );
    if ("state" in arguments_) return arguments_;

    switch (commandToken.value) {
      case "help":
        return arguments_.length > 0
          ? errorResult(state, "help: too many arguments")
          : result(state, HELP_OUTPUT);
      case "pwd":
        return arguments_.length > 0
          ? errorResult(state, "pwd: too many arguments")
          : result(
              state,
              state.cwd,
              0,
              false,
              [Object.freeze({ kind: "printed-working-directory", path: state.cwd })],
            );
      case "ls":
        return executeLs(state, arguments_);
      case "cd":
        return executeCd(state, arguments_);
      case "cat":
        return executeCat(state, arguments_);
      case "mkdir":
        return executeMkdir(state, arguments_);
      case "touch":
        return executeTouch(state, arguments_);
      case "rm":
        return executeRm(state, arguments_);
      case "clear":
        return arguments_.length > 0
          ? errorResult(state, "clear: too many arguments")
          : result(state, "", 0, true);
      case "whoami":
        return arguments_.length > 0
          ? errorResult(state, "whoami: too many arguments")
          : result(state, state.username);
      case "uname":
        return executeUname(state, arguments_);
      case "tree":
        return executeTree(state, arguments_);
      default:
        return errorResult(
          state,
          `bash: ${commandToken.value}: command not found`,
          127,
        );
    }
  } catch (error) {
    if (error instanceof ShellPathResolutionError) {
      return errorResult(
        state,
        `${commandToken.value}: ${error.operand}: ${error.reason}`,
      );
    }
    throw error;
  }
}

export function snapshotFilesystem(
  state: LinuxShellState,
): LinuxFilesystemSnapshot {
  const snapshot: Record<string, LinuxFilesystemSnapshotEntry> = {};
  for (const path of Object.keys(state.filesystem).sort(compareNames)) {
    const entry = state.filesystem[path];
    snapshot[path] = Object.freeze(
      entry.type === "file"
        ? {
            type: entry.type,
            mode: entry.mode,
            owner: entry.owner,
            content: entry.content,
          }
        : {
            type: entry.type,
            mode: entry.mode,
            owner: entry.owner,
          },
    );
  }
  return Object.freeze(snapshot);
}
