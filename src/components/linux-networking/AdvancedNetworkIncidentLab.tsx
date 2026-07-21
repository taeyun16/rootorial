import { useEffect, useState } from "react";
import { canCompleteAdvancedIncidents, evaluateAdvancedIncident, type AdvancedChapterConfig } from "../../features/linux-networking/advanced-networking";
import { useLocale } from "../../features/localization/localization";

export function AdvancedNetworkIncidentLab({ config, onCompletionChange }: { config: AdvancedChapterConfig; onCompletionChange: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const [repairs, setRepairs] = useState<Record<string, string>>({});
  const complete = canCompleteAdvancedIncidents(config.slug, repairs);
  useEffect(() => onCompletionChange(complete), [complete, onCompletionChange]);
  return <div className="advanced-incident-lab">
    {config.incidents.map((incident, index) => {
      const selected = repairs[incident.id];
      const correct = selected ? evaluateAdvancedIncident(config.slug, incident.id, selected) : false;
      return <article key={incident.id} className={`advanced-incident${selected ? correct ? " is-correct" : " is-wrong" : ""}`}>
        <header><span>INCIDENT {String(index + 1).padStart(2, "0")}</span><h3>{incident.title[locale]}</h3><p>{incident.symptom[locale]}</p></header>
        <pre><code>{incident.evidence}</code></pre>
        <div className="advanced-repair-actions" role="group" aria-label={locale === "ko" ? `${incident.title.ko} 복구 선택` : `Repairs for ${incident.title.en}`}>
          {incident.repairs.map((candidate) => <button type="button" key={candidate.id} className={selected === candidate.id ? "is-selected" : undefined} onClick={() => setRepairs((current) => ({ ...current, [incident.id]: candidate.id }))}>{candidate.label[locale]}</button>)}
        </div>
        {selected ? <p className="advanced-repair-result" role="status"><strong>{correct ? locale === "ko" ? "복구 완료" : "Repaired" : locale === "ko" ? "증거와 맞지 않습니다" : "Does not match the evidence"}</strong>{correct ? incident.explanation[locale] : locale === "ko" ? "증상이 처음 끊기는 경계를 다시 확인하세요." : "Locate the first boundary where the symptom breaks."}</p> : null}
      </article>;
    })}
    <p className="advanced-incident-progress" role="status">{complete ? locale === "ko" ? "모든 사건을 최소 변경으로 복구했습니다." : "Every incident is repaired with a minimal change." : `${Object.keys(repairs).filter((id) => evaluateAdvancedIncident(config.slug, id, repairs[id])).length} / ${config.incidents.length} ${locale === "ko" ? "사건 복구" : "incidents repaired"}`}</p>
  </div>;
}
