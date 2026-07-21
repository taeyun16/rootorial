import { Link } from "@tanstack/react-router";
import { INFRASTRUCTURE_CURRICULUM_SLUG } from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { navigationHasCurriculum } from "../../features/chapters/chapter-navigation";
import { useChapterNavigationAccess } from "../ChapterSequenceNavigation";
import "./linux-networking-handoff.css";

export function LinuxNetworkingHandoff({ targetChapter, preview, continuationAvailable = false }: { targetChapter: string; preview: boolean; continuationAvailable?: boolean }) {
  const { locale } = useLocale();
  const navigation = useChapterNavigationAccess();
  const isKo = locale === "ko";
  const canContinue = continuationAvailable
    || navigationHasCurriculum(navigation, INFRASTRUCTURE_CURRICULUM_SLUG);
  const href = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/${targetChapter}${isKo ? "" : "?lang=en"}`;
  const bodies: Record<string, { ko: string; en: string }> = {
    "network-namespaces-and-boundaries": { ko: "한 호스트에서 읽은 인터페이스·주소·루프백·소켓 상태를 여러 namespace의 독립된 네트워크 상태로 확장합니다.", en: "Extend interface, address, loopback, and socket state from one host into independent network views across namespaces." },
    "veth-bridges-and-routing": { ko: "같은 링크·다음 홉·경로 선택 규칙을 veth, bridge와 router namespace를 조립하는 설계 판단으로 확장합니다.", en: "Extend same-link, next-hop, and route-selection rules into design decisions for veth pairs, bridges, and router namespaces." },
    "service-discovery-and-load-balancing": { ko: "DNS와 endpoint 검증을 여러 서비스 인스턴스의 발견·상태·부하 분산 계약으로 확장합니다.", en: "Extend DNS and endpoint verification into discovery, health, and load-balancing contracts across service instances." },
    "network-observability-and-capacity": { ko: "첫 실패 경계를 찾는 진단 순서를 namespace·NAT·policy를 가로지르는 관측과 용량 설계 계약으로 확장합니다.", en: "Extend first-failure diagnosis into observability and capacity contracts across namespaces, NAT, and policy boundaries." },
  };
  const body = (bodies[targetChapter] ?? bodies["veth-bridges-and-routing"])[isKo ? "ko" : "en"];
  return (
    <aside className="linux-networking-handoff" aria-label={isKo ? "인프라 설계로 이어지는 학습 경로" : "Learning path into infrastructure design"}>
      <div><p className="section-index">FOUNDATION → INFRASTRUCTURE DESIGN</p><h3>{isKo ? "같은 증거를 다음 설계에서 다시 사용합니다" : "Reuse the same evidence in the next design"}</h3><p>{body}</p></div>
      {preview ? <a href={href}>{isKo ? "연결된 설계 챕터 미리보기" : "Preview the connected design chapter"} <span aria-hidden="true">→</span></a> : canContinue ? <Link to="/curricula/$curriculumSlug" params={{ curriculumSlug: INFRASTRUCTURE_CURRICULUM_SLUG }} search={isKo ? {} : { lang: "en" }}>{isKo ? "인프라 설계 커리큘럼 보기" : "View infrastructure design"} <span aria-hidden="true">→</span></Link> : <span className="linux-networking-handoff-disabled" aria-disabled="true">{isKo ? "인프라 설계 커리큘럼 공개 준비 중" : "Infrastructure design is still in draft"}</span>}
    </aside>
  );
}
