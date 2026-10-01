export function vectorReadiness(
  evidence: { axis: boolean; shape: boolean; concepts: boolean },
  locale: "ko" | "en",
) {
  const labels = locale === "ko"
    ? { axis: "축 조립 세 연산", shape: "shape 탐정 세 미션", concepts: "이해 확인 5문제" }
    : { axis: "Axis Builder: three operations", shape: "Shape Detective: three missions", concepts: "five concept-check questions" };
  const missing = (Object.keys(labels) as Array<keyof typeof labels>)
    .filter((key) => !evidence[key]).map((key) => labels[key]);
  return {
    ready: missing.length === 0,
    missing,
    message: missing.length
      ? `${locale === "ko" ? "남은 조건" : "Remaining"}: ${missing.join(" · ")}`
      : locale === "ko" ? "모든 필수 실습과 이해 확인을 마쳤습니다. 챕터를 완료할 수 있습니다." : "All required practice and checks are finished. You can complete the chapter.",
  };
}
