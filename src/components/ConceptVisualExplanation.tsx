type ConceptVisualKind =
  | "orientation"
  | "normalization"
  | "tensor-shape"
  | "broadcast"
  | "dot-product"
  | "attention-context";

type ConceptVisualExplanationProps = {
  kind: ConceptVisualKind;
};
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";
import { MatrixGlyph } from "./interactive/MatrixGlyph";

export function ConceptVisualExplanation({ kind }: ConceptVisualExplanationProps) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  if (kind === "orientation") {
    return (
      <figure className="answer-visual" role="img" aria-label={t("행벡터 1, 2, 3과 열벡터 10, 20, 30이 두 축으로 펼쳐져 11부터 33까지의 3행 3열 행렬이 되는 브로드캐스팅 그림", "Broadcasting diagram where row vector 1, 2, 3 and column vector 10, 20, 30 expand into a 3 by 3 matrix from 11 to 33")}>
        <figcaption><span>{t("그림으로 확인", "SEE IT VISUALLY")}</span> {t("서로 비어 있는 축이 각각 3칸으로 펼쳐집니다.", "Each missing axis expands to three positions.")}</figcaption>
        <div className="answer-visual-equation" aria-hidden="true">
          <MatrixGlyph rows={1} columns={3} label="(1, 3)" values={[1, 2, 3]} />
          <strong>+</strong>
          <MatrixGlyph rows={3} columns={1} label="(3, 1)" tone="indigo" values={[10, 20, 30]} />
          <strong>→</strong>
          <MatrixGlyph rows={3} columns={3} label="(3, 3)" tone="terra" values={[11, 12, 13, 21, 22, 23, 31, 32, 33]} />
        </div>
      </figure>
    );
  }

  if (kind === "normalization") {
    return (
      <figure className="answer-visual" role="img" aria-label={t("영벡터의 길이가 0이므로 벡터를 길이 0으로 나눌 수 없다는 그림", "Diagram showing that the zero vector cannot be divided by its length because that length is zero")}>
        <figcaption><span>{t("그림으로 확인", "SEE IT VISUALLY")}</span> {t("화살표가 원점에 머물러 길이가 없습니다.", "The arrow stays at the origin and has no length.")}</figcaption>
        <div className="zero-vector-visual" aria-hidden="true">
          <div className="mini-coordinate-plane"><i /><b>0</b></div>
          <div className="zero-vector-steps">
            <MathFormula latex={String.raw`\lVert [0, 0] \rVert_2 = 0`} />
            <strong>÷ 0</strong>
            <span className="zero-vector-undefined">{t("정의되지 않음", "Undefined")}</span>
          </div>
        </div>
      </figure>
    );
  }

  if (kind === "tensor-shape") {
    return (
      <figure className="answer-visual" role="img" aria-label={t("문장 2개, 문장마다 토큰 4개, 토큰마다 숫자 8개가 쌓여 shape 2, 4, 8이 되는 그림", "Diagram stacking two sentences, four tokens per sentence, and eight numbers per token into shape 2, 4, 8")}>
        <figcaption><span>{t("그림으로 확인", "SEE IT VISUALLY")}</span> {t("바깥에서 안쪽으로 batch → tokens → d_model입니다.", "From outside to inside: batch → tokens → d_model.")}</figcaption>
        <div className="tensor-answer-visual" aria-hidden="true">
          {[0, 1].map((batch) => (
            <div className="tensor-answer-sheet" key={batch}>
              <span>{isKo ? "문장" : "sentence"} {batch + 1}</span>
              {Array.from({ length: 4 }, (_, token) => (
                <div className="tensor-answer-token" key={token}>
                  {Array.from({ length: 8 }, (_, dimension) => <i key={dimension} />)}
                </div>
              ))}
            </div>
          ))}
          <div className="tensor-answer-labels">
            <b><em>batch</em>2</b><span>×</span>
            <b><em>tokens</em>4</b><span>×</span>
            <b><em>d_model</em>8</b>
          </div>
        </div>
      </figure>
    );
  }

  if (kind === "broadcast") {
    return (
      <figure className="answer-visual" role="img" aria-label={t("위치 행렬 4, 8이 두 문장 각각에 반복되어 결과 shape 2, 4, 8이 유지되는 그림", "Diagram repeating a 4 by 8 positional matrix for each of two sentences while preserving result shape 2, 4, 8")}>
        <figcaption><span>{t("그림으로 확인", "SEE IT VISUALLY")}</span> {t("위치 행렬을 각 문장에 한 번씩 더합니다.", "Add the positional matrix once to each sentence.")}</figcaption>
        <div className="broadcast-answer-visual" aria-hidden="true">
          <div className="broadcast-batches"><i /><i /><code>[2, 4, 8]</code></div>
          <strong>+</strong>
          <div className="broadcast-position"><i /><code>[4, 8]</code><small>× {isKo ? "문장 2개" : "2 sentences"}</small></div>
          <strong>→</strong>
          <div className="broadcast-batches broadcast-result"><i /><i /><code>[2, 4, 8]</code></div>
        </div>
      </figure>
    );
  }

  if (kind === "dot-product") {
    return (
      <figure className="answer-visual" role="img" aria-label={t("서로 직각인 두 벡터의 각도가 90도이고 내적과 코사인 유사도가 모두 0인 그림", "Diagram of two perpendicular vectors at 90 degrees with dot product and cosine similarity both equal to zero")}>
        <figcaption><span>{t("그림으로 확인", "SEE IT VISUALLY")}</span> {t("두 화살표가 만드는 각이 90°입니다.", "The angle between the two arrows is 90°.")}</figcaption>
        <div className="right-angle-visual" aria-hidden="true">
          <div className="right-angle-plane"><i className="arrow-up" /><i className="arrow-right" /><b>90°</b></div>
          <div>
            <MathFormula latex={String.raw`\cos 90^\circ = 0`} />
            <strong><MathFormula latex={String.raw`\therefore\; \mathbf{a} \cdot \mathbf{b} = 0`} /> <span className="sr-only">{t("따라서 내적은 0", "Therefore the dot product is zero")}</span></strong>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className="answer-visual" role="img" aria-label={t("3행 3열 Attention 가중치와 3행 4열 값 벡터를 곱해 3행 4열 컨텍스트 벡터가 되는 그림", "Diagram multiplying 3 by 3 Attention weights by 3 by 4 value vectors to produce 3 by 4 context vectors")}>
      <figcaption><span>{t("그림으로 확인", "SEE IT VISUALLY")}</span> {t("맞닿는 3은 사라지고 바깥의 3과 4가 남습니다.", "The matching inner 3 contracts, leaving the outer 3 and 4.")}</figcaption>
      <div className="answer-visual-equation attention-shape-visual" aria-hidden="true">
        <MatrixGlyph rows={3} columns={3} label="weights [3, 3]" />
        <strong>@</strong>
        <MatrixGlyph rows={3} columns={4} label="values [3, 4]" tone="indigo" />
        <strong>→</strong>
        <MatrixGlyph rows={3} columns={4} label="context [3, 4]" tone="terra" />
      </div>
    </figure>
  );
}
