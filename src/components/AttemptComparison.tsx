import { useLocale } from "../features/localization/localization";

export type AttemptValues = Record<string, string>;
/** Values are supplied by submitted snapshots; never calculate a future answer here. */
export function AttemptComparison({ previous, current, executed }: { previous: AttemptValues | null; current: AttemptValues; executed: boolean }) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  if (!previous) return null;
  return <div className="attempt-comparison" data-current-result={executed ? "current" : "unexecuted"}>
    <p>{t("재시도 비교 · 지난 결과는 현재 답안의 확인 증거가 아닙니다.", "Retry comparison · previous results do not verify the current answer.")}</p>
    <table><thead><tr><th scope="col">{t("항목", "Value")}</th><th scope="col">{t("지난 실행", "Previous run")}</th><th scope="col">{executed ? t("현재 실행", "Current run") : t("현재 입력 · 미실행", "Current inputs · not run")}</th></tr></thead>
      <tbody>{Object.entries(current).map(([label,value]) => <tr key={label}><th scope="row">{label}</th><td>{previous[label] ?? "—"}</td><td>{value}</td></tr>)}</tbody>
    </table>
  </div>;
}
