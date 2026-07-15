import { useEffect, useState } from "react";
import {
  networkMatrices,
  type XorNetworkRun,
} from "../../features/neural-networks/forward-pass";
import { useLocale } from "../../features/localization/localization";
import { MatrixGrid } from "../interactive/MatrixGrid";

function formatNumber(value: number) {
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, "");
  if (Math.abs(value) < 0.001) return "0";
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function NeuralNetworkStateView({ run }: { run: XorNetworkRun }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [selectedRow, setSelectedRow] = useState(0);
  const matrices = networkMatrices(run.config);
  const hiddenValues = run.rows.map((row) => [...row.hiddenActivation]);
  const selected = run.rows[selectedRow];

  useEffect(() => {
    setSelectedRow(0);
  }, [run]);

  return (
    <div className="neural-state-view">
      <div className="neural-matrix-flow" aria-label={t("신경망 행렬 shape 흐름", "Neural-network matrix shape flow")}>
        <MatrixGrid
          values={matrices.firstWeights}
          label="W¹ [2, 2]"
          rowLabels={["x₁", "x₂"]}
          columnLabels={["h₁", "h₂"]}
          tone="indigo"
          formatValue={formatNumber}
        />
        <span aria-hidden="true">→</span>
        <MatrixGrid
          values={hiddenValues}
          label="H [4, 2]"
          rowLabels={["00", "01", "10", "11"]}
          columnLabels={["h₁", "h₂"]}
          selectedRow={selectedRow}
          tone="forest"
          formatValue={formatNumber}
        />
        <span aria-hidden="true">×</span>
        <MatrixGrid
          values={matrices.secondWeights}
          label="W² [2, 1]"
          rowLabels={["h₁", "h₂"]}
          columnLabels={["z²"]}
          tone="terra"
          formatValue={formatNumber}
        />
      </div>

      <div className="neural-truth-grid" role="group" aria-label={t("추적할 XOR 입력 선택", "Choose an XOR input to trace")}>
        {run.rows.map((row, index) => {
          const active = index === selectedRow;
          const correct = row.predictedClass === row.label;
          return (
            <button
              type="button"
              className={`neural-truth-card${active ? " is-active" : ""}${correct ? " is-correct" : " is-incorrect"}`}
              aria-pressed={active}
              onClick={() => setSelectedRow(index)}
              key={row.input.join("")}
            >
              <span>x = [{row.input.join(", ")}]</span>
              <strong>p = {formatNumber(row.probability)}</strong>
              <small>
                {t("예측", "pred")} {row.predictedClass} · {t("정답", "label")} {row.label} · {correct ? "✓" : "✕"}
              </small>
            </button>
          );
        })}
      </div>

      <article className="neural-row-trace" aria-label={t(`XOR ${selectedRow + 1}번째 행 계산`, `XOR row ${selectedRow + 1} calculation`)}>
        <header>
          <span>{t("선택한 행의 forward pass", "SELECTED ROW FORWARD PASS")}</span>
          <strong>x = [{selected.input.join(", ")}] → y = {selected.label}</strong>
        </header>
        <dl>
          <div>
            <dt>z¹ = xW¹ + b¹</dt>
            <dd>[{selected.hiddenPreActivation.map(formatNumber).join(", ")}]</dd>
          </div>
          <div>
            <dt>H = {run.config.activation}(z¹)</dt>
            <dd>[{selected.hiddenActivation.map(formatNumber).join(", ")}]</dd>
          </div>
          <div>
            <dt>z² = HW² + b²</dt>
            <dd>{formatNumber(selected.logit)}</dd>
          </div>
          <div>
            <dt>p = sigmoid(z²)</dt>
            <dd>{formatNumber(selected.probability)}</dd>
          </div>
          <div>
            <dt>BCE</dt>
            <dd>{formatNumber(selected.loss)}</dd>
          </div>
        </dl>
        <p>
          {t(
            `첫 bias b¹=[${matrices.firstBias[0].join(", ")}], 마지막 bias b²=${matrices.secondBias}까지 각 행에 broadcast됩니다.`,
            `The first bias b¹=[${matrices.firstBias[0].join(", ")}] and final bias b²=${matrices.secondBias} are broadcast across every row.`,
          )}
        </p>
      </article>
    </div>
  );
}
