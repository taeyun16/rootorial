import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  optimizationGradientRepairCode,
  optimizationGradientRepairCodeEn,
  optimizationNumpyCode,
  optimizationNumpyCodeEn,
} from "../../data/optimizationNotebook";
import { useLocale } from "../../features/localization/localization";
import { canCompleteOptimizationChapter } from "../../features/optimization/gradient-descent";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { ArrayDiagram } from "../interactive/ArrayDiagram";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { MathFormula } from "../MathFormula";
import { NotebookCell } from "../NotebookCell";
import { PublicLearningProof } from "../PublicLearningProof";
import { PythonCode } from "../PythonCode";
import { RootorialMark } from "../RootorialMark";
import { OptimizationConceptCheck } from "./OptimizationConceptCheck";
import { OptimizationDebuggerLab } from "./OptimizationDebuggerLab";
import { OptimizationDescentLab } from "./OptimizationDescentLab";

const tocItems = {
  ko: [
    { id: "predict", label: "벡터가 예측이 되기까지" },
    { id: "measure", label: "여러 오차를 하나의 손실로" },
    { id: "gradient", label: "Gradient 방향" },
    { id: "descent", label: "필수 경사하강 실습" },
    { id: "debug", label: "업데이트 디버깅" },
    { id: "transfer", label: "뉴런으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "predict", label: "From vectors to predictions" },
    { id: "measure", label: "Many errors, one loss" },
    { id: "gradient", label: "Gradient direction" },
    { id: "descent", label: "Required descent lab" },
    { id: "debug", label: "Debug updates" },
    { id: "transfer", label: "Transfer to neurons" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function OptimizationChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapter = chapters.find(({ slug }) => slug === "optimization")!;
  const [descentLabComplete, setDescentLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteOptimizationChapter({
    descentLabComplete,
    debuggerComplete,
    conceptsMastered,
  });

  return (
    <main className="chapter-shell optimization-chapter-shell">
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
            <span>CHAPTER 02</span>
            <div className="mini-progress"><span style={{ width: "20%" }} /></div>
            <span>2 / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />

        <article className="lesson-article">
          <header className="lesson-hero optimization-lesson-hero">
            <p className="eyebrow">
              LOSS → GRADIENT → UPDATE · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">02</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>모델은 틀린 정도를 하나의 <em>손실</em>로 요약하고, 그 손실이 가장 빨리 커지는 반대 방향으로 파라미터를 조금씩 옮기며 배웁니다.</>
              ) : (
                <>A model learns by summarizing its errors as one <em>loss</em>, then moving its parameters a small step opposite the direction in which that loss rises fastest.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("X[n, 2] · W[2] → ŷ[n]을 행별 내적으로 읽을 수 있다.", "Read X[n, 2] · W[2] → ŷ[n] as one dot product per row.")}</li>
                <li>{t("잔차 벡터가 MSE라는 스칼라 손실로 축약되는 과정을 설명할 수 있다.", "Explain how a residual vector is reduced to the scalar MSE loss.")}</li>
                <li>{t("Gradient가 W와 같은 shape의 가장 빠른 증가 방향임을 해석할 수 있다.", "Interpret the gradient as the fastest local increase direction with the same shape as W.")}</li>
                <li>{t("W ← W − η∇L을 실행하고 학습률이 너무 작거나 큰 trace를 진단할 수 있다.", "Execute W ← W − η∇L and diagnose traces from learning rates that are too small or too large.")}</li>
                <li>{t("선형 모델의 x·w+b 업데이트를 다음 챕터의 뉴런으로 전이할 수 있다.", "Transfer the x·w+b update from a linear model to the neurons in the next chapter.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="predict">
            <div className="margin-label">01 — PREDICT</div>
            <h2>{t("지난 장의 벡터가 이번에는 예측을 만듭니다", "The vectors from the last chapter now make predictions")}</h2>
            <p>
              {isKo ? <><PythonCode>W = [bias, slope]</PythonCode>도 두 성분 벡터입니다. 데이터 한 행 <PythonCode>[1, xᵢ]</PythonCode>와 W를 내적하면 <PythonCode>ŷᵢ = bias + slope × xᵢ</PythonCode>라는 예측 하나가 나옵니다. 세 행을 쌓은 X와 W의 곱은 세 예측을 한 번에 만듭니다.</> : <><PythonCode>W = [bias, slope]</PythonCode> is another two-component vector. Its dot product with one data row <PythonCode>[1, xᵢ]</PythonCode> produces one prediction, <PythonCode>ŷᵢ = bias + slope × xᵢ</PythonCode>. Stacking three rows in X produces all three predictions at once.</>}
            </p>
            <div className="concept-callout optimization-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("벡터의 방향, 행·열 shape, stack과 내적만 사용합니다. 미적분 과목을 먼저 들을 필요는 없습니다. 미분은 파라미터를 조금 흔들었을 때 loss가 얼마나 변하는지로 시작합니다.", "Use only vector direction, row/column shape, stacking, and dot products. No prior calculus course is required; differentiation begins as how much loss changes after a tiny parameter perturbation.")}</p>
                <Link
                  to="/curricula/$curriculumSlug/chapters/$chapterSlug"
                  params={{ curriculumSlug: TRANSFORMER_CURRICULUM_SLUG, chapterSlug: "vectors" }}
                  search={isKo ? {} : { lang: "en" }}
                >
                  {t("이전 챕터 다시 보기", "Review the previous chapter")} →
                </Link>
              </div>
            </div>
            <div className="optimization-array-flow">
              <ArrayDiagram
                values={[[1, -1], [1, 0], [1, 1]]}
                shape={[3, 2]}
                label="X"
                rowLabels={["point 1", "point 2", "point 3"]}
                columnLabels={["bias input", "x"]}
                tone="indigo"
                compact
              />
              <span aria-hidden="true">×</span>
              <ArrayDiagram
                values={[[-2], [-1]]}
                shape={[2]}
                label="W = [bias, slope]"
                rowLabels={["bias", "slope"]}
                tone="terra"
                compact
              />
              <span aria-hidden="true">=</span>
              <ArrayDiagram
                values={[[-1], [-2], [-3]]}
                shape={[3]}
                label="ŷ"
                rowLabels={["ŷ₁", "ŷ₂", "ŷ₃"]}
                tone="forest"
                compact
              />
            </div>
            <p>{t("목표 데이터 y=[-1, 1, 3]과 비교하면 첫 예측만 맞고 나머지는 각각 -3, -6만큼 어긋납니다. 이제 여러 오차를 비교 가능한 숫자 하나로 바꿔야 합니다.", "Against the target y=[-1, 1, 3], only the first prediction is correct; the others miss by -3 and -6. We now need one comparable number for these many errors.")}</p>
          </section>

          <section className="article-section" id="measure">
            <div className="margin-label">02 — MEASURE</div>
            <h2>{t("잔차 벡터를 하나의 loss로 접습니다", "Fold the residual vector into one loss")}</h2>
            <p>{t("잔차는 ŷ−y입니다. 부호가 다른 오차가 서로 지워지지 않도록 제곱하고 평균하면 MSE가 됩니다. 이 스칼라 하나가 지금 W가 다음 W보다 나은지 비교하는 기준입니다.", "A residual is ŷ−y. Squaring prevents opposite signs from cancelling; averaging produces MSE. This one scalar lets us compare whether the current W is better than the next one.")}</p>
            <div className="optimization-equation-card">
              <MathFormula latex={String.raw`\mathbf{r}=\widehat{\mathbf{y}}-\mathbf{y}=[0,-3,-6]`} display />
              <MathFormula latex={String.raw`L(\mathbf{W})=\operatorname{MSE}=\frac{0^2+(-3)^2+(-6)^2}{3}=15`} display />
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("Loss는 accuracy가 아닙니다", "Loss is not accuracy")}</strong>
                <p>{t("MSE는 연속적인 오차 크기입니다. 원본 강의 노트의 SSE와 이번 MSE는 같은 최솟값을 갖지만, 평균을 내면 gradient 크기와 읽기 좋은 학습률 범위가 달라집니다. 이 챕터에서는 항상 MSE를 사용합니다.", "MSE is a continuous error magnitude. The source notebook's SSE and this chapter's MSE share the same minimum, but averaging changes gradient scale and the readable learning-rate range. This chapter consistently uses MSE.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="gradient">
            <div className="margin-label">03 — GRADIENT</div>
            <h2>{t("각 파라미터를 조금 흔들어 오르막 방향을 찾습니다", "Perturb each parameter to find the uphill direction")}</h2>
            <p>{t("bias를 아주 조금 늘렸을 때 loss가 얼마나 변하는지, slope를 늘렸을 때 얼마나 변하는지를 각각 측정하면 두 편미분이 됩니다. 둘을 W와 같은 순서로 쌓은 벡터가 gradient입니다.", "Measure how loss changes after nudging bias, then slope. These two partial derivatives, stacked in the same order as W, form the gradient vector.")}</p>
            <div className="optimization-gradient-steps">
              <article><span>01</span><strong>{t("예측", "Predict")}</strong><p><PythonCode>ŷ = X @ W</PythonCode></p></article>
              <article><span>02</span><strong>{t("측정", "Measure")}</strong><p><PythonCode>loss = mean((ŷ-y)²)</PythonCode></p></article>
              <article><span>03</span><strong>{t("방향", "Direction")}</strong><p><PythonCode>gradient = [-6, -4]</PythonCode></p></article>
              <article><span>04</span><strong>{t("업데이트", "Update")}</strong><p><PythonCode>W = W - η*gradient</PythonCode></p></article>
            </div>
            <div className="optimization-equation-card is-dark">
              <MathFormula latex={String.raw`\nabla L(\mathbf{W})=[-6,-4]`} display />
              <MathFormula latex={String.raw`\eta=0.3:\quad \Delta\mathbf{W}=-\eta\nabla L=[1.8,1.2]`} display />
              <MathFormula latex={String.raw`[-2,-1]+[1.8,1.2]=[-0.2,0.2],\quad L:15\rightarrow3.6`} display />
            </div>
            <div className="concept-callout">
              <span className="callout-mark">−</span>
              <div>
                <strong>{t("Gradient는 내리막이 아니라 가장 빠른 오르막입니다", "The gradient is the steepest uphill direction, not downhill")}</strong>
                <p>{t("그래서 update 식에 빼기 기호가 있습니다. 각 성분의 값은 다를 수 있어 bias와 slope가 같은 크기로 움직일 필요도 없습니다.", "That is why the update contains a minus sign. Its components can differ, so bias and slope do not have to move by the same amount.")}</p>
              </div>
            </div>
          </section>

          <div id="descent">
            <OptimizationDescentLab onCompletionChange={setDescentLabComplete} />
          </div>

          <section className="article-section optimization-notebook-section" id="numpy-check">
            <div className="margin-label">05 — NUMPY · OPTIONAL</div>
            <h2>{t("실제 NumPy에서 trace와 gradient 계약을 함께 확인하세요", "Check both the trace and gradient contract in real NumPy")}</h2>
            <p>{t("첫 셀은 필수 실습과 같은 경사하강 trace를 재현합니다. 두 번째 셀은 analytic gradient를 중앙차분 수치 gradient와 대조하고, SSE 식을 MSE에 그대로 쓴 한 줄을 직접 수리하게 합니다. 두 셀은 독립적이며 실행 순서가 결과를 바꾸지 않습니다.", "The first cell reproduces the required gradient-descent trace. The second compares an analytic gradient with a central finite-difference probe and asks you to repair one line that incorrectly carries an SSE expression into MSE. The cells are independent, so execution order does not change their results.")}</p>
            <div className="concept-callout">
              <span className="callout-mark">ε</span>
              <div>
                <strong>{t("같은 loss를 미분한 두 측정은 일치해야 합니다", "Two measurements of the same loss derivative must agree")}</strong>
                <p>
                  {isKo ? <>
                    중앙차분은 <MathFormula latex={String.raw`g_j\approx\frac{L(W+\epsilon e_j)-L(W-\epsilon e_j)}{2\epsilon}`} />로 각 성분을 흔듭니다. 현재 세 표본에서 수치값은 <PythonCode>[-6, -4]</PythonCode>입니다. <PythonCode>X.T @ residual</PythonCode>만 쓰면 <PythonCode>[-9, -6]</PythonCode>이므로, 제곱의 미분 <PythonCode>2</PythonCode>와 평균의 <PythonCode>1 / n</PythonCode>을 모두 복구해야 합니다.
                  </> : <>
                    Central difference perturbs each component with <MathFormula latex={String.raw`g_j\approx\frac{L(W+\epsilon e_j)-L(W-\epsilon e_j)}{2\epsilon}`} />. For these three samples the numerical result is <PythonCode>[-6, -4]</PythonCode>. Using only <PythonCode>X.T @ residual</PythonCode> gives <PythonCode>[-9, -6]</PythonCode>, so the repair must restore both the square derivative <PythonCode>2</PythonCode> and the mean factor <PythonCode>1 / n</PythonCode>.
                  </>}
                </p>
              </div>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 심화는 완료 조건과 분리됩니다", "The optional extension stays outside the completion gate")}</strong>
                <p>{t("두 셀은 공유 Pyodide worker와 NumPy를 처음 실행할 때만 지연 로드합니다. 런타임 다운로드 실패는 필수 실습이나 챕터 완료를 막지 않습니다.", "Both cells lazily load the shared Pyodide worker and NumPy only when first run. A runtime download failure never blocks the required lab or chapter completion.")}</p>
              </div>
            </div>
            <div className="notebook-stack">
              <NotebookCell
                title={t("NumPy로 MSE gradient descent 실행", "Run MSE gradient descent with NumPy")}
                initialCode={isKo ? optimizationNumpyCode : optimizationNumpyCodeEn}
                description={<p>{t("필수 실습과 같은 X, y, W, η를 사용하고 각 step의 W, loss, gradient를 출력합니다.", "Uses the same X, y, W, and η as the required lab and prints W, loss, and gradient at every step.")}</p>}
                hint={<p>{t("learning_rate를 0.02와 1.10으로 바꾸고 loss 열이 어떻게 달라지는지 비교하세요.", "Change learning_rate to 0.02 and 1.10 and compare the loss column.")}</p>}
                editorMinHeight={360}
                ariaLabel={t("최적화 NumPy 코드", "Optimization NumPy code")}
              />
              <NotebookCell
                title={t("finite difference로 MSE gradient 수리", "Repair the MSE gradient with finite differences")}
                initialCode={isKo ? optimizationGradientRepairCode : optimizationGradientRepairCodeEn}
                description={<p>{t("첫 실행은 analytic [-9, -6]과 numerical [-6, -4]가 달라 assertion이 실패합니다. REPAIR 아래 한 줄만 바꿔 두 gradient를 일치시키세요.", "The first run fails because analytic [-9, -6] disagrees with numerical [-6, -4]. Change only the line below REPAIR so the two gradients agree.")}</p>}
                hint={<p>{t("MSE는 squared error의 합이 아니라 평균입니다. gradient = (2 / len(y)) * X.T @ residual을 완성한 뒤 다시 실행하세요.", "MSE is the mean, not the sum, of squared errors. Complete gradient = (2 / len(y)) * X.T @ residual, then run again.")}</p>}
                editorMinHeight={500}
                ariaLabel={t("MSE gradient finite difference 수리 코드", "MSE gradient finite-difference repair code")}
              />
            </div>
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">06 — DEBUG</div>
            <h2>{t("공식을 외우는 대신 다음 loss로 업데이트를 검증합니다", "Verify an update by its next loss, not by memorizing a formula")}</h2>
            <p>{t("올바른 부호만으로는 충분하지 않습니다. gradient와 반대 방향이어도 학습률이 너무 크면 최솟값을 건너뛸 수 있습니다. 아래 활동은 제안한 update를 실제 loss 함수에 넣어 판정합니다.", "The correct sign is not enough. Even a direction opposite the gradient can overshoot when the learning rate is too large. The activity below substitutes each proposed update into the actual loss function.")}</p>
            <OptimizationDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">07 — TRANSFER</div>
            <h2>{t("직선의 W가 다음 장에서는 뉴런의 weight가 됩니다", "The line's W becomes a neuron's weights in the next chapter")}</h2>
            <p>{t("이번 장의 예측 ŷ=b+w·x는 다음 장에서 z=b+w·x라는 뉴런의 입력 합으로 다시 나타납니다. 다음 장은 여기에 sigmoid와 여러 뉴런을 더하지만, loss를 측정하고 gradient 반대 방향으로 파라미터를 옮기는 뼈대는 같습니다.", "This chapter's prediction ŷ=b+w·x returns in the next chapter as a neuron's pre-activation z=b+w·x. The next chapter adds sigmoid and multiple neurons, but the loop—measure loss and move parameters opposite the gradient—stays the same.")}</p>
            <div className="optimization-transfer-map" aria-label={t("선형 모델에서 뉴런으로의 개념 전이", "Concept transfer from linear model to neuron")}>
              <article><span>{t("이번 장", "THIS CHAPTER")}</span><strong>ŷ = XW</strong><p>{t("직선의 bias·slope", "Line bias and slope")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>{t("다음 장", "NEXT CHAPTER")}</span><strong>z = x·w + b</strong><p>{t("뉴런의 weight·bias", "Neuron weights and bias")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>{t("그대로 유지", "STAYS THE SAME")}</span><strong>W ← W − η∇L</strong><p>{t("손실 기반 업데이트", "Loss-driven update")}</p></article>
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">08 — CHECK</div>
            <OptimizationConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{t("이제 loss trace를 읽고 한 번의 update를 설명할 수 있습니다", "You can now read a loss trace and explain one update")}</h2>
            <p>{t("나쁜 학습률을 관찰해 안정적인 값으로 복구하고, 네 optimizer 사건을 실제 loss 변화로 해결하고, gradient의 shape와 부호를 설명하면 챕터 목표에 도달했습니다.", "You have reached the goal when you can repair a bad learning rate, solve four optimizer incidents using actual loss changes, and explain gradient shape and sign.")}</p>
            <div className="optimization-completion-checklist" role="status" aria-live="polite">
              <span className={descentLabComplete ? "is-complete" : undefined}>{descentLabComplete ? "✓" : "○"} {t("학습률 복구 실습", "Learning-rate repair lab")}</span>
              <span className={debuggerComplete ? "is-complete" : undefined}>{debuggerComplete ? "✓" : "○"} {t("업데이트 디버깅 4개", "Four update incidents")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={TRANSFORMER_CURRICULUM_SLUG}
              slug="optimization"
              canComplete={canComplete}
              lockedMessage={t(
                "학습률 복구 실습, 업데이트 디버깅 네 사건과 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
                "Finish the learning-rate repair lab, all four update incidents, and all five concept questions to complete the chapter.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            <Link
              to="/curricula/$curriculumSlug/chapters/$chapterSlug"
              params={{ curriculumSlug: TRANSFORMER_CURRICULUM_SLUG, chapterSlug: "vectors" }}
              search={isKo ? {} : { lang: "en" }}
            >
              ← {t("이전: 벡터와 텐서", "Previous: Vectors and Tensors")}
            </Link>
            <span>{t("다음: 분류와 신경망", "Next: Classification and Neural Networks")} <small>{t("준비 중", "Coming soon")}</small></span>
          </nav>
        </article>
      </div>
    </main>
  );
}
