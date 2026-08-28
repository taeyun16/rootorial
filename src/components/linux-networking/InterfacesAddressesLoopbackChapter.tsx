import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_NETWORKING_CURRICULUM_SLUG,
  linuxNetworkingChaptersEn,
  linuxNetworkingChaptersKo,
} from "../../data/curriculum";
import { canCompleteInterfacesAddressesLoopbackChapter } from "../../features/linux-networking/interfaces-addresses-and-loopback";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { InterfacesAddressesLoopbackConceptCheck } from "./InterfacesAddressesLoopbackConceptCheck";
import { InterfacesAddressesLoopbackIncidentLab } from "./InterfacesAddressesLoopbackIncidentLab";
import { LinuxNetworkViewFigure } from "./LinuxNetworkViewFigure";
import { LinuxNetworkingHandoff } from "./LinuxNetworkingHandoff";
import "./interfaces-addresses-loopback-chapter.css";

const tocItems = {
  ko: [
    { id: "network-view", label: "한 호스트의 네트워크 상태" },
    { id: "identity-state", label: "존재와 링크 상태" },
    { id: "address-prefix", label: "주소와 프리픽스" },
    { id: "required-figure", label: "필수 상태 변화 실습" },
    { id: "incidents", label: "경계별 장애 복구" },
    { id: "real-linux", label: "실제 Linux 관찰" },
    { id: "transfer", label: "subnet으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "network-view", label: "One host's network state" },
    { id: "identity-state", label: "Existence and link state" },
    { id: "address-prefix", label: "Addresses and prefixes" },
    { id: "required-figure", label: "Required state-change lab" },
    { id: "incidents", label: "Repair boundary failures" },
    { id: "real-linux", label: "Observe real Linux" },
    { id: "transfer", label: "Transfer to subnets" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function InterfacesAddressesLoopbackChapter({
  learnerCount = 0,
  continuationAvailable = false,
}: {
  learnerCount?: number;
  continuationAvailable?: boolean;
}) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => (isKo ? ko : en);
  const chapters = isKo ? linuxNetworkingChaptersKo : linuxNetworkingChaptersEn;
  const chapter = chapters[0];
  const [figureMastered, setFigureMastered] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteInterfacesAddressesLoopbackChapter({
    labComplete: figureMastered,
    incidentsComplete,
    conceptsMastered,
  });

  return (
    <main className="chapter-shell linux-chapter-shell linux-network-foundations-chapter-shell">
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
            <span>CHAPTER 01</span>
            <div className="mini-progress"><span style={{ width: `${100 / chapters.length}%` }} /></div>
            <span>1 / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />

        <article className="lesson-article">
          <header className="lesson-hero linux-lesson-hero linux-network-foundations-hero">
            <p className="eyebrow">
              INTERFACE → LINK STATE → ADDRESS/PREFIX → LOOPBACK · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">01</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>네트워크를 처음 볼 때 <em>“eth0가 있다”</em>, <em>“UP이다”</em>, <em>“10.0.0.2/24가 있다”</em>를 한 문장으로 섞기 쉽습니다. 이번 챕터에서는 한 호스트의 네트워크 상태를 직접 바꿔 보며 이 차이를 분리합니다.</>
              ) : (
                <>It is easy to collapse <em>“eth0 exists,”</em> <em>“it is UP,”</em> and <em>“it has 10.0.0.2/24”</em> into one statement. This chapter lets you change one host's network state while keeping those facts separate.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("인터페이스의 존재, 관리 상태(admin), 연결 신호(carrier), 운용 상태(operstate)를 서로 다른 관찰 결과로 읽을 수 있다.", "Read interface existence, admin state, carrier, and operstate as separate observations.")}</li>
                <li>{t("MAC 주소와 IPv4 주소·프리픽스가 담당하는 정보를 구분할 수 있다.", "Distinguish a MAC address from an IPv4 address and prefix.")}</li>
                <li>{t("localhost 이름 해석과 lo를 통한 로컬 전달이 별도 단계임을 설명할 수 있다.", "Explain why localhost resolution and local delivery through lo are separate steps.")}</li>
                <li>{t("인터페이스·링크·주소·루프백 장애를 가장 작은 수정으로 복구할 수 있다.", "Repair interface, link, address, and loopback failures with the smallest change.")}</li>
                <li>{t("Linux 명령 출력에서 직접 확인한 사실과 아직 추론할 수 없는 사실을 구분할 수 있다.", "Separate facts observed in Linux command output from facts that still cannot be inferred.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="network-view">
            <div className="margin-label">01 — ONE HOST · NETWORK STATE</div>
            <h2>{t("한 호스트의 네트워크는 인터페이스와 각각의 상태로 이루어집니다", "One host's network is a set of interfaces and their states")}</h2>
            <p>
              {t(
                "이 챕터의 호스트에는 커널 네트워크 스택, 루프백 인터페이스 lo, Ethernet 인터페이스 eth0, localhost 이름 연결이 있습니다. 라우터·게이트웨이·ARP·소켓은 아직 다루지 않습니다. 먼저 한 호스트 내부의 상태를 정확히 읽은 뒤 다음 챕터에서 같은 링크와 원격 경로를 계산합니다.",
                "The fixed host in this chapter contains a kernel network stack, loopback interface lo, Ethernet interface eth0, and a localhost mapping. Routers, gateways, ARP, and sockets are deliberately absent. Reading the smallest state inside one host comes before computing same-link and remote paths in the next chapter.",
              )}
            </p>
            <div className="network-view-boundary" role="group" aria-label={t("이번 챕터에서 관찰할 호스트 네트워크 상태", "Host network state observed in this chapter")}>
              <span><small>OBJECT</small><strong>lo · eth0</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>STATE</small><strong>admin · carrier</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>IDENTITY</small><strong>MAC · IPv4/prefix</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>LOCAL PATH</small><strong>localhost · lo</strong></span>
            </div>
          </section>

          <section className="article-section" id="identity-state">
            <div className="margin-label">02 — EXISTENCE ≠ ADMIN ≠ CARRIER</div>
            <h2>{t("DOWN 행이 보인다면 인터페이스는 이미 존재합니다", "If a DOWN row is visible, the interface already exists")}</h2>
            <p>
              {isKo ? (
                <><code>ip -br link</code>의 <code>eth0 DOWN</code>에서 행은 인터페이스의 존재를, <code>DOWN</code> 열은 운용 상태(operstate)를 말합니다. admin 상태는 같은 행의 <code>&lt;...&gt;</code> flag 목록에서 <code>UP</code>의 유무로 따로 읽어야 합니다. 장치나 드라이버가 없다면 행 자체가 나타나지 않습니다. <code>ip link set eth0 up</code>은 admin flag만 바꾸며 케이블 또는 가상 peer의 연결 신호(carrier)를 만들어 내지 않으므로 operstate가 여전히 <code>DOWN</code>일 수 있습니다.</>
              ) : (
                <>In <code>ip -br link</code>, the <code>eth0</code> row proves the interface exists while the <code>DOWN</code> column reports operational state. Read admin state separately from the presence or absence of <code>UP</code> in the same row's <code>&lt;...&gt;</code> flags. A missing device or driver produces no row. <code>ip link set eth0 up</code> changes the admin flag only; it cannot create carrier from a cable or virtual peer, so operstate may remain <code>DOWN</code>.</>
              )}
            </p>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("UP flag ≠ operstate UP", "UP flag ≠ operstate UP")}</strong>
                <p>{t("관리자가 인터페이스를 켠 admin flag, 하위 계층의 carrier, 둘을 반영한 operstate는 별개입니다. 주소 할당 역시 어느 상태도 대신하지 않습니다.", "The admin flag, lower-layer carrier, and resulting operstate are separate axes. Address assignment replaces none of them.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="address-prefix">
            <div className="margin-label">03 — ADDRESS · PREFIX · LOOPBACK</div>
            <h2>{t("주소는 인터페이스에 붙고 프리픽스는 네트워크 경계를 만듭니다", "An address attaches to an interface; a prefix defines a network boundary")}</h2>
            <p>
              {isKo ? (
                <><code>10.0.0.2/24</code>에서 <code>10.0.0.2</code>는 이 인터페이스의 IPv4 주소이고 <code>/24</code>는 앞 24비트가 네트워크 영역이라는 규칙입니다. 따라서 <code>10.0.0.0/24</code> 네트워크가 파생됩니다. Ethernet의 MAC 주소와 IPv4 주소는 서로 다른 식별 정보이며, <code>lo</code>는 Ethernet 케이블이나 MAC 주소가 필요 없는 루프백 인터페이스입니다.</>
              ) : (
                <>In <code>10.0.0.2/24</code>, <code>10.0.0.2</code> is the interface IPv4 address and <code>/24</code> says the first 24 bits form the network portion, deriving <code>10.0.0.0/24</code>. An Ethernet MAC and IPv4 address are not the same identity, and <code>lo</code> is a loopback object that needs neither an Ethernet cable nor a MAC.</>
              )}
            </p>
            <p>
              {t(
                "localhost는 인터페이스 이름이 아니라 127.0.0.1로 해석되는 호스트 이름입니다. 이름 해석이 성공해도 lo가 down이면 로컬 전달은 실패할 수 있습니다. 이 경로는 eth0 프레임이나 기본 게이트웨이 구간을 만들지 않고 현재 호스트의 로컬 네트워크 스택 안에서 끝납니다.",
                "localhost is a hostname that resolves to 127.0.0.1, not an interface name. Resolution can succeed while local delivery fails because lo is down. The path creates neither an eth0 frame nor a default gateway hop; it ends inside the current host's local stack.",
              )}
            </p>
          </section>

          <section className="article-section" id="required-figure">
            <div className="margin-label">04 — REQUIRED STATE-CHANGE LAB</div>
            <h2>{t("명령 하나가 어떤 상태만 바꾸는지 직접 비교하세요", "Execute which state—and only which state—each command changes")}</h2>
            <p>{t("아래 실습에서 명령을 차례로 실행하며 그림, 상태표와 명령 출력이 함께 어떻게 바뀌는지 비교하세요. 마지막에는 주소를 남긴 채 lo를 내려 통신이 막히는 경우까지 확인합니다.", "Run the commands in order and compare how the diagram, state table, and command output change together. Finish by lowering lo while keeping its address and observe why delivery stops.")}</p>
            <LinuxNetworkViewFigure onMasteryChange={setFigureMastered} />
          </section>

          <section className="article-section" id="incidents">
            <div className="margin-label">05 — REPAIR THE BROKEN BOUNDARY</div>
            <h2>{t("증상이 비슷해도 고장 난 경계는 다를 수 있습니다", "Similar symptoms can come from different broken boundaries")}</h2>
            <p>{t("각 사건은 정상 상태에서 한 가지 조건만 고장 납니다. 관찰 결과를 읽고 필요한 최소 조치만 실행하세요. 관련 없는 상태까지 바꾸는 전체 초기화는 정답이 아닙니다.", "Each incident changes one condition from a healthy starting point. Read the observations and apply only the necessary fix. A broad reset that changes unrelated state is not a valid answer.")}</p>
            <InterfacesAddressesLoopbackIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="real-linux">
            <div className="margin-label">06 — OPTIONAL REAL LINUX OBSERVATION</div>
            <h2>{t("실제 Linux에서도 같은 상태를 확인해 보세요", "Check the same states on a real Linux system")}</h2>
            <p>{t("로컬 Linux나 VM이 있다면 다음 조회 명령으로 인터페이스 이름, 링크 상태, 주소와 로컬 경로를 따로 확인할 수 있습니다. 인터페이스 이름과 출력은 배포판·VM·네트워크 네임스페이스에 따라 달라집니다. 이 선택 실습은 챕터 완료에 필요하지 않으며 root 권한이나 외부 네트워크도 요구하지 않습니다.", "If a local Linux machine or VM is available, these read-only commands inspect interface names, link state, addresses, and the local route separately. Interface names and output vary by distribution, VM, and network namespace. This optional lab is not required for completion and needs neither root nor external network access.")}</p>
            <pre className="network-view-observation-command" aria-label={t("선택 Linux 네트워크 관찰 명령", "Optional Linux network observation commands")}><code>{`ip -br link\nip -details link show dev eth0\ncat /sys/class/net/eth0/operstate\nip -br -4 address\nip route get 127.0.0.1\ngetent ahostsv4 localhost`}</code></pre>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">07 — TRANSFER TO SUBNETS</div>
            <h2>{t("다음에는 /24를 same-link 판정에 사용합니다", "Next, use /24 to decide same-link reachability")}</h2>
            <div className="network-view-transfer-task">
              <strong>{t("전이 문제", "TRANSFER QUESTION")}</strong>
              <p>{isKo ? <>이 host가 <code>10.0.0.44</code>와 <code>203.0.113.20</code>으로 보낼 때 어느 목적지가 <code>10.0.0.0/24</code> 안에 있을까요? 아직 ARP나 gateway를 추측하지 말고 address와 prefix만으로 답을 준비하세요.</> : <>When this host sends to <code>10.0.0.44</code> and <code>203.0.113.20</code>, which destination belongs to <code>10.0.0.0/24</code>? Do not guess ARP or a gateway yet; prepare the answer from the address and prefix alone.</>}</p>
            </div>
            <LinuxNetworkingHandoff
              targetChapter="network-namespaces-and-boundaries"
              preview={preview}
              continuationAvailable={continuationAvailable}
            />
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">08 — CONCEPT CHECK</div>
            <InterfacesAddressesLoopbackConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="network-view-completion-checklist" role="status" aria-live="polite">
              <span className={figureMastered ? "is-complete" : undefined}>{figureMastered ? "✓" : "○"} {t("필수 상태 변화 실습", "Required state-change lab")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네 가지 경계 장애 복구", "Four boundary repairs")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("다섯 개념 확인", "Five concept checks")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={LINUX_NETWORKING_CURRICULUM_SLUG}
              slug="interfaces-addresses-and-loopback"
              canComplete={canComplete}
              lockedMessage={t("필수 상태 변화 실습의 모든 단계, 네 가지 장애 복구와 다섯 개념 확인을 완료하세요.", "Complete every required state-change step, all four incident repairs, and all five concept checks.")}
            />
          </section>

          <CitationSection
            citations={[
              {
                title: "Operating Systems: Three Easy Pieces (OSTEP)",
                url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
              },
              {
                title: "TCP/IP Illustrated (Stevens, Fall & Stevens)",
                url: "https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/",
              },
            ]}
          />

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? (
              <a href={`/admin/preview/curricula/${LINUX_NETWORKING_CURRICULUM_SLUG}${isKo ? "" : "?lang=en"}`}>
                ← {t("커리큘럼 미리보기로", "Back to curriculum preview")}
              </a>
            ) : (
              <Link to="/curricula/$curriculumSlug" params={{ curriculumSlug: LINUX_NETWORKING_CURRICULUM_SLUG }} search={isKo ? {} : { lang: "en" }}>
                ← {t("커리큘럼으로", "Back to curriculum")}
              </Link>
            )}
            {preview ? (
              <a href={`/admin/preview/curricula/${LINUX_NETWORKING_CURRICULUM_SLUG}/chapters/subnets-neighbors-and-gateways${isKo ? "" : "?lang=en"}`}>
                {t("다음: 서브넷·이웃·게이트웨이", "Next: Subnets, Neighbors, and Gateways")} →
              </a>
            ) : (
              <Link to="/curricula/$curriculumSlug/chapters/$chapterSlug" params={{ curriculumSlug: LINUX_NETWORKING_CURRICULUM_SLUG, chapterSlug: "subnets-neighbors-and-gateways" }} search={isKo ? {} : { lang: "en" }}>
                {t("다음: 서브넷·이웃·게이트웨이", "Next: Subnets, Neighbors, and Gateways")} →
              </Link>
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
