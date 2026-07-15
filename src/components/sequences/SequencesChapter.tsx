import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import { canCompleteSequencesChapter } from "../../features/sequences/sequence-model";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { ArrayDiagram } from "../interactive/ArrayDiagram";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { MathFormula } from "../MathFormula";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { SequenceDebuggerLab } from "./SequenceDebuggerLab";
import { SequenceMemoryLab } from "./SequenceMemoryLab";
import { SequencesConceptCheck } from "./SequencesConceptCheck";

const tocItems = {
  ko: [
    { id: "order", label: "순서와 state" },
    { id: "recurrence", label: "RNN unroll" },
    { id: "memory-lab", label: "필수 memory lab" },
    { id: "gradient", label: "시간축 gradient" },
    { id: "gates", label: "LSTM gates" },
    { id: "debug", label: "계약 디버깅" },
    { id: "transfer", label: "Attention으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "order", label: "Order and state" },
    { id: "recurrence", label: "RNN unroll" },
    { id: "memory-lab", label: "Required memory lab" },
    { id: "gradient", label: "Temporal gradients" },
    { id: "gates", label: "LSTM gates" },
    { id: "debug", label: "Contract debugging" },
    { id: "transfer", label: "Transfer to Attention" },
    { id: "check", label: "Concept check" },
  ],
} as const;

const forwardRows = [[1], [0], [-1]];
const reverseRows = [[-1], [0], [1]];

export function SequencesChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "sequences");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [memoryLabComplete, setMemoryLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteSequencesChapter({
    memoryLabComplete,
    debuggerComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/embeddings${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell sequences-chapter-shell">
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
          <header className="lesson-hero sequences-lesson-hero">
            <p className="eyebrow">
              ORDER → STATE → UNROLL → GRADIENT → GATES → ROUTING · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">06</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>같은 embedding row라도 <em>언제</em> 읽었는지가 결과를 바꿉니다. 공유 cell을 시간축으로 펼쳐 hidden state가 prefix를 압축하는 방법, 먼 신호의 gradient가 약해지는 이유, gated carry가 기억 경로를 바꾸는 방법을 직접 실행합니다.</>
              ) : (
                <>The same embedding row can mean something different depending on <em>when</em> it is read. Unroll a shared cell through time, inspect how hidden state compresses a prefix, see why distant gradients fade, and change the memory path with gated carry.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("ordered embedding [B,T,D]를 shared cell에 순서대로 넣어 hidden trace [B,T,H]와 final state [B,H]를 구분할 수 있다.", "Feed ordered embeddings [B,T,D] through a shared cell and distinguish hidden trace [B,T,H] from final state [B,H].")}</li>
                <li>{t("hₜ=tanh(Wₓxₜ+Wₕhₜ₋₁)을 펼쳐 같은 token multiset의 순서가 final state를 바꿈을 증명할 수 있다.", "Unroll h_t=tanh(W_x x_t+W_h h_(t-1)) and prove that order changes final state for the same token multiset.")}</li>
                <li>{t("첫 token으로 가는 gradient를 local Jacobian의 곱으로 계산해 forward 기억과 gradient 보존을 구분할 수 있다.", "Compute the gradient to the first token as a product of local Jacobians and distinguish forward memory from gradient preservation.")}</li>
                <li>{t("LSTM의 carry·write·reveal gate를 조립하고 cₜ와 hₜ의 역할을 구분할 수 있다.", "Assemble LSTM carry, write, and reveal gates and distinguish c_t from h_t.")}</li>
                <li>{t("긴 recurrent 경로가 Attention의 직접 정보 접근을 동기화하는 이유를 설명할 수 있다.", "Explain why long recurrent paths motivate Attention's direct access to information.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="order">
            <div className="margin-label">01 — ORDERED ROWS</div>
            <h2>{t("평균이 지운 순서를 state update가 다시 모델링합니다", "State updates model the order that a mean erased")}</h2>
            <p>{t(
              "앞 장의 lookup은 token 위치마다 row를 남겼지만 plain mean은 [signal, gap, cancel]과 역순을 같은 합으로 만들었습니다. sequence model은 위치를 평균내지 않고 첫 row부터 하나씩 읽습니다. 현재 hidden state는 지금까지 본 prefix의 고정 폭 요약입니다.",
              "The previous chapter's lookup retained one row per token, but a plain mean gave [signal, gap, cancel] the same sum as its reverse. A sequence model does not average positions first: it reads rows one by one. Current hidden state is a fixed-width summary of the prefix seen so far.",
            )}</p>
            <div className="concept-callout sequences-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t(
                  "벡터 shape와 tanh, 신경망의 공유 weight, 훈련 장의 chain rule, 임베딩 장의 ordered lookup rows를 그대로 사용합니다.",
                  "Reuse vector shapes and tanh, shared neural-network weights, the training chapter's chain rule, and ordered embedding lookup rows.",
                )}</p>
                {preview
                  ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a>
                  : <span>{t("이전: 토큰과 임베딩", "Previous: Tokens and Embeddings")}</span>}
              </div>
            </div>
            <div className="sequences-order-pair">
              <article>
                <span>{t("정방향 rows", "Forward rows")}</span>
                <ArrayDiagram values={forwardRows} shape={[3, 1]} label={t("정방향 입력", "forward input")} rowLabels={["t0", "t1", "t2"]} columnLabels={["x"]} tone="indigo" compact />
                <strong>{t("합 = 0, 순서 = + → 0 → −", "sum = 0, order = + → 0 → −")}</strong>
              </article>
              <article>
                <span>{t("역방향 rows", "Reversed rows")}</span>
                <ArrayDiagram values={reverseRows} shape={[3, 1]} label={t("역방향 입력", "reversed input")} rowLabels={["t0", "t1", "t2"]} columnLabels={["x"]} tone="forest" compact />
                <strong>{t("합 = 0, 순서 = − → 0 → +", "sum = 0, order = − → 0 → +")}</strong>
              </article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div>
                <strong>{t("hidden state는 전체 과거의 무손실 저장소가 아닙니다", "Hidden state is not a lossless store of the entire past")}</strong>
                <p>{t(
                  "고정된 H개 숫자에 prefix를 압축하므로 어떤 정보는 유지되고 어떤 정보는 섞이거나 사라질 수 있습니다. state가 존재한다는 사실만으로 장기 기억을 보장하지 않습니다.",
                  "A prefix is compressed into H numbers, so some information may remain while other information mixes or disappears. The existence of state alone does not guarantee long-term memory.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="recurrence">
            <div className="margin-label">02 — SHARED RECURRENCE</div>
            <h2>{t("같은 cell을 재사용하되 서로 다른 prefix state를 전달합니다", "Reuse one cell while passing a different prefix state")}</h2>
            <p>{t(
              "scalar 교육 모델은 입력 xₜ와 이전 hidden hₜ₋₁을 더해 tanh로 누릅니다. recurrent gain r은 이전 state가 다음 계산에 미치는 세기입니다. weight는 공유되지만 hₜ₋₁이 매번 달라서 시점의 결과도 달라집니다.",
              "The scalar teaching model adds current input x_t to prior hidden h_(t-1), then squashes with tanh. Recurrent gain r controls how strongly prior state enters the next computation. The weight is shared, but each timestep receives a different h_(t-1).",
            )}</p>
            <MathFormula latex={String.raw`h_t=\tanh(x_t+r h_{t-1}),\qquad h_0=0`} display />
            <div className="sequences-unroll">
              <article><span>t0</span><strong>h₀ → x₀ → h₁</strong><p>{t("첫 prefix", "first prefix")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>t1</span><strong>h₁ → x₁ → h₂</strong><p>{t("두 token prefix", "two-token prefix")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>t2</span><strong>h₂ → x₂ → h₃</strong><p>{t("마지막 압축", "final compression")}</p></article>
            </div>
            <p className="sequences-precision-note">{t(
              "이 장의 scalar state와 미리 정한 gate 값은 원리를 드러내는 결정적 sandbox입니다. 실제 RNN/LSTM은 vector state와 학습된 matrix를 쓰고, gate는 sigmoid가 만든 0과 1 사이의 값입니다.",
              "This chapter's scalar state and preset gate values form a deterministic sandbox that exposes the mechanism. Real RNNs and LSTMs use vector states and learned matrices, with sigmoid-produced gates between zero and one.",
            )}</p>
          </section>

          <div id="memory-lab">
            <SequenceMemoryLab onCompletionChange={setMemoryLabComplete} />
          </div>

          <section className="article-section" id="gradient">
            <div className="margin-label">04 — TEMPORAL GRADIENT</div>
            <h2>{t("먼 신호에 대한 final-state 민감도는 시간축 미분을 연속으로 곱합니다", "Final-state sensitivity to a distant signal multiplies derivatives through time")}</h2>
            <p>{t(
              "마지막 state h_T가 첫 입력 x₀에 얼마나 민감한지는 중간 state들을 건너뛰지 않습니다. tanh의 local derivative와 recurrent gain이 recurrent edge마다 하나씩 곱해집니다. loss gradient는 여기에 upstream ∂L/∂h_T를 한 번 더 곱하며, 이 lab은 state 경로 자체를 보기 위해 그 upstream factor를 1로 둡니다.",
              "Sensitivity of final state h_T to first input x_0 cannot skip intermediate states. Every recurrent edge contributes a tanh local derivative and the recurrent gain. A loss gradient additionally multiplies the upstream factor ∂L/∂h_T; this lab sets that factor to one to isolate the state path.",
            )}</p>
            <div className="sequences-gradient-formulas">
              <MathFormula latex={String.raw`S_{T\leftarrow0}:=\frac{\partial h_T}{\partial x_0}`} display />
              <MathFormula latex={String.raw`J_t:=\frac{\partial h_t}{\partial h_{t-1}}=r(1-h_t^2)`} display />
              <MathFormula latex={String.raw`S_{T\leftarrow0}=(1-h_1^2)\prod_{t=2}^{T}J_t`} display />
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("gradient 소실은 forward 신호가 즉시 0이라는 뜻이 아닙니다", "A vanishing gradient does not mean the forward signal instantly became zero")}</strong>
                <p>{t(
                  "forward state에는 작은 흔적이 남아도 backward의 긴 곱은 훨씬 작을 수 있습니다. r을 크게 하는 것만으로 해결하면 tanh saturation이나 폭주 경로가 생길 수 있습니다.",
                  "A small forward trace may remain while the long backward product becomes much smaller. Merely increasing r can create tanh saturation or exploding paths.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="gates">
            <div className="margin-label">05 — GATED CARRY</div>
            <h2>{t("LSTM은 carry·write·reveal 경로를 서로 다른 gate로 엽니다", "An LSTM opens carry, write, and reveal paths with separate gates")}</h2>
            <p>{t(
              "cell state c는 이전 기억을 더 직접적으로 운반합니다. forget gate f는 이전 c를 얼마나 남길지, input gate i는 candidate g를 얼마나 쓸지, output gate o는 현재 c를 hidden h로 얼마나 드러낼지 정합니다.",
              "Cell state c carries prior memory more directly. Forget gate f controls how much prior c remains, input gate i controls how much candidate g is written, and output gate o controls how much current c is revealed as hidden h.",
            )}</p>
            <MathFormula latex={String.raw`c_t=f_t c_{t-1}+i_t g_t,\qquad h_t=o_t\tanh(c_t)`} display />
            <div className="sequences-gate-roles">
              <article><span>f · CARRY</span><strong>{t("이전 cell 유지", "retain prior cell")}</strong><p>f=1 → carry</p></article>
              <article><span>i · WRITE</span><strong>{t("candidate 기록", "write candidate")}</strong><p>i=0 → no write</p></article>
              <article><span>o · REVEAL</span><strong>{t("hidden으로 노출", "reveal as hidden")}</strong><p>{t("o=0 → hidden 닫힘 · cell 유지", "o=0 → hidden closed · cell preserved")}</p></article>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">c/h</span>
              <div>
                <strong>{t("output gate는 cell state를 지우지 않습니다", "The output gate does not erase cell state")}</strong>
                <p>{t(
                  "o=0이면 h는 닫히지만 c는 그대로 carry할 수 있습니다. 반대로 이미 c에서 사라진 정보를 output gate가 복원할 수는 없습니다. LSTM은 소실을 완화할 경로를 제공하지만 완전히 없앤다고 보장하지 않습니다.",
                  "With o=0, h closes while c may continue carrying memory. Conversely, an output gate cannot restore information already lost from c. An LSTM offers a path that can mitigate vanishing, not a guarantee that it disappears.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">06 — DEBUG</div>
            <h2>{t("순서·prefix·carry·reveal 경계를 숫자로 복구합니다", "Restore order, prefix, carry, and reveal boundaries with numbers")}</h2>
            <p>{t(
              "각 사건의 repair는 실제 state transition과 gate probe를 실행해 판정합니다. 이름이 그럴듯한 선택이 아니라 순서 민감성, causal prefix, cell update, hidden reveal 불변식을 모두 지키는지를 확인하세요.",
              "Each repair is graded by running actual state transitions and gate probes. Judge whether it preserves order sensitivity, causal prefixes, cell updates, and hidden reveal invariants—not whether its name merely sounds plausible.",
            )}</p>
            <SequenceDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">07 — TRANSFER</div>
            <h2>{t("마지막 query가 첫 증거를 찾는 경로 길이를 비교하세요", "Compare path lengths from the final query to the first clue")}</h2>
            <p>{t(
              "길이 T의 RNN에서 첫 token의 정보는 마지막 state까지 T−1개의 recurrent edge를 통과합니다. 다음 장에서는 마지막 query가 허용된 모든 key와 비교하고 value들의 softmax 가중합을 만듭니다. 먼 t0가 큰 weight를 받으면 한 층의 가중 경로로 강하게 참조되지만, 한 위치를 hard-select하는 것은 아닙니다. Q·K·V 계산 자체는 아직 실행하지 않습니다.",
              "In a length-T RNN, information from the first token crosses T−1 recurrent edges to reach the final state. The next chapter lets the final query compare against every allowed key and form a softmax-weighted sum of values. A distant t0 can receive a large weight through one layer, but Attention does not hard-select a single position. We do not run Q, K, and V calculations yet.",
            )}</p>
            <div className="sequences-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t(
                "12-token sequence에서 t0의 증거가 t11에 닿는 recurrent edge 수를 세고, 한 Attention 층에서 t0가 큰 가중치를 받는 경로와 비교하세요. 여러 value의 가중합이라는 점과 position·causal mask가 왜 여전히 별도 규칙인지도 덧붙이세요.",
                "Count the recurrent edges from evidence at t0 to t11 in a 12-token sequence, then compare them with one Attention layer where t0 receives a large weight. Also note that the output is a weighted sum of values and explain why position and causal masking remain separate rules.",
              )}</p>
              <div className="sequences-path-comparison" aria-label={t("정보 경로 비교", "information path comparison")}>
                <span>RNN · t0 → t1 → … → t11</span>
                <span>ATTENTION · Σ α₁₁,ⱼvⱼ · α₁₁,₀ ↑</span>
              </div>
            </div>
          </section>

          <section className="article-section" id="check">
            <div className="margin-label">08 — CONCEPT CHECK</div>
            <SequencesConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="sequences-completion-checklist" aria-label={t("챕터 완료 조건", "Chapter completion requirements")}>
              <span className={memoryLabComplete ? "is-complete" : undefined}>{memoryLabComplete ? "✓" : "○"} {t("필수 sequence memory lab", "Required sequence memory lab")}</span>
              <span className={debuggerComplete ? "is-complete" : undefined}>{debuggerComplete ? "✓" : "○"} {t("시퀀스 계약 복구 4개", "Four sequence-contract repairs")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={TRANSFORMER_CURRICULUM_SLUG}
              slug="sequences"
              canComplete={canComplete}
              lockedMessage={t(
                "필수 memory lab, 시퀀스 계약 복구 네 사건과 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
                "Finish the required memory lab, all four sequence-contract repairs, and all five concept questions to complete the chapter.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview
              ? <a href={previousPreviewHref}>← {t("이전: 토큰과 임베딩", "Previous: Tokens and Embeddings")}</a>
              : <span>← {t("이전: 토큰과 임베딩", "Previous: Tokens and Embeddings")}</span>}
            <span>{t("다음: Attention", "Next: Attention")} <small>{t("준비 중", "Coming soon")}</small></span>
          </nav>
        </article>
      </div>
    </main>
  );
}
