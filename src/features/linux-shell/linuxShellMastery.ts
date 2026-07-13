import type {
  LinuxCommandResult,
  LinuxFilesystemSnapshot,
} from "./linuxShell";

export type LinuxShellObservations = Readonly<{
  currentDirectory: boolean;
  osRelease: boolean;
  protectedFileDenied: boolean;
}>;

export const emptyLinuxShellObservations: LinuxShellObservations = Object.freeze({
  currentDirectory: false,
  osRelease: false,
  protectedFileDenied: false,
});

export function recordLinuxShellObservations(
  current: LinuxShellObservations,
  result: LinuxCommandResult,
): LinuxShellObservations {
  return Object.freeze({
    currentDirectory:
      current.currentDirectory ||
      result.evidence.some(({ kind }) => kind === "printed-working-directory"),
    osRelease:
      current.osRelease ||
      result.evidence.some(
        (evidence) =>
          evidence.kind === "read-file" &&
          evidence.path === "/etc/os-release",
      ),
    protectedFileDenied:
      current.protectedFileDenied ||
      result.evidence.some(
        (evidence) =>
          evidence.kind === "write-denied" &&
          evidence.path === "/etc/os-release",
      ),
  });
}

export function linuxShellTaskState(
  observations: LinuxShellObservations,
  filesystem: LinuxFilesystemSnapshot,
  includePermissionTask: boolean,
): readonly boolean[] {
  const labDirectory = filesystem["/home/student/lab"];
  const notes = filesystem["/home/student/lab/notes.txt"];
  const coreTasks = [
    observations.currentDirectory,
    observations.osRelease,
    labDirectory?.type === "directory",
    notes?.type === "file" &&
      notes.content.trim() === "absolute paths start at /",
  ];

  return includePermissionTask
    ? [...coreTasks, observations.protectedFileDenied]
    : coreTasks;
}
