import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  neuralNetworksHiddenRepairCode,
  neuralNetworksHiddenRepairCodeEn,
  neuralNetworksLinearBoundaryCode,
  neuralNetworksLinearBoundaryCodeEn,
} from "../../data/neuralNetworksNotebook";
import { useLocale } from "../../features/localization/localization";
import { canCompleteNeuralNetworksChapter } from "../../features/neural-networks/forward-pass";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { ArrayDiagram } from "../interactive/ArrayDiagram";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { MathFormula } from "../MathFormula";
import { NotebookCell } from "../NotebookCell";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { PythonCode } from "../PythonCode";
import { RootorialMark } from "../RootorialMark";
import { TransformerLearningGuide } from "../TransformerLearningGuide";
import { NeuralNetworkBackpropLab } from "./NeuralNetworkBackpropLab";
import { NeuralNetworkDebuggerLab } from "./NeuralNetworkDebuggerLab";
import { NeuralNetworksConceptCheck } from "./NeuralNetworksConceptCheck";
import { NeuralNetworkXorLab } from "./NeuralNetworkXorLab";

const tocItems = {
  ko: [
    { id: "logit", label: "점수에서 확률로" },
    { id: "bce", label: "확신까지 읽는 loss" },
    { id: "linear-limit", label: "직선 경계의 한계" },
    { id: "hidden", label: "hidden feature" },
    { id: "xor-lab", label: "필수 XOR 실습" },
    { id: "backprop-lab", label: "필수 hidden backprop" },
    { id: "numpy-bridge", label: "NumPy로 다시 만들기" },
    { id: "debug", label: "선택 · 네트워크 수술" },
    { id: "transfer", label: "batch·class로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "logit", label: "From scores to probabilities" },
    { id: "bce", label: "Loss that reads confidence" },
    { id: "linear-limit", label: "The limit of one line" },
    { id: "hidden", label: "Hidden features" },
    { id: "xor-lab", label: "Required XOR lab" },
    { id: "backprop-lab", label: "Required hidden backprop" },
    { id: "numpy-bridge", label: "Rebuild it in NumPy" },
    { id: "debug", label: "Optional · Network surgery" },
    { id: "transfer", label: "Transfer to batches and classes" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function NeuralNetworksChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "neural-networks");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [xorLabComplete, setXorLabComplete] = useState(false);
  const [backpropLabComplete, setBackpropLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteNeuralNetworksChapter({
    xorLabComplete,
    backpropLabComplete,
    debuggerComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/optimization${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell neural-networks-chapter-shell">
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
            <div className="mini-progress"><span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} /></div>
            <span>{chapterNumber} / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />

        <article className="lesson-article">
          <header className="lesson-hero neural-networks-hero">
            <p className="eyebrow">
              LOGIT → ACTIVATION → PROBABILITY → LOSS → BACKPROP · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">03</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>직선 하나가 표현하지 못하는 규칙은 더 오래 학습한다고 생기지 않습니다. 뉴런은 affine 점수를 <em>활성화</em>해 중간 feature를 만들고, loss 신호는 같은 경로를 거꾸로 돌아 두 층의 weight를 바꿉니다.</>
              ) : (
                <>Training longer cannot create a rule that one line cannot represent. A neuron <em>activates</em> an affine score into an intermediate feature, then the loss signal travels back through the same path to change both layers of weights.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("z=Xw+b의 logit, sigmoid probability와 threshold class를 구분할 수 있다.", "Distinguish logits from z=Xw+b, sigmoid probabilities, and thresholded classes.")}</li>
                <li>{t("BCE가 정답 class에 배정한 확률을 읽고 확신한 오답을 더 크게 벌점 주는 이유를 설명할 수 있다.", "Explain why BCE reads probability assigned to the true class and penalizes confident wrong predictions most.")}</li>
                <li>{t("단일 affine+sigmoid와 activation 없는 연속 affine이 XOR을 표현하지 못함을 예측할 수 있다.", "Predict why one affine+sigmoid—or stacked affine maps without activation—cannot represent XOR.")}</li>
                <li>{t("X[4,2]→hidden[4,2]→logit[4,1]의 값과 shape를 추적하고 두 hidden feature로 XOR을 조립할 수 있다.", "Trace values and shapes through X[4,2]→hidden[4,2]→logit[4,1] and assemble XOR from two hidden features.")}</li>
                <li>{t("BCE→output logit→hidden activation→W¹의 chain rule을 추적하고 parameter-shaped gradient로 loss를 줄이는 update를 검증할 수 있다.", "Trace the chain rule from BCE through the output logit and hidden activation to W¹, then verify a loss-reducing update with parameter-shaped gradients.")}</li>
              </ul>
            </div>
          </header>

          <TransformerLearningGuide chapterSlug="neural-networks" />

          <section className="article-section" id="logit">
            <div className="margin-label">01 — LOGIT</div>
            <h2>{t("지난 장의 선형 예측이 뉴런의 logit이 됩니다", "The previous chapter's linear prediction becomes a neuron's logit")}</h2>
            <p>
              {isKo ? <><PythonCode>z = x @ w + b</PythonCode>는 아직 확률이 아닌 제한 없는 점수입니다. sigmoid는 큰 양수를 1 가까이, 큰 음수를 0 가까이 보내고 z=0을 p=0.5로 보냅니다. threshold는 그 다음에 probability를 class로 읽습니다.</> : <><PythonCode>z = x @ w + b</PythonCode> is an unbounded score, not yet a probability. Sigmoid sends large positive values near 1, large negative values near 0, and z=0 to p=0.5. A threshold only then reads the probability as a class.</>}
            </p>
            <div className="concept-callout neural-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("벡터의 행별 내적과 bias broadcasting, 이전 장의 loss·gradient·update만 사용합니다. 먼저 forward 표현력을 조립한 뒤 마지막 필수 lab에서 그 update를 hidden layer까지 확장합니다.", "Use row-wise dot products, bias broadcasting, and the previous chapter's loss-gradient-update loop. First assemble forward expressiveness, then extend that update through a hidden layer in the final required lab.")}</p>
                {preview ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a> : <span>{t("이전: 학습과 최적화", "Previous: Learning and Optimization")}</span>}
              </div>
            </div>
            <div className="neural-equation-flow">
              <article><span>LOGIT</span><MathFormula latex={String.raw`z=\mathbf{x}\cdot\mathbf{w}+b`} display /><p>{t("제한 없는 점수", "unbounded score")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>PROBABILITY</span><MathFormula latex={String.raw`p=\sigma(z)=\frac{1}{1+e^{-z}}`} display /><p>0 &lt; p &lt; 1</p></article>
              <span aria-hidden="true">→</span>
              <article><span>CLASS</span><MathFormula latex={String.raw`\widehat y=\mathbb{1}[p\ge 0.5]`} display /><p>{t("결정 규칙", "decision rule")}</p></article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("sigmoid가 복잡한 경계를 만드는 것은 아닙니다", "Sigmoid alone does not create a complex boundary")}</strong>
                <p>{t("p=0.5가 되는 곳은 z=0, 즉 x·w+b=0인 한 직선입니다. sigmoid는 점수를 확률로 휘지만 그 threshold 경계 자체는 여전히 직선입니다.", "The p=0.5 location is z=0, or x·w+b=0: one line. Sigmoid bends scores into probabilities, but its threshold boundary remains linear.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="bce">
            <div className="margin-label">02 — BCE</div>
            <h2>{t("BCE는 class뿐 아니라 확신의 질을 읽습니다", "BCE reads confidence, not just the class")}</h2>
            <p>{t("accuracy는 p=0.49와 p=0.01을 같은 오답으로 셉니다. BCE는 정답이 1일 때 -log(p)를 사용하므로 0에 가까운 확신한 오답을 훨씬 비싸게 만듭니다. 이 연속적인 차이가 다음 update의 방향을 만듭니다.", "Accuracy counts p=0.49 and p=0.01 as the same wrong class. For label 1, BCE uses -log(p), making a confident probability near zero much more expensive. That continuous difference supplies the next update signal.")}</p>
            <div className="neural-bce-grid">
              <article className="is-good"><span>y=1 · p=0.90</span><strong>BCE ≈ 0.105</strong><p>{t("정답에 높은 확률", "High probability on the true class")}</p></article>
              <article><span>y=1 · p=0.49</span><strong>BCE ≈ 0.713</strong><p>{t("조금 틀림", "Barely wrong")}</p></article>
              <article className="is-bad"><span>y=1 · p=0.01</span><strong>BCE ≈ 4.605</strong><p>{t("확신한 오답", "Confidently wrong")}</p></article>
            </div>
            <MathFormula latex={String.raw`\operatorname{BCE}(y,p)=-\left[y\log p+(1-y)\log(1-p)\right]`} display className="neural-bce-formula" />
          </section>

          <section className="article-section" id="linear-limit">
            <div className="margin-label">03 — REPRESENTATION</div>
            <h2>{t("XOR의 대각선은 하나의 half-plane에 들어가지 않습니다", "XOR's diagonal positives do not fit one half-plane")}</h2>
            <p>{t("XOR은 두 입력이 다를 때만 1입니다. 양성 [0,1]과 [1,0]을 한 직선의 같은 쪽에 넣으려 하면 음성 [0,0] 또는 [1,1]도 따라 들어옵니다. 그래서 대표 직선은 3/4까지 가도 4/4가 되지 않습니다. 이것은 학습률이나 epoch가 아니라 모델의 표현력 문제입니다.", "XOR is 1 only when the inputs differ. Any half-plane containing both positive points [0,1] and [1,0] also captures a negative point [0,0] or [1,1]. A representative line can reach 3/4 but not 4/4. This is model expressiveness, not learning rate or epoch count.")}</p>
            <div className="neural-xor-data">
              <ArrayDiagram
                values={[[0, 0], [0, 1], [1, 0], [1, 1]]}
                shape={[4, 2]}
                label="X"
                rowLabels={["negative", "positive", "positive", "negative"]}
                columnLabels={["x₁", "x₂"]}
                tone="indigo"
                compact
              />
              <span aria-hidden="true">→</span>
              <ArrayDiagram
                values={[[0], [1], [1], [0]]}
                shape={[4, 1]}
                label="y = XOR"
                rowLabels={["00", "01", "10", "11"]}
                columnLabels={["label"]}
                tone="terra"
                compact
              />
            </div>
          </section>

          <section className="article-section" id="hidden">
            <div className="margin-label">04 — HIDDEN FEATURES</div>
            <h2>{t("activation이 중간 공간을 바꾸고 다음 직선이 다시 나눕니다", "An activation reshapes an intermediate space for the next line")}</h2>
            <p>{t("첫 affine은 각 행에서 hidden 점수 두 개를 만듭니다. 중간 activation이 없으면 두 affine은 하나의 affine으로 합쳐집니다. activation을 통과한 H는 OR·NAND 같은 새로운 feature를 표시할 수 있고, 두 번째 affine은 이 feature 공간에서 XOR 양성만 골라냅니다.", "The first affine map creates two hidden scores per row. Without a middle activation, two affine maps merge into one affine map. Activated H can mark new features such as OR and NAND; the second affine selects only XOR positives in that feature space.")}</p>
            <div className="neural-layer-ladder" aria-label={t("2에서 2를 거쳐 1로 가는 신경망 shape", "Neural-network shapes from 2 through 2 to 1")}>
              <article><span>INPUT</span><strong>X [4, 2]</strong><p>{t("4개 표본 · 2개 feature", "4 samples · 2 features")}</p></article>
              <span aria-hidden="true">× W¹[2,2] + b¹</span>
              <article><span>HIDDEN</span><strong>H [4, 2]</strong><p>{t("activation된 feature 2개", "2 activated features")}</p></article>
              <span aria-hidden="true">× W²[2,1] + b²</span>
              <article><span>OUTPUT</span><strong>p [4, 1]</strong><p>{t("표본마다 확률 1개", "1 probability per sample")}</p></article>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">H</span>
              <div>
                <strong>{t("hidden activation은 최종 정답 확률이 아닙니다", "A hidden activation is not the final answer probability")}</strong>
                <p>{t("값이 0과 1 사이여도 hidden unit은 중간 feature입니다. 마지막 output logit에 sigmoid를 적용한 p만 이 이진 분류기의 최종 확률로 해석합니다.", "Even when its value lies between 0 and 1, a hidden unit is an intermediate feature. Only p from sigmoid on the final output logit is interpreted as this classifier's final probability.")}</p>
              </div>
            </div>
          </section>

          <div id="xor-lab">
            <NeuralNetworkXorLab onCompletionChange={setXorLabComplete} />
          </div>

          <section className="article-section" id="backprop-lab">
            <div className="margin-label">06 — BACKPROP BRIDGE</div>
            <h2>{t("forward에 저장한 값을 역순으로 연결하면 hidden gradient가 됩니다", "Reading cached forward values in reverse produces hidden gradients")}</h2>
            <p>{t(
              "forward는 Z¹, H, z², p를 저장합니다. BCE에서 시작한 output signal δ²=p−y는 W²ᵀ를 거쳐 hidden으로 돌아오고, sigmoid의 local derivative H⊙(1−H)을 만나 δ¹이 됩니다. 네 행의 parameter 기여를 평균하면 각 gradient는 자신이 바꿀 weight와 같은 shape를 갖습니다.",
              "Forward caches Z¹, H, z², and p. The output signal δ²=p−y travels through W²ᵀ back to hidden, then meets sigmoid's local derivative H⊙(1−H) to become δ¹. Averaging parameter contributions over four rows gives every gradient the same shape as the weight it updates.",
            )}</p>
            <div className="neural-backprop-rule-grid">
              <article>
                <span>OUTPUT SIGNAL</span>
                <MathFormula latex={String.raw`\delta^2=p-y`} display />
                <p>{t("BCE와 output sigmoid의 결합", "BCE combined with output sigmoid")}</p>
              </article>
              <article>
                <span>HIDDEN SIGNAL</span>
                <MathFormula latex={String.raw`\delta^1=(\delta^2(W^2)^\top)\odot H\odot(1-H)`} display />
                <p>[4,1] → [4,2]</p>
              </article>
              <article>
                <span>PARAMETER GRADIENT</span>
                <MathFormula latex={String.raw`\nabla_{W^1}L=\frac{1}{4}X^\top\delta^1`} display />
                <p>[2,4] × [4,2] → [2,2]</p>
              </article>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">↪</span>
              <div>
                <strong>{t("계산 그래프의 edge마다 local derivative를 하나씩 곱합니다", "Multiply one local derivative at each computation-graph edge")}</strong>
                <p>{t("output weight나 sigmoid derivative를 건너뛰면 W¹이 loss에 미치는 영향을 계산한 것이 아닙니다. 다음 장에서는 같은 reverse path를 mini-batch마다 만들고 Adam이 그 gradient를 소비합니다.", "Skipping either the output weight or sigmoid derivative no longer measures W¹'s effect on loss. The next chapter builds the same reverse path per mini-batch, then lets Adam consume those gradients.")}</p>
              </div>
            </div>
            <NeuralNetworkBackpropLab onCompletionChange={setBackpropLabComplete} />
          </section>

          <section className="article-section neural-python-bridge" id="numpy-bridge">
            <div className="margin-label">07 — NUMPY BRIDGE · OPTIONAL</div>
            <h2>{t("시뮬레이터의 XOR을 실제 NumPy forward pass로 옮깁니다", "Move the simulator's XOR into a real NumPy forward pass")}</h2>
            <p>{t("첫 셀은 많은 직선을 직접 탐색해 단일 affine 경계가 3/4에서 멈추는 것을 확인합니다. 두 번째 셀은 activation이 빠져 2/4로 무너진 2층 네트워크를 한 줄 수정해 4/4와 낮은 BCE로 복구합니다.", "The first cell searches many lines and confirms that one affine boundary stops at 3/4. In the second, repair one missing activation in a two-layer network so it recovers 4/4 with low BCE.")}</p>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 심화이며 각 셀은 독립적으로 실행됩니다", "Optional extension; each cell runs independently")}</strong>
                <p>{t("브라우저가 공유 Pyodide 런타임과 NumPy를 지연 로드합니다. 다운로드 실패는 두 필수 브라우저 실습이나 챕터 완료를 막지 않습니다. 어느 셀도 다른 셀이 남긴 상태에 의존하지 않으므로 어떤 순서로 실행해도 됩니다.", "The browser lazily loads the shared Pyodide runtime and NumPy. A download failure never blocks either required browser lab or chapter completion. Neither cell depends on state left by the other, so either can run first.")}</p>
              </div>
            </div>
            <NotebookCell
              title={t("직선 하나로 XOR을 탐색", "Search XOR with one line")}
              initialCode={isKo ? neuralNetworksLinearBoundaryCode : neuralNetworksLinearBoundaryCodeEn}
              description={<p>{t("대표 직선의 네 확률을 읽은 뒤 작은 정수 weight·bias 공간을 전수 탐색합니다. 출력의 single_affine_correct와 grid_search_best가 왜 모두 3/4인지 설명해 보세요.", "Read the representative line's four probabilities, then exhaustively search a small integer weight-and-bias space. Explain why both single_affine_correct and grid_search_best remain 3/4.")}</p>}
              hint={<p>{t("대표 weight나 탐색 범위를 바꿔 보세요. 4/4를 찾았다고 생각하면 predictions와 네 점의 위치를 함께 확인한 뒤 셀을 초기화하세요.", "Change the representative weights or the search range. If you think you found 4/4, inspect the predictions alongside all four points, then reset the cell.")}</p>}
              editorMinHeight={430}
              ariaLabel={t("단일 affine XOR 한계 NumPy 코드", "NumPy code for the single-affine XOR limit")}
            />
            <div
              className="concept-definition-grid neural-affine-collapse-trace"
              role="group"
              aria-label={t("activation이 없을 때 두 affine이 하나로 합쳐지는 수치 추적", "Numeric trace of two affine maps collapsing without an activation")}
            >
              <article>
                <span>STEP 1 · COMPOSE</span>
                <h3>{t("두 affine을 하나로 접습니다", "Compose the two affine maps")}</h3>
                <MathFormula
                  latex={String.raw`(XW^1+b^1)W^2+b^2=X(W^1W^2)+(b^1W^2+b^2)`}
                  display
                  ariaLabel={t("괄호 X W1 더하기 b1 괄호 곱하기 W2 더하기 b2는 X 곱하기 괄호 W1 W2 괄호 더하기 괄호 b1 W2 더하기 b2 괄호", "X W one plus b one, times W two plus b two, equals X times W one W two, plus b one W two plus b two")}
                />
              </article>
              <article>
                <span>STEP 2 · EFFECTIVE PARAMETERS</span>
                <h3 aria-label={t("유효 가중치 [0, 0], 유효 편향 52", "Effective weights [0, 0], effective bias 52")}>W<sub>eff</sub> = [0, 0] · b<sub>eff</sub> = 52</h3>
                <p>{t("W¹W²의 두 성분은 각각 8×8 + (−8)×8 = 0이고, b¹W²+b² = (−4)×8 + 12×8 − 12 = 52입니다.", "Each component of W¹W² is 8×8 + (−8)×8 = 0, while b¹W²+b² = (−4)×8 + 12×8 − 12 = 52.")}</p>
              </article>
              <article>
                <span>STEP 3 · XOR CONSEQUENCE</span>
                <h3>logits = [52, 52, 52, 52]</h3>
                <p>{t("네 입력이 모두 같은 확률과 예측 1을 얻습니다. 예측 [1,1,1,1]은 XOR 네 행 중 양성 두 행만 맞혀 2/4에 머뭅니다.", "All four inputs receive the same probability and class 1. Predictions [1,1,1,1] match only the two positive XOR rows, so accuracy stops at 2/4.")}</p>
              </article>
            </div>
            <NotebookCell
              title={t("빠진 hidden activation 수리", "Repair the missing hidden activation")}
              initialCode={isKo ? neuralNetworksHiddenRepairCode : neuralNetworksHiddenRepairCodeEn}
              description={<p>{t("처음 실행하면 hidden activation이 빠져 assertion이 실패합니다. REPAIR 아래 한 줄만 수정해 X[4,2]→hidden[4,2]→logits[4]를 유지하면서 XOR 4/4와 mean_bce<0.1을 통과시키세요.", "The first run fails its assertion because the hidden activation is missing. Change only the line below REPAIR, preserve X[4,2]→hidden[4,2]→logits[4], and reach XOR 4/4 with mean_bce<0.1.")}</p>}
              hint={<p>{t("두 affine 사이에 비선형성이 없으면 하나의 affine으로 합쳐집니다. hidden_logits를 어느 함수에 통과시켜야 OR와 NAND detector가 0–1 feature가 될까요?", "Without a nonlinearity, two affine maps collapse into one. Which function should transform hidden_logits so the OR and NAND detectors become 0–1 features?")}</p>}
              editorMinHeight={560}
              ariaLabel={t("hidden activation 수리 NumPy 코드", "NumPy code for repairing the hidden activation")}
            />
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">08 — OPTIONAL REMEDIATION · DEBUG</div>
            <h2>{t("깨진 층은 이름이 아니라 실제 forward 결과로 수리합니다", "Repair broken layers by actual forward results, not names")}</h2>
            <p>{t("shape가 맞는지, activation 뒤 네 행이 달라지는지, output이 truth table을 회복하는지, BCE 입력이 유효한 확률인지 차례로 검사하세요. 각 patch는 같은 수학 모델을 다시 실행해 의미론적으로 판정됩니다.", "Check shape compatibility, whether activation differentiates the four rows, whether the output restores the truth table, and whether BCE receives valid probabilities. Every patch is graded semantically by rerunning the same math model.")}</p>
            <NeuralNetworkDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">09 — TRANSFER</div>
            <h2>{t("다음 장에서는 행을 mini-batch로, output을 class logits로 넓힙니다", "Next, rows become mini-batches and outputs expand to class logits")}</h2>
            <p>{t("전이 과제: X[8,2]와 hidden width 3으로 3-class classifier를 조립해 보세요. W¹[2,3] 뒤 H[8,3], W²[3,3] 뒤 logits[8,3]이 됩니다. forward 뼈대와 δ²→δ¹→parameter gradient의 reverse path는 유지되고, 다음 장에서 full batch를 mini-batch로 나누고 sigmoid/BCE를 Softmax·Cross Entropy와 Adam으로 확장합니다.", "Transfer task: assemble a three-class classifier from X[8,2] with hidden width 3. W¹[2,3] yields H[8,3], and W²[3,3] yields logits[8,3]. The forward skeleton and reverse path δ²→δ¹→parameter gradients remain; the next chapter splits full data into mini-batches and extends sigmoid/BCE to Softmax, cross entropy, and Adam.")}</p>
            <div className="neural-transfer-map">
              <article><span>{t("이번 장", "THIS CHAPTER")}</span><strong>X[4,2] → H[4,2] → p[4,1]</strong><p>{t("full XOR · binary probability", "full XOR · binary probability")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>{t("전이 과제", "TRANSFER TASK")}</span><strong>X[8,2] → H[8,3] → logits[8,3]</strong><p>{t("3-class shape", "three-class shape")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>{t("다음 장", "NEXT CHAPTER")}</span><strong>mini-batch · Adam · Dropout</strong><p>{t("학습 구조와 일반화", "training structure and generalization")}</p></article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div>
                <strong>{t("표현력은 일반화 성능과 같지 않습니다", "Expressiveness is not generalization")}</strong>
                <p>{t("넓은 hidden layer는 복잡한 규칙을 표현할 수 있지만 unseen data에서도 잘 작동한다는 보장은 아닙니다. mini-batch, Dropout과 train/test 관점은 다음 장에서 분리해 다룹니다.", "A wide hidden layer can represent complex rules, but that does not guarantee good behavior on unseen data. The next chapter treats mini-batches, dropout, and train/test reasoning separately.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">10 — CHECK</div>
            <NeuralNetworksConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{t("이제 hidden feature의 forward 값과 backward gradient를 같은 그래프에서 설명할 수 있습니다", "You can now explain hidden-feature values and gradients on the same graph")}</h2>
            <p>{t("직선 실패를 관찰하고 두 hidden feature로 XOR을 조립한 뒤, 네 행의 BCE를 W¹까지 역전파하고 다섯 개념을 연결하면 핵심 목표에 도달합니다. Network 수술은 선택 보강입니다.", "You reach the core goal after observing a line's failure, assembling two hidden features for XOR, backpropagating the four-row BCE through W¹, and connecting all five concepts. Network surgery is optional remediation.")}</p>
            <div className="neural-completion-checklist" role="status" aria-live="polite">
              <span className={xorLabComplete ? "is-complete" : undefined}>{xorLabComplete ? "✓" : "○"} {t("필수 XOR forward lab", "Required XOR forward lab")}</span>
              <span className={backpropLabComplete ? "is-complete" : undefined}>{backpropLabComplete ? "✓" : "○"} {t("필수 hidden backprop lab", "Required hidden backprop lab")}</span>
              <span className={`is-optional${debuggerComplete ? " is-complete" : ""}`}>{debuggerComplete ? "✓" : t("선택", "optional")} {t("network 수술 4개", "Four network surgeries")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={TRANSFORMER_CURRICULUM_SLUG}
              slug="neural-networks"
              canComplete={canComplete}
              lockedMessage={t(
                "필수 XOR lab, hidden backprop lab과 이해 확인 다섯 문제를 마치면 완료할 수 있습니다. Network 수술은 선택 보강입니다.",
                "Finish the required XOR lab, hidden backprop lab, and all five concept questions. Network surgery is optional remediation.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview
              ? <a href={previousPreviewHref}>← {t("이전: 학습과 최적화", "Previous: Learning and Optimization")}</a>
              : <span>← {t("이전: 학습과 최적화", "Previous: Learning and Optimization")}</span>}
            <span>{t("다음: 딥러닝 학습 구조", "Next: Deep Learning Training")} <small>{t("준비 중", "Coming soon")}</small></span>
          </nav>
        </article>
      </div>
    </main>
  );
}
