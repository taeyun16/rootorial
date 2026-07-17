import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  INFRASTRUCTURE_CURRICULUM_SLUG,
  LINUX_CURRICULUM_SLUG,
  infrastructureChaptersEn,
  infrastructureChaptersKo,
} from "../../data/curriculum";
import { canCompleteNetworkNamespacesChapter } from "../../features/infrastructure/network-namespaces";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { NetworkNamespaceIncidentLab } from "./NetworkNamespaceIncidentLab";
import { NetworkNamespaceTopologyLab } from "./NetworkNamespaceTopologyLab";
import { NetworkNamespacesConceptCheck } from "./NetworkNamespacesConceptCheck";

const tocItems = {
  ko: [
    { id: "network-view", label: "namespace별 network view" },
    { id: "localhost", label: "localhost의 범위" },
    { id: "ownership", label: "process·interface·socket 소유권" },
    { id: "evidence", label: "관측 위치가 포함된 증거" },
    { id: "namespace-topology-lab", label: "필수 경계 토폴로지 lab" },
    { id: "incidents", label: "격리 사건 진단" },
    { id: "real-linux", label: "선택 iproute2 관찰" },
    { id: "transfer", label: "veth·bridge·routing으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "network-view", label: "A network view per namespace" },
    { id: "localhost", label: "The scope of localhost" },
    { id: "ownership", label: "Process, interface, and socket ownership" },
    { id: "evidence", label: "Evidence with an observation scope" },
    { id: "namespace-topology-lab", label: "Required boundary topology lab" },
    { id: "incidents", label: "Diagnose isolation incidents" },
    { id: "real-linux", label: "Optional iproute2 observation" },
    { id: "transfer", label: "Transfer to veth, bridges, and routing" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function NetworkNamespacesChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? infrastructureChaptersKo : infrastructureChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "network-namespaces-and-boundaries");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [topologyLabComplete, setTopologyLabComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteNetworkNamespacesChapter({
    topologyLabComplete,
    incidentsComplete,
    conceptsMastered,
  });
  const linuxNetworkingPreviewHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}/chapters/networking-from-a-packet${isKo ? "" : "?lang=en"}`;
  const vethRoutingPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/veth-bridges-and-routing${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell infrastructure-chapter-shell network-namespaces-chapter-shell">
      <header className="chapter-topbar">
        <Link
          className="wordmark"
          to="/"
          search={isKo ? {} : { lang: "en" }}
          aria-label={t("Rootorial 홈", "Rootorial home")}
        >
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status">
            <span className="status-dot" aria-hidden="true" /> {chapter.runtime}
          </span>
          <div className="chapter-progress-label">
            <span>CHAPTER {String(chapterNumber).padStart(2, "0")}</span>
            <div className="mini-progress">
              <span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} />
            </div>
            <span>{chapterNumber} / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero infrastructure-lesson-hero network-namespaces-lesson-hero">
            <p className="eyebrow">
              PROCESS → NETNS → INTERFACES / ROUTES / NEIGHBORS / SOCKETS · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">01</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {t(
                "Linux networking 장에서 하나의 process가 packet을 socket과 route로 보냈습니다. 이제 같은 kernel 안에 여러 network view를 만들고, process·interface·socket이 어느 view에 속하는지 추적해 격리 경계를 설계합니다.",
                "The Linux networking chapter followed one process as it sent a packet through a socket and route. Now create several network views inside the same kernel and trace which view owns each process, interface, and socket to design an isolation boundary.",
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t(
                  "namespace별 lo 상태, process 위치와 socket table을 조작해 network view가 분리된다는 사실을 판정할 수 있다.",
                  "Manipulate namespace-local lo state, process placement, and socket tables to determine that network views are isolated.",
                )}</li>
                <li>{t(
                  "127.0.0.1과 localhost가 호출 process의 현재 network namespace에만 닫혀 있음을 설명할 수 있다.",
                  "Explain why 127.0.0.1 and localhost are confined to the calling process's current network namespace.",
                )}</li>
                <li>{t(
                  "process의 실행 위치, interface의 단일 소유권, socket 생성 시점의 namespace를 서로 구분할 수 있다.",
                  "Distinguish a process's execution location, an interface's single owner, and a socket's namespace at creation time.",
                )}</li>
                <li>{t(
                  "관측 명령을 실행한 namespace를 증거에 포함해 listener의 존재 또는 부재를 올바르게 입증할 수 있다.",
                  "Prove that a listener exists or is absent by including the namespace where the observation command ran in the evidence.",
                )}</li>
                <li>{t(
                  "격리된 namespace 사이를 연결하려면 별도의 veth endpoint, bridge 또는 router와 양방향 route가 필요함을 예측할 수 있다.",
                  "Predict that connecting isolated namespaces requires separate veth endpoints, a bridge or router, and routes in both directions.",
                )}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="network-view">
            <div className="margin-label">01 — ONE KERNEL, SEPARATE NETWORK VIEWS</div>
            <h2>{t(
              "namespace는 작은 VM이 아니라 kernel network object의 조회 경계입니다",
              "A namespace is a lookup boundary for kernel network objects, not a tiny VM",
            )}</h2>
            <p>{t(
              "network namespace를 만들 때 kernel image나 physical memory를 복제하지 않습니다. 같은 Linux kernel이 network device, IPv4·IPv6 stack, route, neighbor, port와 socket을 namespace별 집합으로 관리합니다. 따라서 같은 interface 이름, 같은 route prefix, 같은 127.0.0.1:8080 port도 서로 다른 namespace에 동시에 존재할 수 있습니다.",
              "Creating a network namespace does not copy the kernel image or physical memory. The same Linux kernel manages namespace-local sets of network devices, IPv4 and IPv6 stacks, routes, neighbors, ports, and sockets. The same interface name, route prefix, and 127.0.0.1:8080 port can therefore exist simultaneously in different namespaces.",
            )}</p>
            <div className="namespace-view-grid" role="group" aria-label={t("namespace마다 분리되는 network view", "Network view isolated per namespace")}>
              <article><span>HOST NETNS</span><strong>lo · eth0</strong><p>route A · neighbor A · sockets A</p></article>
              <article><span>APP NETNS</span><strong>lo · eth-app</strong><p>route B · neighbor B · sockets B</p></article>
              <article><span>{t("공유 경계", "SHARED BOUNDARY")}</span><strong>one Linux kernel</strong><p>{t("서로 다른 network object 집합", "different network-object sets")}</p></article>
            </div>
            <div className="concept-callout namespace-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념: Linux의 packet 경로", "Prerequisite: the Linux packet path")}</strong>
                <p>{t(
                  "socket fd, local·remote endpoint, longest-prefix route, next-hop neighbor와 listener를 기억하세요. 이번 장에서는 그 object가 전역으로 하나뿐이라고 가정하지 않고 먼저 어느 namespace의 view인지 묻습니다.",
                  "Recall socket file descriptors, local and remote endpoints, longest-prefix routes, next-hop neighbors, and listeners. This chapter stops treating those objects as one global set and first asks which namespace owns the view.",
                )}</p>
                {preview ? (
                  <a href={linuxNetworkingPreviewHref}>{t("Linux 네트워킹 드래프트 다시 보기", "Review the Linux networking draft")} →</a>
                ) : (
                  <span>{t("선행: Linux 시스템을 바닥부터 · 패킷에서 socket까지", "Prerequisite: Linux Systems from Scratch · From Packets to Sockets")}</span>
                )}
              </div>
            </div>
          </section>

          <section className="article-section" id="localhost">
            <div className="margin-label">02 — LOOPBACK IS NAMESPACE-LOCAL</div>
            <h2>{t(
              "localhost는 host 전체에서 서비스를 찾는 전역 주소가 아닙니다",
              "Localhost is not a global service-discovery address for the host",
            )}</h2>
            <p>{t(
              "connect(127.0.0.1:8080)은 호출 thread가 속한 network namespace의 lo interface와 socket table만 조회합니다. host의 curl은 app namespace의 listener를 찾지 못하고, app namespace 안에서 실행한 curl만 그 listener에 도달합니다. 새 namespace의 lo가 down이면 그 namespace 내부의 loopback 연결도 먼저 실패하므로 interface 상태 역시 증거에 포함해야 합니다.",
              "connect(127.0.0.1:8080) consults only the lo interface and socket table in the calling thread's network namespace. A host curl cannot discover a listener in the app namespace; only a curl executed inside app can reach it. A new namespace also starts with lo down, so even an internal loopback connection fails until that interface state is established and included in the evidence.",
            )}</p>
            <div className="namespace-loopback-strip" role="group" aria-label={t("host와 app namespace의 loopback 비교", "Comparison of host and app namespace loopback")}>
              <span><small>HOST PROCESS</small><strong>127.0.0.1</strong><p>host lo → host sockets</p></span>
              <span aria-hidden="true">≠</span>
              <span><small>APP PROCESS</small><strong>127.0.0.1</strong><p>app lo → app sockets</p></span>
            </div>
            <details className="network-prediction-answer">
              <summary>{t(
                "예측: host와 app이 모두 127.0.0.1:8080을 listen하면 host의 curl은 어느 server에 도달할까요?",
                "Predict: if both host and app listen on 127.0.0.1:8080, which server does a host curl reach?",
              )}</summary>
              <p>{t(
                "host namespace의 server에만 도달합니다. 같은 IP와 port 문자열은 충돌하지 않습니다. 두 bind는 서로 다른 socket table에 있고, 호출 process의 namespace가 조회할 table을 먼저 결정합니다.",
                "It reaches only the server in the host namespace. The identical IP and port strings do not conflict: the binds live in different socket tables, and the calling process's namespace selects which table is searched.",
              )}</p>
            </details>
          </section>

          <section className="article-section" id="ownership">
            <div className="margin-label">03 — PROCESS · INTERFACE · SOCKET OWNERSHIP</div>
            <h2>{t(
              "이름이나 port가 아니라 생성·이동 연산이 소유 경계를 정합니다",
              "Creation and move operations establish ownership—not names or ports",
            )}</h2>
            <p>{t(
              "실행 thread는 특정 network namespace에서 network syscall을 수행합니다. interface 객체는 한 번에 정확히 한 network namespace에만 속하며 이동하면 원래 view에서 사라집니다. socket은 생성 당시 thread의 network namespace에 고정됩니다. listener를 host에서 먼저 만든 뒤 thread만 app namespace로 옮겨도 기존 listener는 host socket table에 남고, app 안에서 새 socket을 만들어 bind·listen해야 app listener가 됩니다.",
              "An executing thread performs network syscalls in a particular network namespace. An interface object belongs to exactly one network namespace at a time and disappears from the old view when moved. A socket is pinned to the creating thread's network namespace. If a listener is created on the host before only the thread enters app, the existing listener remains in the host socket table; a new socket must be created, bound, and listened on inside app.",
            )}</p>
            <div className="namespace-ownership-grid" role="group" aria-label={t("network object별 namespace 소유 계약", "Namespace ownership contract by network object")}>
              <article><span>{t("실행 주체", "EXECUTION")}</span><strong>thread → netns</strong><p>{t("그 view에서 새 network syscall 실행", "new network syscalls use that view")}</p></article>
              <article><span>INTERFACE</span><strong>one owner netns</strong><p>{t("이동은 복제가 아님", "moving is not copying")}</p></article>
              <article><span>SOCKET</span><strong>creation netns</strong><p>{t("thread 이동으로 socket은 이동하지 않음", "a later thread move does not move it")}</p></article>
              <article><span>ROUTE · NEIGHBOR</span><strong>table per netns</strong><p>{t("같은 prefix·address도 독립", "identical prefixes and addresses remain independent")}</p></article>
            </div>
            <p>{t(
              "veth pair는 하나의 interface를 두 namespace에 복제한 것이 아니라 연결된 두 interface 객체입니다. 이 구분이 다음 장에서 각 endpoint를 서로 다른 namespace에 두는 토대가 됩니다.",
              "A veth pair is not one interface copied into two namespaces; it is two connected interface objects. That distinction is the foundation for placing one endpoint in each namespace in the next chapter.",
            )}</p>
          </section>

          <section className="article-section" id="evidence">
            <div className="margin-label">04 — OBSERVE FROM THE TARGET VIEW</div>
            <h2>{t(
              "명령 결과에는 무엇을 봤는지와 어디에서 봤는지가 함께 필요합니다",
              "Evidence needs both what was observed and where it was observed",
            )}</h2>
            <p>{t(
              "ip와 ss도 network namespace에 속한 process입니다. host에서 실행한 ss -lnt는 host listener의 증거일 뿐 app listener의 부재를 증명하지 않습니다. app의 경계를 확인하려면 observer를 app namespace 안에서 실행하고 namespace ID, command, 핵심 output과 판정할 invariant를 한 묶음으로 남깁니다.",
              "ip and ss are processes that also belong to a network namespace. Running ss -lnt on the host proves only host listeners; it does not prove the absence of an app listener. To verify app's boundary, execute the observer inside app and record the namespace identity, command, relevant output, and the invariant being checked as one evidence unit.",
            )}</p>
            <ol className="namespace-evidence-pipeline">
              <li><span>01</span><strong>{t("관측 위치 고정", "FIX THE OBSERVATION SCOPE")}</strong><p>host / app / PID network namespace</p></li>
              <li><span>02</span><strong>{t("object별 명령", "QUERY THE OBJECT")}</strong><p>ip link · ip route · ip neigh · ss</p></li>
              <li><span>03</span><strong>{t("소유권 invariant", "CHECK OWNERSHIP INVARIANTS")}</strong><p>interface once · listener in creation netns</p></li>
              <li><span>04</span><strong>{t("두 view 비교", "COMPARE BOTH VIEWS")}</strong><p>{t("host 출력만으로 app을 추론하지 않기", "do not infer app from host output")}</p></li>
            </ol>
          </section>

          <div id="namespace-topology-lab">
            <NetworkNamespaceTopologyLab onCompletionChange={setTopologyLabComplete} />
          </div>

          <section className="article-section" id="incidents">
            <div className="margin-label">06 — DEBUG ISOLATION INCIDENTS</div>
            <h2>{t(
              "연결 실패를 주소 문자열이 아니라 object 소유권과 관측 범위로 수리합니다",
              "Repair connection failures through object ownership and observation scope—not address strings",
            )}</h2>
            <p>{t(
              "별도 사건 활동에서는 down 상태의 lo, 잘못된 namespace에서 만든 listener, namespace-local wildcard bind와 host에서만 수집한 ss 증거를 실제 state invariant로 판정합니다. preset 이름이나 설명 문구가 아니라 제출한 수리가 같은 모델에서 다시 실행되어 local health·socket ownership·관측 범위를 모두 만족해야 통과합니다.",
              "The separate incident activity diagnoses a down lo device, a listener created in the wrong namespace, a namespace-local wildcard bind, and ss evidence collected only on the host. A repair passes only when re-execution in the same model satisfies local-health, socket-ownership, and observation-scope invariants—not because its label sounds plausible.",
            )}</p>
            <NetworkNamespaceIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="real-linux">
            <div className="margin-label">07 — OPTIONAL REAL IPROUTE2 OBSERVATION</div>
            <h2>{t(
              "실제 Linux에서는 같은 명령을 host와 target namespace에서 나란히 실행합니다",
              "On real Linux, run the same query in the host and target namespace",
            )}</h2>
            <p>{t(
              "named namespace와 필요한 권한이 있는 Linux 환경에서만 아래 read-only 관찰을 시도하세요. app은 예시 이름입니다. 배포판, container runtime과 권한에 따라 출력이 달라질 수 있으며, shell·root·외부 network는 이 챕터의 완료 조건이 아닙니다. command가 실패하면 브라우저 lab의 결정적 fallback으로 모든 필수 학습을 계속할 수 있습니다.",
              "Try the read-only observations below only on Linux with a named namespace and suitable permission; app is an example name. Output varies by distribution, container runtime, and privilege. A shell, root access, and an external network are not chapter requirements. If a command fails, the deterministic browser lab remains the complete required fallback.",
            )}</p>
            <pre className="network-observation-command" aria-label={t("선택 network namespace 관찰 명령", "Optional network namespace observation commands")}>{`ip netns list
ip -br link
ip route show
ss -lnt '( sport = :8080 )'

sudo ip netns exec app ip -br link
sudo ip netns exec app ip route show
sudo ip netns exec app ip neigh show
sudo ip netns exec app ss -lnt '( sport = :8080 )'`}</pre>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER TO VETH · BRIDGES · ROUTING</div>
            <h2>{t(
              "namespace는 경계를 만들지만 그 경계를 건너는 path는 자동으로 만들지 않습니다",
              "A namespace creates a boundary; it does not automatically create a path across it",
            )}</h2>
            <div className="network-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t(
                "client와 app namespace가 각각 lo만 가진 상태에서 client가 app의 10.20.0.2:8080에 도달해야 한다고 가정하세요. 다음 장을 위해 필요한 state를 분류하세요: 두 개의 별도 veth endpoint와 소유 namespace, link up, 겹치지 않는 address/prefix, direct link용 route 또는 bridge port, router를 쓴다면 forwarding과 양방향 route, app listener. 각 단계마다 어느 namespace에서 ip link·ip route·ip neigh·ss를 실행할지도 지정하세요. localhost를 path로 사용하거나 한 endpoint를 두 namespace에 동시에 둬서는 안 됩니다.",
                "Assume client and app namespaces currently have only lo, and client must reach app at 10.20.0.2:8080. Classify the state the next chapter must add: two separate veth endpoints and their owner namespaces, links up, non-overlapping addresses and prefixes, a direct-link route or bridge ports, forwarding and routes in both directions when using a router, and the app listener. For each stage, specify the namespace where ip link, ip route, ip neigh, or ss must run. Do not use localhost as the path or place one endpoint in two namespaces at once.",
              )}</p>
            </div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">09 — CONCEPT CHECK</div>
            <NetworkNamespacesConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="network-completion-checklist" role="status" aria-live="polite">
              <span className={topologyLabComplete ? "is-complete" : undefined}>
                {topologyLabComplete ? "✓" : "○"} {t("필수 namespace 경계 토폴로지 lab", "Required namespace-boundary topology lab")}
              </span>
              <span className={incidentsComplete ? "is-complete" : undefined}>
                {incidentsComplete ? "✓" : "○"} {t("격리 사건 진단", "Isolation incident diagnosis")}
              </span>
              <span className={conceptsMastered ? "is-complete" : undefined}>
                {conceptsMastered ? "✓" : "○"} {t("개념 확인", "Concept check")}
              </span>
            </div>
            <CompleteChapter
              curriculumSlug={INFRASTRUCTURE_CURRICULUM_SLUG}
              slug="network-namespaces-and-boundaries"
              canComplete={canComplete}
              lockedMessage={t(
                "필수 경계 토폴로지 lab, 격리 사건 진단과 다섯 개념 확인을 모두 완료하세요.",
                "Complete the required boundary topology lab, isolation incidents, and all five concept checks.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? (
              <a href={linuxNetworkingPreviewHref}>← {t("선행: 패킷에서 socket까지", "Prerequisite: From Packets to Sockets")}</a>
            ) : (
              <span>← {t("선행: Linux 네트워킹", "Prerequisite: Linux networking")}</span>
            )}
            {preview ? (
              <a href={vethRoutingPreviewHref}>{t("다음: veth·bridge·routing으로 토폴로지 조립", "Next: Assemble topologies with veth, bridges, and routing")} →</a>
            ) : (
              <span>{t("다음: veth·bridge·routing으로 토폴로지 조립", "Next: Assemble topologies with veth, bridges, and routing")} →</span>
            )}
          </nav>
          <noscript>{t(
            "namespace 활동에는 JavaScript가 필요합니다. 위 설명, ownership 표와 iproute2 관찰 명령은 계속 읽을 수 있습니다.",
            "The namespace activities require JavaScript. The explanation, ownership table, and iproute2 observation commands remain readable.",
          )}</noscript>
        </article>
      </div>
    </main>
  );
}
