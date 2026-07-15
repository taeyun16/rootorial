import {
  modeSymbol,
  permissionGroups,
  permissionUsers,
  type PermissionDecision,
  type PermissionWorkspace,
} from "../../features/linux-runtime/users-and-permissions";

function groupName(gid: number) {
  return permissionGroups[gid as keyof typeof permissionGroups] ?? `gid ${gid}`;
}

export function PermissionStateView({
  workspace,
  decision,
  locale,
  compact = false,
}: {
  workspace: PermissionWorkspace;
  decision?: PermissionDecision | null;
  locale: "ko" | "en";
  compact?: boolean;
}) {
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const actors = [permissionUsers.mina, permissionUsers.joon, permissionUsers.guest];

  return (
    <div className={`permission-state-view${compact ? " is-compact" : ""}`}>
      {!compact ? (
        <div className="permission-credential-grid" role="group" aria-label={t("프로세스 자격 증명", "Process credentials")}>
          {actors.map((actor) => (
            <article key={actor.id}>
              <span>{actor.name}</span>
              <strong>eUID {actor.effectiveUid} · eGID {actor.effectiveGid}</strong>
              <p>
                {t("보조 그룹", "Supplementary groups")}: {actor.supplementaryGids.length > 0
                  ? actor.supplementaryGids.map((gid) => `${groupName(gid)}(${gid})`).join(", ")
                  : t("없음", "none")}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="permission-node-grid" role="group" aria-label={t("경로와 권한 메타데이터", "Path and permission metadata")}>
        {[workspace.directory, workspace.file].map((node) => (
          <article key={node.path}>
            <div>
              <span>{node.type === "directory" ? t("디렉터리", "DIRECTORY") : t("일반 파일", "REGULAR FILE")}</span>
              <code>{node.path}</code>
            </div>
            <strong>{modeSymbol(node)} <small>{node.mode}</small></strong>
            <dl>
              <div><dt>owner</dt><dd>uid {node.ownerUid}</dd></div>
              <div><dt>group</dt><dd>{groupName(node.groupGid)} ({node.groupGid})</dd></div>
            </dl>
          </article>
        ))}
      </div>

      {decision ? (
        <section className="permission-decision-trace" aria-label={t("접근 판정 순서", "Access-decision trace")}>
          <header>
            <span>{decision.allowed ? t("허용", "ALLOWED") : t("거부", "DENIED")}</span>
            <strong>{permissionUsers[decision.actorId as keyof typeof permissionUsers]?.name ?? decision.actorId}</strong>
          </header>
          <ol>
            {decision.checks.map((item, index) => (
              <li className={item.granted ? "is-granted" : "is-denied"} key={`${item.path}-${item.requiredBit}-${index}`}>
                <span>{item.granted ? "✓" : "×"}</span>
                <div>
                  <code>{item.path}</code>
                  <p>
                    {item.purpose === "path-search"
                      ? t("상위 경로 search", "ancestor path search")
                      : item.purpose === "parent-directory"
                        ? t("부모 디렉터리 변경", "parent directory mutation")
                        : t("대상 동작", "target operation")}
                    {" · "}{item.permissionClass} {item.requiredBit}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
