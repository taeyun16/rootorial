import type {
  MemoryProcessId,
  VirtualMemoryMachine,
} from "../../features/linux-runtime/memory-and-virtual-addresses";

function permissions(entry: VirtualMemoryMachine["processes"][MemoryProcessId]["pages"][number]) {
  return `${entry.readable ? "r" : "-"}${entry.writable ? "w" : "-"}${entry.executable ? "x" : "-"}`;
}

function vmaPermissions(entry: VirtualMemoryMachine["processes"][MemoryProcessId]["pages"][number]) {
  return `${entry.vmaReadable ? "r" : "-"}${entry.vmaWritable ? "w" : "-"}${entry.vmaExecutable ? "x" : "-"}p`;
}

export function VirtualMemoryStateView({
  machine,
  locale,
}: {
  machine: VirtualMemoryMachine;
  locale: "ko" | "en";
}) {
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;

  return (
    <div className="virtual-memory-state" role="group" aria-label={t("두 프로세스의 페이지 테이블과 물리 프레임", "Page tables and physical frames for two processes")}>
      <div className="virtual-memory-processes">
        {(["parent", "child"] as const).map((processId) => {
          const process = machine.processes[processId];
          return (
            <section key={processId} aria-labelledby={`memory-${processId}-title`}>
              <header>
                <span>{processId === "parent" ? t("부모", "PARENT") : t("자식", "CHILD")}</span>
                <strong id={`memory-${processId}-title`}>PID {process.pid}</strong>
              </header>
              <div className="virtual-memory-page-list">
                {process.pages.map((entry) => (
                  <article key={entry.vpn} className={!entry.present ? "is-not-present" : entry.cow ? "is-cow" : undefined}>
                    <div>
                      <span>VPN 0x{entry.vpn.toString(16)}</span>
                      <strong>{entry.region}</strong>
                    </div>
                    <code>VMA {vmaPermissions(entry)}<br />PTE {permissions(entry)}{entry.cow ? " · COW" : ""}</code>
                    <span aria-label={entry.present ? t(`프레임 ${entry.frame}`, `frame ${entry.frame}`) : t("현재 물리 프레임 없음", "no physical frame yet")}>
                      {entry.present ? `→ F${entry.frame}` : "→ —"}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <section className="virtual-memory-frames" aria-labelledby="memory-frames-title">
        <header>
          <span>{t("물리 메모리", "PHYSICAL MEMORY")}</span>
          <strong id="memory-frames-title">{t("현재 프레임", "Current frames")}</strong>
        </header>
        <div>
          {machine.frames.map((frame) => (
            <article key={frame.id}>
              <strong>F{frame.id}</strong>
              <span>{frame.source}</span>
              <code>{Object.entries(frame.bytes).length > 0
                ? Object.entries(frame.bytes)
                  .sort(([left], [right]) => Number(left) - Number(right))
                  .map(([offset, value]) => `byte[0x${Number(offset).toString(16).padStart(3, "0") }]=${value}`)
                  .join(" · ")
                : t("아직 쓴 byte 없음", "no written byte yet")}</code>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
