import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  trainingAdamEpochCode,
  trainingAdamEpochCodeEn,
  trainingSoftmaxAxisRepairCode,
  trainingSoftmaxAxisRepairCodeEn,
} from "../../data/trainingNotebook";
import { useLocale } from "../../features/localization/localization";
import {
  canCompleteTrainingChapter,
  softmaxRows,
} from "../../features/training/training-simulator";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { ArrayDiagram } from "../interactive/ArrayDiagram";
import { MatrixGrid } from "../interactive/MatrixGrid";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { MathFormula } from "../MathFormula";
import { NotebookCell } from "../NotebookCell";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { PythonCode } from "../PythonCode";
import { RootorialMark } from "../RootorialMark";
import { TrainingBatchLab } from "./TrainingBatchLab";
import { TrainingConceptCheck } from "./TrainingConceptCheck";
import { TrainingLoopDebugger } from "./TrainingLoopDebugger";

const tocItems = {
  ko: [
    { id: "batch-logits", label: "batch×class logits" },
    { id: "softmax-ce", label: "Softmax와 CE" },
    { id: "loop", label: "훈련 loop와 Adam" },
    { id: "batch-lab", label: "필수 mini-batch lab" },
    { id: "numpy-bridge", label: "NumPy 훈련 bridge" },
    { id: "generalization", label: "검증과 Dropout" },
    { id: "debug", label: "훈련 loop 디버깅" },
    { id: "transfer", label: "Embedding으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "batch-logits", label: "Batch-by-class logits" },
    { id: "softmax-ce", label: "Softmax and CE" },
    { id: "loop", label: "Training loop and Adam" },
    { id: "batch-lab", label: "Required mini-batch lab" },
    { id: "numpy-bridge", label: "NumPy training bridge" },
    { id: "generalization", label: "Validation and dropout" },
    { id: "debug", label: "Training-loop debugging" },
    { id: "transfer", label: "Transfer to embeddings" },
    { id: "check", label: "Concept check" },
  ],
} as const;

const exampleLogits = [[3, 1, 0], [0, 2, 1]];
const exampleProbabilities = softmaxRows(exampleLogits);

export function TrainingChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "training");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [batchLabComplete, setBatchLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteTrainingChapter({
    batchLabComplete,
    debuggerComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/neural-networks${isKo ? "" : "?lang=en"}`;
  const nextPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/embeddings${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell training-chapter-shell">
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
          <header className="lesson-hero training-lesson-hero">
            <p className="eyebrow">
              LOGITS → SOFTMAX/CE → BACKWARD → ADAM → VALIDATION · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">04</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>forward pass가 낸 한 묶음의 logits를 <em>학습 가능한 loop</em>로 바꿉니다. 한 batch의 gradient와 Adam 기억을 분리하고, train loss가 아니라 validation으로 멈출 지점을 고릅니다.</>
              ) : (
                <>Turn one block of forward-pass logits into a <em>trainable loop</em>. Separate a batch gradient from Adam's memory, then choose where to stop by validation rather than training loss.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("X[B,F]→H[B,D]→logits[B,K] shape를 추적하고 stable softmax와 cross entropy를 각 행에 적용할 수 있다.", "Trace X[B,F]→H[B,D]→logits[B,K] and apply stable softmax and cross entropy to each row.")}</li>
                <li>{t("N개 표본을 mini-batch로 나누고 epoch와 update를 구분해 ceil(N/B)를 계산할 수 있다.", "Partition N samples into mini-batches, distinguish epochs from updates, and compute ceil(N/B).")}</li>
                <li>{t("zero gradient→forward→mean loss→backward→Adam step을 실행하며 gradient와 optimizer state를 구분할 수 있다.", "Execute zero gradient→forward→mean loss→backward→Adam step while separating gradients from optimizer state.")}</li>
                <li>{t("train/validation 곡선과 dropout의 train/eval 동작으로 최적화 실패·underfit·overfit을 구분할 수 있다.", "Use train/validation curves and dropout train/eval behavior to distinguish optimization failure, underfitting, and overfitting.")}</li>
                <li>{t("같은 loop를 embedding lookup에 전이해 data-gradient 기여 경로가 생기는 embedding row를 예측할 수 있다.", "Transfer the same loop to an embedding lookup and predict which embedding rows receive data-gradient contributions.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="batch-logits">
            <div className="margin-label">01 — BATCH × CLASS</div>
            <h2>{t("지난 장의 output 하나를 K개 class logit으로 넓힙니다", "Expand last chapter's single output into K class logits")}</h2>
            <p>{t(
              "신경망의 affine→activation→affine 뼈대는 그대로입니다. 달라지는 것은 한 행이 K개의 제한 없는 점수를 낸다는 점입니다. batch 축 B는 표본을 모으고, class 축 K는 한 표본이 고를 후보를 모읍니다.",
              "The affine→activation→affine skeleton stays unchanged. The difference is that each row emits K unbounded scores. The batch axis B collects samples; the class axis K collects candidates for one sample.",
            )}</p>
            <div className="concept-callout training-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t(
                  "벡터의 행렬 shape, 학습과 최적화의 loss·gradient·learning rate, 분류와 신경망의 logit·BCE·hidden feature를 그대로 사용합니다.",
                  "Reuse matrix shapes from vectors; loss, gradients, and learning rate from optimization; and logits, BCE, and hidden features from neural networks.",
                )}</p>
                {preview
                  ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a>
                  : <span>{t("이전: 분류와 신경망", "Previous: Classification and Neural Networks")}</span>}
              </div>
            </div>
            <div className="training-shape-ladder" aria-label={t("3-class mini-batch 신경망 shape", "Three-class mini-batch network shapes")}>
              <article><span>INPUT</span><strong>X [B, F]</strong><p>{t("B개 표본 · F개 feature", "B samples · F features")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>HIDDEN</span><strong>H [B, D]</strong><p>{t("D개 activation", "D activations")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>LOGITS</span><strong>Z [B, K]</strong><p>{t("표본마다 K개 점수", "K scores per sample")}</p></article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div>
                <strong>{t("batch 행끼리는 하나의 분류 경쟁을 하지 않습니다", "Batch rows do not compete in one classification")}</strong>
                <p>{t(
                  "각 행은 독립적인 표본입니다. 다른 행의 큰 logit이 이 행의 확률을 빼앗는다면 softmax 축이 잘못된 것입니다.",
                  "Every row is an independent sample. If a large logit in another row steals this row's probability, the softmax axis is wrong.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="softmax-ce">
            <div className="margin-label">02 — SOFTMAX + CE</div>
            <h2>{t("한 행의 점수를 확률로 읽고 정답 위치만 loss로 모읍니다", "Read one row as probabilities and gather only the true-label loss")}</h2>
            <p>{t(
              "stable softmax는 행의 최댓값을 먼저 빼 overflow를 막은 뒤 K개 class를 정규화합니다. cross entropy는 정답 label에 배정한 확률의 -log를 읽고 batch 평균을 냅니다.",
              "Stable softmax subtracts the row maximum to prevent overflow, then normalizes K classes. Cross entropy reads -log of the probability assigned to the true label and averages across the batch.",
            )}</p>
            <div className="training-softmax-grid">
              <MatrixGrid
                values={exampleLogits}
                label={t("두 표본의 logits", "Logits for two samples")}
                rowLabels={[t("표본 A", "sample A"), t("표본 B", "sample B")]}
                columnLabels={["class 0", "class 1", "class 2"]}
                tone="indigo"
                formatValue={(value) => value.toFixed(2)}
              />
              <span aria-hidden="true">row softmax →</span>
              <MatrixGrid
                values={exampleProbabilities}
                label={t("행별 class 확률", "Class probabilities by row")}
                rowLabels={[t("표본 A", "sample A"), t("표본 B", "sample B")]}
                columnLabels={["class 0", "class 1", "class 2"]}
                tone="forest"
                formatValue={(value) => value.toFixed(3)}
              />
            </div>
            <div className="training-formula-grid">
              <article>
                <span>STABLE SOFTMAX</span>
                <MathFormula latex={String.raw`p_k=\frac{e^{z_k-\max(\mathbf z)}}{\sum_j e^{z_j-\max(\mathbf z)}}`} display />
              </article>
              <article>
                <span>MEAN CROSS ENTROPY</span>
                <MathFormula latex={String.raw`L=-\frac{1}{B}\sum_{i=1}^{B}\log p_{i,y_i}`} display />
              </article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("fused CrossEntropyLoss에는 raw logits를 넣습니다", "Pass raw logits to fused CrossEntropyLoss")}</strong>
                <p>{t(
                  "일반적인 fused loss는 stable log-softmax를 이미 포함합니다. softmax 확률을 다시 넣으면 double softmax가 되어 gradient와 loss가 왜곡됩니다.",
                  "A typical fused loss already includes a stable log-softmax. Passing probabilities into it applies softmax twice and distorts both loss and gradients.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="loop">
            <div className="margin-label">03 — TRAINING LOOP</div>
            <h2>{t("backward는 gradient를 계산하고 Adam step이 파라미터를 바꿉니다", "Backward computes gradients; the Adam step changes parameters")}</h2>
            <p>{t(
              "한 epoch는 모든 표본을 한 번 순회하는 범위입니다. mini-batch마다 forward와 backward, update가 한 번씩 일어나므로 epoch 하나는 여러 optimizer step을 포함할 수 있습니다.",
              "An epoch is one pass over every sample. Each mini-batch gets its own forward, backward, and update, so one epoch can contain many optimizer steps.",
            )}</p>
            <ol className="training-loop-steps">
              <li><span>01</span><div><strong>{t("mini-batch 선택", "Choose mini-batch")}</strong><p>{t("epoch마다 순서를 섞고 마지막 짧은 batch도 처리", "Shuffle each epoch and keep the short tail batch")}</p></div></li>
              <li><span>02</span><div><strong><PythonCode>zero_grad()</PythonCode></strong><p>{t("이전 ordinary gradient buffer만 비움", "Clear only the prior ordinary gradient buffer")}</p></div></li>
              <li><span>03</span><div><strong>{t("forward → mean CE", "Forward → mean CE")}</strong><p>{t("현재 파라미터로 logits와 scalar loss 계산", "Compute logits and scalar loss with current parameters")}</p></div></li>
              <li><span>04</span><div><strong><PythonCode>loss.backward()</PythonCode></strong><p>{t("chain rule로 파라미터 shape의 gradient 계산", "Use the chain rule to compute parameter-shaped gradients")}</p></div></li>
              <li><span>05</span><div><strong><PythonCode>optimizer.step()</PythonCode></strong><p>{t("Adam m·v·t를 이어 받아 파라미터 update", "Carry Adam m, v, and t forward to update parameters")}</p></div></li>
            </ol>
            <div className="training-adam-card">
              <div>
                <span>ADAM STATE</span>
                <MathFormula latex={String.raw`m_t=\beta_1m_{t-1}+(1-\beta_1)g_t`} display />
                <MathFormula latex={String.raw`v_t=\beta_2v_{t-1}+(1-\beta_2)g_t^2`} display />
              </div>
              <p>{t(
                "gradient g는 batch마다 새로 계산하지만 m·v와 step t는 optimizer의 기억으로 유지됩니다. Adam도 최적점이나 generalization을 보장하지 않으며 learning rate가 여전히 중요합니다.",
                "Gradient g is recomputed per batch, while m, v, and step t persist as optimizer memory. Adam guarantees neither an optimum nor generalization, and learning rate still matters.",
              )}</p>
            </div>
          </section>

          <div id="batch-lab">
            <TrainingBatchLab onCompletionChange={setBatchLabComplete} />
          </div>

          <section className="article-section training-python-bridge" id="numpy-bridge">
            <div className="margin-label">05 — NUMPY BRIDGE · OPTIONAL</div>
            <h2>{t("배치 실습의 두 경계를 실제 NumPy로 다시 실행합니다", "Re-execute two batch-lab boundaries in real NumPy")}</h2>
            <p>{t(
              "첫 셀은 class 축을 잘못 고른 Softmax가 행 합과 표본 독립성을 동시에 깨는 모습을 보여 주고, 한 줄을 고쳐 평균 CE까지 복구합니다. 두 번째 셀은 같은 7×2 데이터와 grouped batch 순서를 사용해 tail batch까지 한 epoch의 Adam trace를 실행합니다.",
              "The first cell shows how choosing the wrong class axis breaks both row sums and sample independence, then repairs one line through mean CE. The second uses the same 7-by-2 data and grouped batch order to run a one-epoch Adam trace through the tail batch.",
            )}</p>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 심화이며 필수 완료 증거와 분리됩니다", "Optional extension, separate from required completion evidence")}</strong>
                <p>{t(
                  "두 셀은 서로가 남긴 Python 상태에 의존하지 않고, 공유 Pyodide·NumPy 런타임을 필요할 때만 불러옵니다. 런타임 다운로드 실패는 mini-batch lab, debugger, 이해 확인이나 챕터 완료를 막지 않습니다.",
                  "Neither cell depends on Python state left by the other, and the shared Pyodide and NumPy runtime loads only when needed. A runtime download failure does not block the mini-batch lab, debugger, concept check, or chapter completion.",
                )}</p>
              </div>
            </div>
            <NotebookCell
              title={t("Softmax class 축 한 줄 수리", "Repair the Softmax class axis in one line")}
              initialCode={isKo ? trainingSoftmaxAxisRepairCode : trainingSoftmaxAxisRepairCodeEn}
              description={<p>{t(
                "처음 실행하면 class_axis=0이 row_sums=[1.490457, 1.509543]을 만들고 다른 표본을 바꿀 때 첫 행도 움직여 assertion이 실패합니다. REPAIR의 축 한 줄만 고쳐 두 행의 합 1, 첫 행 변화 0, mean_ce=0.288726을 함께 통과시키세요.",
                "The initial class_axis=0 produces row_sums=[1.490457, 1.509543] and lets another sample change the first row, so the assertion fails. Change only the REPAIR axis and pass row sums of one, zero first-row shift, and mean_ce=0.288726 together.",
              )}</p>}
              hint={<p>{t(
                "logits shape [B,K]에서 서로 경쟁하는 K개 class는 어느 축에 놓여 있나요? sample 축을 따라 정규화하면 batch 구성 자체가 확률을 바꿉니다.",
                "In logits shaped [B,K], which axis holds the K competing classes? Normalizing along the sample axis makes probabilities depend on batch composition.",
              )}</p>}
              editorMinHeight={620}
              ariaLabel={t("Softmax class 축 수리 NumPy 코드", "NumPy code for repairing the Softmax class axis")}
            />
            <NotebookCell
              title={t("한 epoch Adam 상태 trace", "Trace Adam state across one epoch")}
              initialCode={isKo ? trainingAdamEpochCode : trainingAdamEpochCodeEn}
              description={<p>{t(
                "각 batch에서 grad_logits를 새 배열로 만들지만 m·v·step은 loop 밖에서 이어집니다. 출력에서 batch [6]인 마지막 1행도 처리되고, adam_step=4와 final_full_loss=0.225353에 도달하는지 확인하세요.",
                "Each batch creates a fresh grad_logits array while m, v, and step persist outside the loop. Confirm that the final one-row batch [6] runs and reaches adam_step=4 with final_full_loss=0.225353.",
              )}</p>}
              hint={<p>{t(
                "batches의 마지막 배열을 지우거나 Adam state 초기화를 for loop 안으로 옮겨 보세요. update 수, tail 처리, 최종 loss 중 어떤 계약이 먼저 깨지는지 비교할 수 있습니다.",
                "Remove the final array from batches or move Adam-state initialization inside the for loop. Compare which contract breaks first: update count, tail handling, or final loss.",
              )}</p>}
              editorMinHeight={980}
              ariaLabel={t("한 epoch Adam trace NumPy 코드", "NumPy code for a one-epoch Adam trace")}
            />
          </section>

          <section className="article-section" id="generalization">
            <div className="margin-label">06 — VALIDATION</div>
            <h2>{t("train loss가 계속 내려가도 unseen data는 나빠질 수 있습니다", "Unseen data can worsen while training loss keeps falling")}</h2>
            <p>{t(
              "낮은 train loss 자체는 overfitting의 증거가 아닙니다. train은 좋아지지만 validation이 다시 올라 generalization gap이 벌어질 때 training data의 우연한 패턴까지 맞추고 있다고 판단합니다. test set은 checkpoint를 고르는 데 쓰지 않고 마지막 평가에 남겨 둡니다.",
              "Low training loss alone is not proof of overfitting. Diagnose it when training improves while validation rises and the generalization gap widens—the model is fitting training-specific accidents. Keep the test set for final evaluation, not checkpoint selection.",
            )}</p>
            <div className="training-curve-cases">
              <article><span>{t("최적화 실패", "OPTIMIZATION FAILURE")}</span><strong>train ↔ · val ↔</strong><p>{t("둘 다 높고 거의 움직이지 않음", "Both stay high and nearly flat")}</p></article>
              <article><span>UNDERFIT</span><strong>train high · val high</strong><p>{t("표현력·학습 시간이 모두 부족할 수 있음", "Capacity or training time may be insufficient")}</p></article>
              <article className="is-warning"><span>OVERFIT</span><strong>train ↓ · val ↑</strong><p>{t("validation 최소 checkpoint를 보존", "Keep the validation-minimum checkpoint")}</p></article>
            </div>
            <div className="training-checkpoint-strip" aria-label={t("epoch별 train과 validation loss 예시", "Example train and validation loss by epoch")}>
              {[1, 2, 3, 4, 5].map((epoch, index) => {
                const train = [0.82, 0.55, 0.31, 0.18, 0.12][index];
                const validation = [0.86, 0.58, 0.37, 0.41, 0.53][index];
                return (
                  <article className={epoch === 3 ? "is-best" : undefined} key={epoch}>
                    <span>EPOCH {epoch}</span>
                    <strong>train {train.toFixed(2)}</strong>
                    <strong>val {validation.toFixed(2)}</strong>
                    {epoch === 3 ? <small>{t("보존", "KEEP")}</small> : null}
                  </article>
                );
              })}
            </div>
            <div className="training-dropout-contract">
              <div>
                <span>TRAIN</span>
                <strong>{t("random mask · 생존값 ÷ (1-p)", "random mask · survivors ÷ (1-p)")}</strong>
                <p>{t("각 forward마다 mask를 새로 뽑아 activation의 기댓값을 보존", "Draw a new mask per forward and preserve expected activation")}</p>
              </div>
              <div>
                <span>EVAL</span>
                <strong>{t("dropout off · deterministic", "dropout off · deterministic")}</strong>
                <p>{t("mask와 scaling 없이 같은 입력은 같은 출력", "No mask or scaling; the same input yields the same output")}</p>
              </div>
            </div>
            <p className="training-precision-note">{t(
              "Inverted dropout은 개별 mask에서 activation 합을 고정하는 것이 아니라 여러 mask에 대한 기댓값을 보존합니다. Dropout은 일반화를 보장하는 유일한 방법도 아닙니다.",
              "Inverted dropout preserves expectation across masks; it does not fix the activation sum for every mask. Dropout is not the only route to generalization, nor does it guarantee it.",
            )}</p>
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">07 — DEBUG</div>
            <h2>{t("훈련 loop의 경계는 실행 결과로 수리합니다", "Repair training-loop boundaries by executing their contracts")}</h2>
            <p>{t(
              "softmax 축, fused CE 입력, gradient와 Adam state의 수명, dropout train/eval 모드를 각각 고쳐 보세요. 모든 patch는 실제 수치를 다시 계산하고 구체적인 실패 원인을 돌려줍니다.",
              "Repair the softmax axis, fused-CE input, gradient versus Adam-state lifetime, and dropout train/eval mode. Every patch reruns real numbers and reports the specific failure cause.",
            )}</p>
            <TrainingLoopDebugger onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER</div>
            <h2>{t("다음 장의 embedding table도 같은 gradient loop로 학습됩니다", "The next chapter's embedding table learns through the same gradient loop")}</h2>
            <p>{t(
              "Embedding lookup은 token ID가 가리킨 table row를 꺼냅니다. forward에서 참조한 row에만 data-gradient 기여가 생기고, 같은 token이 여러 번 등장하면 그 row에 기여들이 더해집니다. 기여끼리 상쇄될 수는 있지만, 등장하지 않은 row는 그 batch의 data gradient가 0입니다.",
              "An embedding lookup retrieves table rows referenced by token IDs. Only rows used in the forward pass receive data-gradient contributions, and repeated tokens add contributions into the same row. Contributions can cancel, but an unseen row has zero data gradient from that batch.",
            )}</p>
            <div className="training-embedding-transfer">
              <ArrayDiagram
                values={[[2, 5, 2], [1, 5, 4]]}
                shape={[2, 3]}
                label={t("token ID batch", "Token-ID batch")}
                rowLabels={[t("문장 A", "sentence A"), t("문장 B", "sentence B")]}
                columnLabels={["t₁", "t₂", "t₃"]}
                tone="indigo"
                compact
              />
              <span aria-hidden="true">lookup →</span>
              <div>
                <strong>E[V,2] → [2,3,2] → mean [2,2] → logits [2,3]</strong>
                <p>{t("gradient row: 1, 2, 4, 5 · token 2와 5는 두 기여", "gradient rows: 1, 2, 4, 5 · tokens 2 and 5 receive two contributions")}</p>
              </div>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">→</span>
              <div>
                <strong>{t("전이 과제", "Transfer task")}</strong>
                <p>{t(
                  "위 batch에서 token 0과 3의 embedding row가 바뀌어야 한다고 주장하는 동료를 디버깅하세요. weight decay가 없는 data-gradient 관점에서는 forward가 참조하지 않은 두 row의 gradient가 왜 0인지 shape와 index로 설명하세요.",
                  "Debug a teammate who claims embedding rows for tokens 0 and 3 must change. With no weight decay and considering data gradients, explain from shapes and indices why unreferenced rows receive zero gradient.",
                )}</p>
              </div>
            </div>
            <p>{t(
              "다음 장에서는 one-hot×E와 direct lookup이 같은 row를 고른다는 사실에서 시작해 token을 계산 가능한 공간에 놓습니다.",
              "The next chapter starts from the equivalence of one-hot×E and direct lookup, placing tokens into a space we can compute with.",
            )}</p>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">09 — CHECK</div>
            <TrainingConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{t("이제 forward pass를 일반화 가능한 훈련 loop로 운영할 수 있습니다", "You can now operate a forward pass as a generalizable training loop")}</h2>
            <p>{t(
              "한 batch의 local loss와 full loss가 다르게 움직임을 예측·관찰하고, Adam memory를 파라미터 셀까지 추적하며, 네 훈련 사건과 다섯 개념을 연결하면 목표에 도달했습니다.",
              "You have reached the goal after predicting and observing local versus full loss movement, tracing Adam memory into a parameter cell, and connecting four training incidents with all five concepts.",
            )}</p>
            <div className="training-completion-checklist" role="status" aria-live="polite">
              <span className={batchLabComplete ? "is-complete" : undefined}>{batchLabComplete ? "✓" : "○"} {t("필수 mini-batch·Adam lab", "Required mini-batch and Adam lab")}</span>
              <span className={debuggerComplete ? "is-complete" : undefined}>{debuggerComplete ? "✓" : "○"} {t("훈련 계약 복구 4개", "Four training-contract repairs")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={TRANSFORMER_CURRICULUM_SLUG}
              slug="training"
              canComplete={canComplete}
              lockedMessage={t(
                "필수 mini-batch lab, 훈련 loop 복구 네 사건과 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
                "Finish the required mini-batch lab, all four training-loop repairs, and all five concept questions to complete the chapter.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview
              ? <a href={previousPreviewHref}>← {t("이전: 분류와 신경망", "Previous: Classification and Neural Networks")}</a>
              : <span>← {t("이전: 분류와 신경망", "Previous: Classification and Neural Networks")}</span>}
            {preview
              ? <a href={nextPreviewHref}>{t("다음: 토큰과 임베딩", "Next: Tokens and Embeddings")} →</a>
              : <span>{t("다음: 토큰과 임베딩", "Next: Tokens and Embeddings")} <small>{t("준비 중", "Coming soon")}</small></span>}
          </nav>
        </article>
      </div>
    </main>
  );
}
