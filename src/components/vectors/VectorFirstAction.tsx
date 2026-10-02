import { useState } from "react";
import { useLocale } from "../../features/localization/localization";

/** A short introduction, independent of the required completion evidence. */
export function VectorFirstAction() {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [prediction, setPrediction] = useState("");
  const [checked, setChecked] = useState(false);
  return <section className="vector-first-action" id="vector-first-action" aria-labelledby="vector-first-action-title">
    <h2 id="vector-first-action-title">{t("첫 조작 · [3, 2]를 두 배로", "First action · double [3, 2]")}</h2>
    <p>{t("오른쪽 3, 위로 2인 화살표에 2를 곱합니다. 끝 좌표부터 예측하세요.", "Multiply an arrow pointing 3 right and 2 up by 2. Predict its endpoint first.")}</p>
    <fieldset><legend>{t("예상 끝 좌표", "Predicted endpoint")}</legend>
      {["[6, 4]", "[3, 2]", "[5, 4]"].map(value => <label key={value}><input type="radio" name="first-vector-prediction" value={value} checked={prediction === value} onChange={() => { setPrediction(value); setChecked(false); }} />{value}</label>)}
    </fieldset>
    <button type="button" className="button button-secondary" disabled={!prediction} onClick={() => setChecked(true)}>{t("예측 확인", "Check prediction")}</button>
    {checked && <p role="status">{t("예측", "Prediction")}: {prediction} · {t("실제", "Actual")}: [6, 4]. {t("좌표마다 2를 곱해 크기는 두 배, 방향은 같습니다.", "Each coordinate doubles: twice the magnitude, same direction.")}</p>}
    <nav><a href="#basics">{t("숫자를 바꿔 더 실험하기", "Experiment with other values")}</a><a href="#orientation">{t("첫 필수 실습 · 배열 구조 맞히기", "First required exercise · array shapes")}</a></nav>
    <small>{t("이 첫 조작은 완료 조건이 아닙니다. 필수 경로는 배열 구조 → 축 조립 → 이해 확인입니다.", "This introduction is outside completion. The required path is array shapes → axis assembly → concept check.")}</small>
  </section>;
}
