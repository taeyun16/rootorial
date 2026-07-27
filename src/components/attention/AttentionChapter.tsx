import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  attentionThreeQueryCode,
  attentionValueReadRepairCode,
} from "../../data/attentionNotebook";
import { canCompleteAttentionChapter } from "../../features/attention/attention-model";
import { useLocale } from "../../features/localization/localization";
import { AttentionPipelineExplorer } from "../AttentionPipelineExplorer";
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
import { RootorialMark } from "../RootorialMark";
import { TransformerLearningGuide } from "../TransformerLearningGuide";
import { AttentionConceptCheck } from "./AttentionConceptCheck";
import { AttentionDebuggerLab } from "./AttentionDebuggerLab";

const tocItems = {
  ko: [
    { id: "bottleneck", label: "RNN 병목에서 직접 읽기로" },
    { id: "roles", label: "Query · Key · Value" },
    { id: "routing", label: "score · softmax · context" },
    { id: "attention-lab", label: "필수 Attention lab" },
    { id: "causal-ledger", label: "Q·K·V 변화 원장" },
    { id: "numpy-bridge", label: "NumPy routing bridge" },
    { id: "debug", label: "선택 · routing 계약 디버깅" },
    { id: "transfer", label: "Self-Attention으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "bottleneck", label: "From RNN bottleneck to direct reads" },
    { id: "roles", label: "Query, key, and value" },
    { id: "routing", label: "Score, softmax, and context" },
    { id: "attention-lab", label: "Required Attention lab" },
    { id: "causal-ledger", label: "Q/K/V causal ledger" },
    { id: "numpy-bridge", label: "NumPy routing bridge" },
    { id: "debug", label: "Optional · Debug routing contracts" },
    { id: "transfer", label: "Transfer to Self-Attention" },
    { id: "check", label: "Concept check" },
  ],
} as const;

const workedQuery = [[1, 0]];
const workedKeys = [[1.5, 0], [0, 1], [-0.5, 0.5]];
const workedValues = [[1, 0, 0.2], [0, 1, 0.1], [0.2, 0.8, 1]];
const workedScores = [[1.5, 0, -0.5]];
const workedWeights = [[0.736, 0.164, 0.1]];
const workedContext = [[0.756, 0.244, 0.264]];

export function AttentionChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "attention");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labComplete, setLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteAttentionChapter({
    labComplete,
    debuggerComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/sequences${isKo ? "" : "?lang=en"}`;
  const nextPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/self-attention${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell attention-chapter-shell">
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
            <div className="mini-progress">
              <span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} />
            </div>
            <span>{chapterNumber} / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />

        <article className="lesson-article">
          <header className="lesson-hero attention-lesson-hero">
            <p className="eyebrow">
              QUERY → KEY SCORES → KEY-AXIS SOFTMAX → WEIGHTED VALUES · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">07</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>RNN이 source 전체를 마지막 state 하나에 눌러 담는 대신, decoder의 <em>현재 질문</em>이 필요한 source row를 직접 비교합니다. Query·Key·Value를 분리하고 score에서 context까지 숫자로 라우팅하세요.</>
              ) : (
                <>Instead of compressing the entire source into one final RNN state, the decoder's <em>current question</em> compares source rows directly. Separate query, key, and value roles, then route numbers from scores to context.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("decoder query q[dₖ], source keys K[S,dₖ], values V[S,dᵥ]의 정보원과 shape를 구분할 수 있다.", "Distinguish the information sources and shapes of decoder query q[d_k], source keys K[S,d_k], and values V[S,d_v].")}</li>
                <li>{t("qKᵀ를 계산해 source key별 score [S]를 만들고 query가 바뀔 때 정렬 순위가 바뀜을 예측할 수 있다.", "Compute qK transpose to produce one score per source key [S], then predict how changing the query changes the alignment ranking.")}</li>
                <li>{t("각 query 안의 key 축으로 안정적 softmax를 적용해 weight가 유한·비음수이고 합이 1임을 검증할 수 있다.", "Apply stable softmax across keys within each query and verify that weights are finite, nonnegative, and sum to one.")}</li>
                <li>{t("context=αV를 계산해 여러 value가 만드는 soft mixture와 argmax hard retrieval을 구분할 수 있다.", "Compute context=alpha V and distinguish a soft mixture of values from argmax hard retrieval.")}</li>
                <li>{t("key/value row 결합을 보존하고 이 단일-query cross-attention을 다음 장의 Self-Attention과 구분할 수 있다.", "Preserve key-value row identity and distinguish this single-query cross-attention from the next chapter's Self-Attention.")}</li>
              </ul>
            </div>
          </header>

          <TransformerLearningGuide chapterSlug="attention" />

          <section className="article-section" id="bottleneck">
            <div className="margin-label">01 — FROM RECURRENT BOTTLENECK TO DIRECT READ</div>
            <h2>{t("decoder가 매 순간 같은 압축 하나만 읽지 않게 합니다", "Let the decoder read more than the same single compression at every step")}</h2>
            <p>{t(
              "직전 장의 RNN final state는 source prefix를 고정된 H개 숫자로 압축했습니다. 짧은 sequence에서는 충분할 수 있지만 긴 source의 첫 증거는 많은 recurrent edge를 지나며 섞이거나 약해질 수 있습니다. Attention은 encoder가 남긴 source row들을 보존하고, 현재 decoder state가 만든 query로 그중 필요한 row를 직접 읽는 경로를 추가합니다.",
              "The previous chapter's final RNN state compressed a source prefix into H fixed numbers. That may suffice for a short sequence, but early evidence in a long source can mix or fade across many recurrent edges. Attention retains the encoder's source rows and adds a direct read path selected by a query from the current decoder state.",
            )}</p>
            <div className="attention-path-comparison" role="group" aria-label={t("RNN 병목과 Attention 경로 비교", "Comparison of the RNN bottleneck and Attention path")}>
              <article><span>RNN</span><strong>source rows → h<sub>final</sub> → decoder</strong><p>{t("모든 생성 시점이 같은 압축에서 시작", "every generation step starts from the same compression")}</p></article>
              <article><span>ATTENTION</span><strong>q → source K/V → c(q)</strong><p>{t("현재 query마다 source routing을 다시 계산", "recompute source routing for the current query")}</p></article>
            </div>
            <div className="concept-callout attention-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t(
                  "벡터 장의 내적·matrix shape, 훈련 장의 안정적 softmax, 임베딩 장의 ordered rows, 시퀀스 장의 hidden trace·final-state 병목을 그대로 사용합니다. Q/K/V는 이 장에서 이미 만들어진 vector 역할로 주어지며 learned projection은 다음 장으로 남깁니다.",
                  "Reuse dot products and matrix shapes from vectors, stable softmax from training, ordered rows from embeddings, and hidden traces plus the final-state bottleneck from sequences. This chapter receives Q/K/V as already-produced vector roles; learned projections remain for the next chapter.",
                )}</p>
                {preview
                  ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a>
                  : <span>{t("이전: 순서가 있는 데이터", "Previous: Sequential Data")}</span>}
              </div>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div>
                <strong>{t("Attention이 source를 완벽히 기억하거나 한 위치를 선택한다고 보장하지 않습니다", "Attention does not guarantee perfect memory or a single selected location")}</strong>
                <p>{t(
                  "더 짧은 정보 경로와 query별 context를 제공하지만 정렬이 항상 옳다는 보장은 없습니다. softmax weight는 여러 source value를 섞으며, 언어적 진실이나 설명 확률 그 자체도 아닙니다.",
                  "It provides shorter information paths and query-specific context, but does not guarantee correct alignment. Softmax weights mix multiple source values and are not themselves probabilities of linguistic truth or faithful explanations.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="roles">
            <div className="margin-label">02 — QUERY · KEY · VALUE</div>
            <h2>{t("찾을 기준과 가져올 내용을 같은 row 안에서 분리합니다", "Separate how a row is found from the content it contributes")}</h2>
            <p>{t(
              "query q는 decoder가 지금 필요한 정보를 나타냅니다. 각 source row의 key는 q와 비교될 주소이고, 같은 row의 value는 그 row가 선택될 때 context에 보낼 내용입니다. K와 V는 row 수 S가 같아야 하며 둘 중 하나만 재정렬하면 주소와 내용의 대응이 깨집니다.",
              "Query q represents what the decoder currently needs. Each source key is the address compared with q, while the value in the same row is the content sent into context when that row receives weight. K and V must share row count S; reordering only one breaks the address-content pairing.",
            )}</p>
            <div className="attention-role-grid">
              <article><span>QUERY · q[dₖ]</span><strong>{t("현재 decoder의 정보 요청", "current decoder information request")}</strong><p>{t("이 예제에서는 색상 단어를 생성하려는 query", "in this example, a query seeking a color word")}</p></article>
              <article><span>KEYS · K[S,dₖ]</span><strong>{t("source row별 비교 주소", "comparison addresses per source row")}</strong><p>{t("q와 같은 dₖ 폭에서 내적", "dot with q in the same d_k width")}</p></article>
              <article><span>VALUES · V[S,dᵥ]</span><strong>{t("context에 섞일 내용", "content mixed into context")}</strong><p>{t("dᵥ는 dₖ와 달라도 됨", "d_v may differ from d_k")}</p></article>
            </div>
            <div className="attention-worked-inputs">
              <ArrayDiagram values={workedQuery} shape={[1, 2]} label={t("색상 query q", "color query q")} rowLabels={["decoder"]} columnLabels={["q0", "q1"]} tone="terra" compact />
              <MatrixGrid values={workedKeys} label="K [3,2]" rowLabels={isKo ? ["빨간", "자동차", "달린다"] : ["red", "car", "moves"]} columnLabels={["k0", "k1"]} tone="indigo" />
              <MatrixGrid values={workedValues} label="V [3,3]" rowLabels={isKo ? ["빨간", "자동차", "달린다"] : ["red", "car", "moves"]} columnLabels={["v0", "v1", "v2"]} tone="forest" />
            </div>
          </section>

          <section className="article-section" id="routing">
            <div className="margin-label">03 — SCORE → KEY-AXIS SOFTMAX → CONTEXT</div>
            <h2>{t("한 query의 비교 점수를 source routing 분포로 바꿉니다", "Turn one query's comparison scores into a source-routing distribution")}</h2>
            <p>{t(
              "먼저 q와 K의 각 row를 내적합니다. 이 장은 역할과 축에 집중하므로 score를 크기 조정하지 않습니다. 결과 [S]에 source key 축 softmax를 적용하고, 그 weight로 같은 row의 V를 가중합합니다.",
              "First dot q with every row of K. This chapter leaves scores unscaled so it can focus on roles and axes. Apply softmax across the source-key axis of the resulting [S], then use those weights to mix values from matching rows.",
            )}</p>
            <div className="attention-routing-formulas">
              <MathFormula latex={String.raw`s_j=q\cdot k_j,\qquad s=qK^{\mathsf T}\in\mathbb{R}^{S}`} display />
              <MathFormula latex={String.raw`m=\max_j s_j,\qquad \alpha_j=\frac{e^{s_j-m}}{\sum_{\ell=1}^{S}e^{s_\ell-m}}`} display />
              <MathFormula latex={String.raw`c=\sum_{j=1}^{S}\alpha_jv_j=\alpha V\in\mathbb{R}^{d_v}`} display />
            </div>
            <div className="attention-shape-ladder" role="group" aria-label={t("단일 query Attention shape 흐름", "Single-query Attention shape flow")}>
              <article><span>SCORE</span><strong>[dₖ] @ [dₖ,S] → [S]</strong><p>q @ Kᵀ</p></article>
              <span aria-hidden="true">→</span>
              <article><span>WEIGHTS</span><strong>[S] · Σα=1</strong><p>{t("key 축 softmax", "key-axis softmax")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>CONTEXT</span><strong>[S] @ [S,dᵥ] → [dᵥ]</strong><p>α @ V</p></article>
            </div>
            <div className="attention-worked-output">
              <ArrayDiagram values={workedScores} shape={[1, 3]} label="scores" rowLabels={["q"]} columnLabels={isKo ? ["빨간", "자동차", "달린다"] : ["red", "car", "moves"]} tone="terra" compact />
              <span aria-hidden="true">softmax →</span>
              <ArrayDiagram values={workedWeights} shape={[1, 3]} label="weights" rowLabels={["q"]} columnLabels={isKo ? ["빨간", "자동차", "달린다"] : ["red", "car", "moves"]} tone="indigo" compact />
              <span aria-hidden="true">@ V →</span>
              <ArrayDiagram values={workedContext} shape={[1, 3]} label="context" rowLabels={["c(q)"]} columnLabels={["v0", "v1", "v2"]} tone="forest" compact />
            </div>
            <p className="attention-precision-note">{t(
              "softmax 전에 row의 최댓값 m을 빼면 overflow를 피하면서 같은 분포를 얻습니다. score 합으로 나누는 방식은 음수 weight를 만들 수 있습니다. 또한 0.736은 red가 73.6% 확률로 정답이라는 뜻이 아니라 이 계산에서 red row의 value에 주어진 routing 계수입니다.",
              "Subtracting row maximum m before softmax avoids overflow without changing the distribution. Dividing by the score sum can create negative weights. Also, 0.736 is not a 73.6% probability that red is the true answer; it is the routing coefficient assigned to that row's value in this computation.",
            )}</p>
          </section>

          <div id="attention-lab">
            <AttentionPipelineExplorer onCompletionChange={setLabComplete} />
          </div>

          <section className="article-section" id="causal-ledger">
            <div className="margin-label">05 — Q · K · V CAUSAL LEDGER</div>
            <h2>{t("한 역할만 바꾸고 score·weight·context의 이동을 추적합니다", "Change one role at a time and trace scores, weights, and context")}</h2>
            <p>{t(
              "Attention을 디버깅할 때는 마지막 context만 비교하면 원인을 놓치기 쉽습니다. scores=QKᵀ, weights=softmax(scores), context=weights·V를 세 개의 연속된 장부로 두고, 어느 입력을 바꿨는지에 따라 처음 달라져야 하는 장부를 찾으세요.",
              "When debugging Attention, comparing only the final context can hide the cause. Treat scores=QK transpose, weights=softmax(scores), and context=weights times V as three consecutive ledgers, then identify which ledger should change first for the input you edited.",
            )}</p>
            <div className="attention-causal-ledger" role="list" aria-label={t("Q K V 변화에 따른 Attention 인과관계", "Attention causality under Q, K, and V edits")}>
              <article role="listitem">
                <span>CHANGE Q</span>
                <strong>scores → weights → context</strong>
                <p>{t(
                  "질문 방향을 바꾸면 모든 key와의 비교가 다시 계산됩니다. 따라서 top slot과 혼합 비율이 달라지고, 같은 V에서도 보통 다른 context를 읽습니다.",
                  "Changing the question direction recomputes every key comparison. The top slot and mixture can therefore move, usually producing a different context even with the same V.",
                )}</p>
              </article>
              <article role="listitem">
                <span>CHANGE K</span>
                <strong>routing changes first</strong>
                <p>{t(
                  "key는 주소입니다. 한 key를 바꾸면 그 열의 score가 먼저 바뀌고 softmax routing이 다시 배분되므로, value 내용이 그대로여도 context가 달라질 수 있습니다.",
                  "Keys are addresses. Editing one key first changes its score column and redistributes softmax routing, so context can change even when value content stays fixed.",
                )}</p>
              </article>
              <article role="listitem">
                <span>CHANGE V ONLY</span>
                <strong>scores = · weights = · context ≠</strong>
                <p>{t(
                  "Q와 K를 고정하면 score와 weight는 비트 단위로 같아야 합니다. 바뀐 value에 0이 아닌 weight가 있었다면 context만 달라지는 것이 올바른 반사실입니다.",
                  "With Q and K fixed, scores and weights must stay identical. If the edited value had nonzero weight, changing only V must change context and nothing upstream.",
                )}</p>
              </article>
              <article role="listitem">
                <span>REORDER K + V TOGETHER</span>
                <strong>{t("열 순서 ≠ 의미 변화", "column order is not a meaning change")}</strong>
                <p>{t(
                  "같은 permutation으로 K와 V row를 함께 옮기면 score·weight 열도 함께 재정렬되지만 주소-내용 결합은 보존되고 context는 같습니다. K 또는 V만 옮기면 그 결합이 깨집니다.",
                  "Applying the same permutation to K and V rows reorders score and weight columns together, but preserves address-content pairing and the resulting context. Moving only K or only V breaks that pairing.",
                )}</p>
              </article>
            </div>
            <div className="attention-ledger-example">
              <strong>{t("두 row 미니 증명", "TWO-ROW MINI PROOF")}</strong>
              <p>{t(
                "원래 읽기가 0.7A+0.3B라면 K/V를 함께 뒤집은 뒤 weight와 value는 각각 [0.3,0.7], [B,A]가 됩니다. 가중합은 0.3B+0.7A로 같지만, V만 [B,A]로 뒤집으면 0.7B+0.3A가 되어 의미가 달라집니다.",
                "If the original read is 0.7A+0.3B, jointly reversing K and V yields weights [0.3,0.7] over values [B,A]. The sum 0.3B+0.7A is unchanged; reversing only V instead yields 0.7B+0.3A and changes the meaning.",
              )}</p>
            </div>
          </section>

          <section className="article-section attention-python-bridge" id="numpy-bridge">
            <div className="margin-label">06 — NUMPY BRIDGE · OPTIONAL</div>
            <h2>{t("세 query의 routing과 value read를 실제 NumPy로 연결합니다", "Connect three-query routing to value reads in real NumPy")}</h2>
            <p>{t(
              "첫 셀은 subject·place·action query를 한 Q[3,2]에 쌓아 QKᵀ, query별 key축 stable softmax, weights·V를 순서대로 실행합니다. 둘째 셀은 weight로 key 주소를 다시 읽는 버그를 한 줄 수리하고, V-only 반사실의 shape와 인과관계를 assertion으로 확인합니다.",
              "The first cell stacks subject, place, and action queries into Q[3,2], then executes QK transpose, stable key-axis softmax per query, and weights times V. The second repairs a one-line bug that reads key addresses with the weights, then asserts the shape and causality of a V-only counterfactual.",
            )}</p>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 심화이며 필수 완료 경로와 분리됩니다", "Optional extension, separate from the required completion path")}</strong>
                <p>{t(
                  "각 셀은 Q·K·V와 stable softmax를 모두 다시 정의하므로 서로의 Python 상태에 의존하지 않습니다. 공유 Pyodide·NumPy runtime은 실행할 때만 지연 로드되며, 다운로드 실패는 필수 routing lab, debugger, 이해 확인이나 챕터 완료를 막지 않습니다.",
                  "Each cell rebuilds Q, K, V, and stable softmax, so neither depends on Python state left by the other. The shared Pyodide and NumPy runtime loads lazily only when run; a download failure does not block the required routing lab, debugger, concept check, or chapter completion.",
                )}</p>
              </div>
            </div>
            <NotebookCell
              title={t("세 query의 Attention routing trace", "Trace Attention routing for three queries")}
              initialCode={attentionThreeQueryCode}
              description={<p>{t(
                "scores·weights·contexts가 모두 [3,3]인지, 세 weight row의 합이 1인지, top slot이 subject·place·action 순서인지 확인하세요. 출력 context는 hard lookup이 아니라 세 value의 soft mixture입니다.",
                "Verify that scores, weights, and contexts are all [3,3], every weight row sums to one, and top slots are subject, place, then action. Each output context is a soft mixture of three values, not a hard lookup.",
              )}</p>}
              hint={<p>{t(
                "Q의 첫 두 row를 맞바꾸거나 마지막 query를 [-0.2,-0.2]로 약하게 만들어 top slot과 mixture가 어떻게 변하는지 비교한 뒤 셀을 초기화하세요.",
                "Swap the first two Q rows or weaken the final query to [-0.2,-0.2], compare how top slots and mixtures change, then reset the cell.",
              )}</p>}
              editorMinHeight={790}
              ariaLabel={t("세 query Attention routing NumPy 코드", "NumPy code for three-query Attention routing")}
            />
            <NotebookCell
              title={t("weights·V context 한 줄 수리", "Repair weights-times-V context in one line")}
              initialCode={attentionValueReadRepairCode}
              description={<p>{t(
                "처음 실행하면 read_context가 weights@K를 반환해 context.shape=(3,2)가 되고, V-only 변경도 context에 나타나지 않아 assertion이 실패합니다. REPAIR 아래 K를 올바른 함수 인자로 바꿔 [3,3] value read와 context 변화를 함께 복구하세요.",
                "The initial read_context returns weights@K, producing context.shape=(3,2) and hiding the V-only edit, so the assertion fails. Replace K below REPAIR with the correct function argument to restore both the [3,3] value read and the context change.",
              )}</p>}
              hint={<p>{t(
                "함수는 weights와 values를 인자로 받지만 현재 values를 사용하지 않습니다. score 비교용 주소와 context에 보낼 내용을 다시 구분하세요.",
                "The function receives weights and values but currently ignores values. Separate the addresses used for score comparisons from the content sent into context.",
              )}</p>}
              editorMinHeight={820}
              ariaLabel={t("Attention value read 수리 NumPy 코드", "NumPy code for repairing the Attention value read")}
            />
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">07 — OPTIONAL REMEDIATION · ROUTING DEBUGGER</div>
            <h2>{t("Softmax 축·QK 방향·context 재료·query 독립성을 실행 결과로 수리합니다", "Repair the softmax axis, QK direction, context source, and query independence from executed results")}</h2>
            <p>{t(
              "그럴듯한 이름을 고르는 활동이 아닙니다. 고정된 Q·K·V로 각 후보 연산을 실제 실행하고, 네 사건에 걸쳐 score shape, query별 weight 행 합, top source row와 context 폭을 검사해 key축 Softmax·QKᵀ·αV·독립 query row 계약을 판정합니다.",
              "This is not an exercise in choosing plausible labels. It executes every candidate operation against fixed Q, K, and V, then uses score shape, per-query weight sums, top source rows, and context width across four incidents to judge key-axis softmax, QK transpose, alpha V, and independent query-row contracts.",
            )}</p>
            <AttentionDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER TO SELF-ATTENTION</div>
            <h2>{t("query 하나를 이해한 뒤에만 모든 token query를 쌓습니다", "Stack all-token queries only after understanding one query")}</h2>
            <p>{t(
              "이번 장은 decoder query 하나가 encoder source K/V를 읽는 cross-attention으로 경계를 고정했습니다. 다음 장에서는 같은 sequence의 모든 token이 query를 만들고, 그 sequence에서 learned Q/K/V projection을 구성합니다. 차원에 따른 score scaling, autoregressive decoder의 causal mask, 여러 head를 나누고 합치는 계약도 다음 장에서 실행합니다. 이 장의 완료 경로에는 어느 것도 필요하지 않습니다.",
              "This chapter fixes the boundary at cross-attention: one decoder query reads encoder-source K/V. The next chapter lets every token in one sequence form a query and builds learned Q/K/V projections from that sequence. It will also execute dimension-dependent score scaling, causal masking for an autoregressive decoder, and the split-and-merge contract for multiple heads. None belongs to this chapter's completion path.",
            )}</p>
            <div className="attention-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t(
                "같은 K[3,dₖ]와 V[3,dᵥ]에 color query와 object query 두 개를 쌓는다고 가정하세요. score 표와 context 표의 shape를 각각 예측하고, 두 query가 같은 key-axis softmax를 공유하는 것이 아니라 각자 합 1의 row를 가져야 하는 이유를 설명하세요. 아직 scaling·mask·projection·multi-head 수치는 계산하지 마세요.",
                "Suppose you stack color and object queries against the same K[3,d_k] and V[3,d_v]. Predict the score-table and context-table shapes, then explain why each query needs its own sum-one row rather than sharing one key-axis softmax. Do not calculate scaling, masks, projections, or multiple heads yet.",
              )}</p>
              <div className="attention-transfer-shapes" aria-label={t("두 query의 예상 shape", "Expected shapes for two queries")}>
                <span>Q [2,dₖ]</span><span aria-hidden="true">→</span><span>scores [2,3]</span><span aria-hidden="true">→</span><span>context [2,dᵥ]</span>
              </div>
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">09 — CONCEPT CHECK</div>
            <AttentionConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="attention-completion-checklist" role="status" aria-live="polite">
              <span className={labComplete ? "is-complete" : undefined}>{labComplete ? "✓" : "○"} {t("필수 Attention routing lab", "Required Attention routing lab")}</span>
              <span className={`is-optional${debuggerComplete ? " is-complete" : ""}`}>{debuggerComplete ? "✓" : t("선택", "Optional")} {t("routing 계약 복구", "Routing-contract repairs")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={TRANSFORMER_CURRICULUM_SLUG}
              slug="attention"
              canComplete={canComplete}
              lockedMessage={t(
                "필수 Attention lab과 다섯 개념 확인을 완료하세요. Routing debugger는 선택 보강입니다.",
                "Complete the required Attention lab and all five concept checks. The routing debugger is optional remediation.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview
              ? <a href={previousPreviewHref}>← {t("이전: 순서가 있는 데이터", "Previous: Sequential Data")}</a>
              : <span>← {t("이전: 순서가 있는 데이터", "Previous: Sequential Data")}</span>}
            {preview
              ? <a href={nextPreviewHref}>{t("다음: Self-Attention", "Next: Self-Attention")} →</a>
              : <span>{t("다음: Self-Attention", "Next: Self-Attention")}</span>}
          </nav>
        </article>
      </div>
    </main>
  );
}
