import { useLocale } from "../features/localization/localization";
import "../styles/learning-path.css";

const terms = [
  { english: "fixture", ko: "실험용 고정 예시", definitionKo: "조건을 하나씩 바꿔 비교할 수 있도록 입력과 설정을 정해 둔 예시입니다. 실제 서비스의 모든 상황을 대표하지는 않습니다.", definitionEn: "A fixed set of inputs and settings for a controlled comparison, not a model of every real-world case." },
  { english: "canonical", ko: "이 실습의 기준 상태", definitionKo: "비교의 출발점으로 정한 설정입니다. 다른 설계가 모두 틀렸다는 뜻은 아닙니다.", definitionEn: "The reference setup for this exercise. Other designs are not necessarily wrong." },
  { english: "invariant", ko: "변경 후에도 지킬 조건", definitionKo: "설정을 바꾼 뒤에도 유지되어야 하는 규칙입니다. 예를 들어 행렬의 곱셈에 필요한 축 크기입니다.", definitionEn: "A rule that must still hold after a change, such as compatible matrix dimensions." },
  { english: "receipt / evaluator", ko: "실행 기록 / 확인 규칙", definitionKo: "실행 기록은 입력과 결과를 남깁니다. 확인 규칙은 그 결과가 이번 실습의 목표를 충족하는지 판단합니다.", definitionEn: "A run record keeps the inputs and results. A check evaluates whether those results meet this exercise's goal." },
  { english: "challenge / debugger", ko: "실습 과제 / 원인 찾기", definitionKo: "과제에서는 결과를 예측하고 실행합니다. 원인 찾기에서는 잘못된 설정을 찾아 고친 뒤 다시 확인합니다. 필수 여부는 각 활동의 안내를 따릅니다.", definitionEn: "A task asks you to predict and run. A debugging exercise asks you to locate, repair, and recheck a broken setting. Each activity states whether it is required." },
] as const;

export function LearningLabGlossary() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  return (
    <details className="learning-lab-glossary">
      <summary>{isKo ? "실습 안내 용어 풀이" : "Terms used in exercise instructions"}</summary>
      <dl>
        {terms.map((term) => (
          <div key={term.english}>
            <dt>{isKo ? term.ko : term.english}{isKo ? <span> ({term.english})</span> : null}</dt>
            <dd>{isKo ? term.definitionKo : term.definitionEn}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
