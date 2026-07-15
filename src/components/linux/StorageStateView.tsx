import type { StorageMachine } from "../../features/linux-runtime/storage-and-filesystems";

export function StorageStateView({
  machine,
  locale,
}: {
  machine: StorageMachine;
  locale: "ko" | "en";
}) {
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const mount = machine.mounts.find(({ path }) => path === "/srv/data");

  return (
    <div className="storage-machine-view" role="group" aria-label={t("파일시스템 namespace, inode와 cache 상태", "Filesystem namespace, inode, and cache state")}>
      <header>
        <span>MOUNT NAMESPACE</span>
        <strong>/srv/data → {mount?.active ? "datafs" : t("rootfs underlay", "rootfs underlay")}</strong>
      </header>
      <div className="storage-machine-grid">
        {(["rootfs", "datafs"] as const).map((device) => {
          const filesystem = machine.filesystems[device];
          return (
            <section key={device} aria-labelledby={`storage-${device}-title`}>
              <header>
                <span>{device === "rootfs" ? "/dev/vda2" : "/dev/vdb1"}</span>
                <strong id={`storage-${device}-title`}>{device} · root inode {filesystem.rootInode}</strong>
              </header>
              <div className="storage-entry-list">
                {filesystem.entries.map((entry) => {
                  const target = filesystem.inodes.find(({ id }) => id === entry.inode);
                  return (
                    <article key={`${entry.directoryInode}/${entry.name}`}>
                      <code>dir inode {entry.directoryInode} / {entry.name}</code>
                      <strong>→ inode {entry.inode}</strong>
                      <span>{target?.kind ?? t("회수됨", "reclaimed")}{target?.kind === "file" ? ` · ${target.sizeBytes} B · links ${target.linkCount}` : ""}</span>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div className="storage-cache-strip" aria-label={t("datafs 파일 cache와 영속 상태", "datafs file cache and persisted state")}>
        {machine.filesystems.datafs.inodes.filter(({ kind }) => kind === "file").map((candidate) => (
          <span key={candidate.id} className={candidate.dirty ? "is-dirty" : undefined}>
            inode {candidate.id} · links {candidate.linkCount} · open {candidate.openRefs}<br />
            cache marker “{candidate.cachedData}” · disk marker “{candidate.persistedData}” · {candidate.dirty ? "DIRTY" : "SYNCED"}
          </span>
        ))}
      </div>
    </div>
  );
}
