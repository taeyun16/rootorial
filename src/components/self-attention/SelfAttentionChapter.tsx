import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  selfAttentionForwardTraceCode,
  selfAttentionForwardTraceSupportCode,
  selfAttentionMaskRepairCode,
  selfAttentionMaskRepairSupportCode,
} from "../../data/selfAttentionNotebook";
import { canCompleteSelfAttentionChapter } from "../../features/self-attention/self-attention-model";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { MathFormula } from "../MathFormula";
import { NotebookCell } from "../NotebookCell";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { TransformerLearningGuide } from "../TransformerLearningGuide";
import { SelfAttentionConceptCheck } from "./SelfAttentionConceptCheck";
import { SelfAttentionDebuggerLab } from "./SelfAttentionDebuggerLab";
import { SelfAttentionLab } from "./SelfAttentionLab";
import { SelfAttentionPracticeDeck } from "./SelfAttentionPracticeDeck";

const tocItems = {
  ko: [
    { id: "boundary", label: "Attention에서 Self-Attention으로" },
    { id: "projections", label: "같은 X, 다른 Q·K·V" },
    { id: "scaling", label: "Scaled dot-product" },
    { id: "mask", label: "미래를 막는 causal mask" },
    { id: "heads", label: "Multi-head split · concat" },
    { id: "worked-trace", label: "sat query 수치 추적" },
    { id: "self-attention-lab", label: "핵심 3 challenge lab" },
    { id: "numpy-bridge", label: "선택 NumPy bridge" },
    { id: "debug", label: "선택 · 정보 누출·shape 디버깅" },
    { id: "practice", label: "선택 · 독립 수행" },
    { id: "transfer", label: "Transformer block으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "boundary", label: "From Attention to Self-Attention" },
    { id: "projections", label: "One X, distinct Q, K, and V" },
    { id: "scaling", label: "Scaled dot product" },
    { id: "mask", label: "Causal masking" },
    { id: "heads", label: "Multi-head split and concat" },
    { id: "worked-trace", label: "Trace the sat query" },
    { id: "self-attention-lab", label: "Three-core-challenge lab" },
    { id: "numpy-bridge", label: "Optional NumPy bridge" },
    { id: "debug", label: "Optional · Debug leaks and shapes" },
    { id: "practice", label: "Optional · Independent practice" },
    { id: "transfer", label: "Transfer to the Transformer block" },
    { id: "check", label: "Concept check" },
  ],
} as const;

const maskCells = Array.from({ length: 4 }, (_, queryIndex) => (
  Array.from({ length: 4 }, (_, keyIndex) => keyIndex <= queryIndex)
));

export function SelfAttentionChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "self-attention");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labComplete, setLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteSelfAttentionChapter({
    labComplete,
    debuggerComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/attention${isKo ? "" : "?lang=en"}`;
  const nextPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/transformer-block${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell self-attention-chapter-shell">
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
          <header className="lesson-hero self-attention-lesson-hero">
            <p className="eyebrow">
              X → Q/K/V → SCALED SCORES → MASK → HEAD CONTEXTS → CONCAT · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">08</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {t(
                "한 query가 바깥 memory를 읽던 Attention을, 같은 token sequence의 모든 row가 서로를 읽는 계산으로 확장합니다. 투영·scaling·mask·head 축을 한 번에 숨기지 말고 경계마다 실행해 확인하세요.",
                "Extend Attention from one query reading external memory into every row of one token sequence reading that sequence. Execute projections, scaling, masks, and head axes one boundary at a time instead of hiding them in one call.",
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("X[T,d_model] 하나에서 서로 다른 WQ·WK·WV로 Q·K·V를 만들고 Self-Attention의 정보원을 설명할 수 있다.", "Create Q, K, and V from one X[T,d_model] with distinct WQ, WK, and WV, then explain the source of self-attention.")}</li>
                <li>{t("head별 QKᵀ/√d_h를 계산하고 scaling 전후의 top key와 분포 포화를 비교할 수 있다.", "Compute QK transpose divided by sqrt(d_h) per head and compare top keys and distribution saturation before and after scaling.")}</li>
                <li>{t("future key logit을 Softmax 전에 차단해 미래 weight 0, 허용 row 합 1, 현재 token 허용을 검증할 수 있다.", "Block future-key logits before softmax and verify zero future weight, unit mass over allowed keys, and visibility of the current token.")}</li>
                <li>{t("[H,T,d_h] head를 독립 실행하고 feature 축으로 concat해 [T,d_model]을 복원할 수 있다.", "Run [H,T,d_h] heads independently and concatenate their features back to [T,d_model].")}</li>
                <li>{t("mask는 visibility만 제한하며 position·residual·LayerNorm·FFN은 다음 Transformer block의 계약임을 구분할 수 있다.", "Distinguish a visibility mask from position, residual, LayerNorm, and FFN contracts reserved for the next Transformer block.")}</li>
              </ul>
            </div>
          </header>

          <TransformerLearningGuide chapterSlug="self-attention" />

          <section className="article-section" id="boundary">
            <div className="margin-label">01 — SAME SEQUENCE, ALL QUERY ROWS</div>
            <h2>{t("Self-Attention의 self는 자기 자신만 읽는다는 뜻이 아닙니다", "Self in Self-Attention does not mean reading only oneself")}</h2>
            <p>{t(
              "직전 장에서는 decoder query 하나가 encoder source의 K/V를 읽었습니다. 이제 query·key·value의 원본이 모두 같은 token matrix X입니다. 각 token은 query row가 되어 자신을 포함한 허용된 key row들과 비교하고, 각자의 context row를 만듭니다.",
              "The previous chapter used one decoder query to read encoder-source K/V. Now query, key, and value all originate from the same token matrix X. Every token becomes a query row, compares with allowed key rows including itself, and produces its own context row.",
            )}</p>
            <div className="self-attention-boundary-grid" role="group" aria-label={t("Attention과 Self-Attention 정보원 비교", "Attention and Self-Attention source comparison")}>
              <article><span>CROSS-ATTENTION</span><strong>Q<sub>decoder</sub> · K/V<sub>source</sub></strong><p>{t("서로 다른 두 정보원", "two different sources")}</p></article>
              <article><span>SELF-ATTENTION</span><strong>Q/K/V ← X<sub>tokens</sub></strong><p>{t("같은 X, 서로 다른 투영", "one X, distinct projections")}</p></article>
            </div>
            <div className="concept-callout self-attention-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t(
                  "내적·transpose·matrix shape, 안정적 row Softmax, ordered embedding rows, causal prefix, 그리고 직전 장의 Q/K/V·QKᵀ·αV 계약을 그대로 사용합니다.",
                  "Reuse dot products, transpose and matrix shapes, stable row softmax, ordered embedding rows, causal prefixes, and the prior chapter's Q/K/V, QK transpose, and alpha V contracts.",
                )}</p>
                {preview ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a> : <span>{t("이전: Attention", "Previous: Attention")}</span>}
              </div>
            </div>
          </section>

          <section className="article-section" id="projections">
            <div className="margin-label">02 — ONE X, THREE LEARNED ROLES</div>
            <h2>{t("같은 입력을 세 번 복사하지 않고 세 역할로 투영합니다", "Project one input into three roles instead of copying it three times")}</h2>
            <p>{t(
              "Q·K·V는 같은 X에서 시작하지만 일반적으로 같지 않습니다. 고정된 투영 행렬은 실제 모델에서 학습되는 parameter를 투명한 fixture로 보여 줍니다. 이 장에서는 투영값을 학습하지 않고, 만들어진 역할과 shape를 검사합니다.",
              "Q, K, and V start from the same X but are generally not equal. Fixed projection matrices make normally learned parameters inspectable in this fixture. This chapter does not train them; it inspects their roles and shapes.",
            )}</p>
            <div className="self-attention-formula-stack">
              <MathFormula latex={String.raw`Q=XW_Q,\qquad K=XW_K,\qquad V=XW_V`} display />
              <MathFormula latex={String.raw`X\in\mathbb{R}^{T\times d_{model}},\quad Q,K,V\in\mathbb{R}^{T\times d_{model}}`} display />
              <MathFormula latex={String.raw`Q\rightarrow[H,T,d_h],\qquad d_h=d_{model}/H`} display />
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div><strong>{t("Q=K=V=X가 기본 계약은 아닙니다", "Q=K=V=X is not the general contract")}</strong><p>{t("같은 row가 질문·주소·내용 역할에서 다른 숫자가 될 수 있습니다. 특정 head가 반드시 문법이나 의미를 담당한다는 보장도 없습니다.", "The same row may carry different numbers as question, address, and content. A particular head is not guaranteed to represent syntax or semantics.")}</p></div>
            </div>
          </section>

          <section className="article-section" id="scaling">
            <div className="margin-label">03 — SCALED DOT-PRODUCT</div>
            <h2>{t("head 폭이 커질수록 내적이 Softmax를 너무 빨리 포화시키지 않게 합니다", "Keep wider-head dot products from saturating softmax too quickly")}</h2>
            <p>{t(
              "독립 성분의 내적 크기는 d_h가 커질수록 커지기 쉽습니다. √d_h로 나누면 key 순서를 바꾸려는 것이 아니라 분포가 지나치게 뾰족해지는 정도를 완화합니다. 분모는 sequence 길이 T나 전체 d_model이 아닙니다.",
              "Dot products of independent components tend to grow with d_h. Dividing by sqrt(d_h) is meant to temper an overly sharp distribution, not change key ordering. The denominator is neither sequence length T nor the full d_model.",
            )}</p>
            <div className="self-attention-formula-stack">
              <MathFormula latex={String.raw`S^{(h)}=\frac{Q^{(h)}K^{(h)\mathsf T}}{\sqrt{d_h}}\in\mathbb{R}^{T\times T}`} display />
              <MathFormula latex={String.raw`A^{(h)}=\operatorname{softmax}_{key}(S^{(h)})`} display />
            </div>
          </section>

          <section className="article-section" id="mask">
            <div className="margin-label">04 — MASK BEFORE SOFTMAX</div>
            <h2>{t("생성 시점 i가 아직 오지 않은 j&gt;i를 읽지 못하게 합니다", "Prevent generation step i from reading a future j greater than i")}</h2>
            <p>{t(
              "causal mask는 미래 logit을 Softmax 전에 차단합니다. 허용된 key끼리 다시 정규화하므로 active query row의 합은 1이고, padding key도 같은 방식으로 제외할 수 있습니다. Softmax 뒤에서 weight를 0으로만 바꾸면 row 합이 깨집니다.",
              "A causal mask blocks future logits before softmax. Allowed keys are then renormalized so every active query row sums to one; padding keys can be excluded by the same mechanism. Merely zeroing weights after softmax breaks row mass.",
            )}</p>
            <div className="self-attention-mask-table-wrap">
              <table className="self-attention-mask-table">
                <caption>{t("4-token causal visibility · 행=query, 열=key", "Four-token causal visibility · rows are queries, columns are keys")}</caption>
                <thead><tr><th scope="col">q\k</th>{[0, 1, 2, 3].map((index) => <th scope="col" key={index}>k{index}</th>)}</tr></thead>
                <tbody>{maskCells.map((row, queryIndex) => <tr key={queryIndex}><th scope="row">q{queryIndex}</th>{row.map((allowed, keyIndex) => <td className={allowed ? "is-allowed" : "is-blocked"} aria-label={allowed ? t(`query ${queryIndex}에서 key ${keyIndex} 허용`, `key ${keyIndex} allowed for query ${queryIndex}`) : t(`query ${queryIndex}에서 미래 key ${keyIndex} 차단`, `future key ${keyIndex} blocked for query ${queryIndex}`)} key={keyIndex}>{allowed ? t("허용", "allow") : t("차단", "blocked")}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <p className="self-attention-precision-note">{t("mask는 visibility 규칙입니다. token 순서 자체를 vector에 새겨 넣는 positional representation은 다음 장의 별도 계약입니다.", "A mask is a visibility rule. Positional representation, which puts order information into token vectors, remains a separate contract for the next chapter.")}</p>
          </section>

          <section className="article-section" id="heads">
            <div className="margin-label">05 — SPLIT · RUN · CONCAT</div>
            <h2>{t("각 head는 작은 feature 공간에서 독립적으로 읽고 token row에 맞춰 합칩니다", "Each head reads in a smaller feature space, then rejoins by token row")}</h2>
            <div className="self-attention-shape-ladder" role="group" aria-label={t("Multi-head Self-Attention shape 흐름", "Multi-head Self-Attention shape flow")}>
              <article><span>PROJECT</span><strong>[T,d_model]</strong><p>Q · K · V</p></article><span aria-hidden="true">→</span>
              <article><span>SPLIT</span><strong>[H,T,d_h]</strong><p>d_model=H·d_h</p></article><span aria-hidden="true">→</span>
              <article><span>ATTEND</span><strong>[H,T,T]</strong><p>{t("head별 weights", "weights per head")}</p></article><span aria-hidden="true">→</span>
              <article><span>CONCAT</span><strong>[T,H·d_h]</strong><p>[T,d_model]</p></article>
            </div>
            <p>{t(
              "head output을 평균내거나 token 축으로 이어 붙이지 않습니다. 같은 token의 head feature를 정해진 순서로 concat하고 output projection을 거쳐 [T,d_model]을 유지합니다. 이 shape가 다음 장의 residual-compatible handoff를 가능하게 하지만 residual addition 자체는 아직 실행하지 않습니다.",
              "Do not average head outputs or concatenate along the token axis. Concatenate each token's head features in a fixed order and apply the output projection to preserve [T,d_model]. That shape enables a residual-compatible handoff next chapter, but no residual addition runs here.",
            )}</p>
          </section>

          <section className="article-section" id="worked-trace">
            <div className="margin-label">06 — FIXED NUMERIC TRACE</div>
            <h2>{t("sat query 한 행을 score에서 concat까지 끝까지 추적합니다", "Trace one sat query row from scores through concatenation")}</h2>
            <p>{t(
              "필수 lab과 같은 the · cat · sat · <pad> fixture에서 zero-based head 1, 즉 두 번째 head의 sat query를 고정합니다. 한 행을 끝까지 계산하면 scaling과 mask가 어디에 놓이고, weight가 어떤 V row를 섞으며, 두 head가 어느 축으로 합쳐지는지 숫자로 연결됩니다.",
              "Use the same the · cat · sat · <pad> fixture as the required lab and fix the sat query in zero-based head 1, the second head. Following one row end to end connects the placement of scaling and masking to the V rows mixed by the weights and the feature axis used to rejoin both heads.",
            )}</p>
            <div className="self-attention-worked-trace" role="group" aria-label={t("sat query Self-Attention 수치 추적", "Numeric self-attention trace for the sat query")}>
              <article>
                <span>QUERY · HEAD 1</span>
                <strong><code>tokens = [the, cat, sat, &lt;pad&gt;]</code></strong>
                <p>{t("head 1의 sat query는 [0,1]이고 네 key와의 raw dot product는 다음과 같습니다.", "The sat query in head 1 is [0,1], producing these raw dot products with the four keys.")}</p>
                <code>raw = [2, 1, 0, 1]</code>
              </article>
              <article>
                <span>SCALE · MASK</span>
                <strong><code>raw / √2 = [1.414214, 0.707107, 0, 0.707107]</code></strong>
                <p>{t("sat는 index 2이므로 causal rule과 padding-key rule을 적용한 뒤 마지막 key logit은 -∞(-inf)가 됩니다.", "Because sat is index 2, the final key logit becomes -∞ (-inf) after applying the causal and padding-key rules.")}</p>
                <code>masked = [1.414214, 0.707107, 0, -inf]</code>
              </article>
              <article>
                <span>ROW SOFTMAX · CONTEXT</span>
                <strong><code>weights = [0.575975, 0.283995, 0.140029, 0]</code></strong>
                <p>{t("허용된 세 key만 다시 합 1로 정규화하고 head 1의 V row를 가중합합니다.", "Renormalize only the three allowed keys to unit mass, then take the weighted sum of head 1's V rows.")}</p>
                <code>context₁ = [0.716005, 0.424025]</code>
              </article>
              <article>
                <span>CONCAT · FEATURE AXIS</span>
                <strong><code>context₀ = [0.744765, 0.503490]</code></strong>
                <p>{t("같은 sat token의 head 0 뒤에 head 1 feature를 이어 붙입니다. token 축 길이 T는 바뀌지 않습니다.", "Append head 1 features after head 0 for the same sat token. The token-axis length T does not change.")}</p>
                <code>concat = [0.744765, 0.503490, 0.716005, 0.424025]</code>
              </article>
            </div>
            <div className="concept-callout self-attention-mask-boundaries">
              <span className="callout-mark">3×</span>
              <div>
                <strong>{t("causal key, padding key, inactive padding query는 서로 다른 세 조건입니다", "Causal keys, padding keys, and inactive padding queries are three distinct conditions")}</strong>
                <p>{t(
                  "causal mask는 active query i가 j>i인 미래 key를 못 보게 합니다. padding key mask는 query 위치와 무관하게 <pad> 열을 모든 active query에서 제외합니다. 반면 query-active mask는 <pad>가 query인 마지막 행 전체를 0으로 만들 뿐이며, 앞선 active query의 Softmax 분모에 padding query를 추가하거나 빼는 규칙이 아닙니다.",
                  "The causal mask prevents active query i from seeing future keys j>i. The padding-key mask removes the <pad> column from every active query regardless of query position. The query-active mask instead zeros the entire final row whose query is <pad>; it is not a rule that adds or removes a padding query from an earlier active query's softmax denominator.",
                )}</p>
              </div>
            </div>
          </section>

          <div id="self-attention-lab"><SelfAttentionLab onCompletionChange={setLabComplete} /></div>

          <section className="article-section self-attention-python-bridge" id="numpy-bridge">
            <div className="margin-label">07 — NUMPY BRIDGE · OPTIONAL</div>
            <h2>{t("고정 trace와 mask repair를 실제 NumPy로 다시 실행합니다", "Re-execute the fixed trace and mask repair in real NumPy")}</h2>
            <p>{t(
              "첫 셀은 X에서 Q/K/V를 투영하고 feature를 두 head로 나눈 뒤 scaled causal Attention과 concat을 한 번에 재현합니다. 둘째 셀은 전체 key에 Softmax를 적용한 다음 차단 weight만 0으로 만드는 버그에서 시작합니다. 차단된 mass를 제거해도 남은 허용 weight가 자동으로 재정규화되지는 않으므로 mask를 Softmax 앞으로 옮겨야 합니다.",
              "The first cell projects Q, K, and V from X, splits features into two heads, then reproduces scaled causal attention and concatenation. The second starts with the bug of applying softmax over every key and only then zeroing blocked weights. Removing blocked mass does not automatically renormalize the allowed weights, so the mask must move before softmax.",
            )}</p>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 심화이며 챕터 완료 조건이 아닙니다", "Optional extension; never a chapter-completion gate")}</strong>
                <p>{t(
                  "실행 버튼을 누를 때만 공유 Pyodide와 NumPy를 지연 로드합니다. 다운로드가 실패해도 필수 lab·debugger·이해 확인에는 영향이 없습니다. 두 셀은 영어로 된 완전한 fixture를 각각 다시 만들며 서로의 실행 상태에 의존하지 않습니다.",
                  "The shared Pyodide runtime and NumPy load lazily only after you run a cell. A download failure does not affect the required lab, debugger, or concept check. Both English-only cells rebuild a complete fixture and do not depend on each other's execution state.",
                )}</p>
              </div>
            </div>
            <NotebookCell
              title={t("Q/K/V 투영부터 two-head concat까지 실행", "Run Q/K/V projections through two-head concat")}
              initialCode={selfAttentionForwardTraceCode}
              supportCode={selfAttentionForwardTraceSupportCode}
              description={<p>{t("[4,4] 입력을 Q/K/V로 투영하고 [2,4,2] head로 나눕니다. sat의 head 1 raw score [2,1,0,1], mask 후 weight, context와 [4] concat이 위 worked trace와 같은지 확인하세요.", "Project the [4,4] input into Q/K/V and split it into [2,4,2] heads. Verify that sat's head 1 raw scores [2,1,0,1], masked weights, context, and [4] concatenation match the worked trace above.")}</p>}
              hint={<p>{t("key_visible의 마지막 값을 True로 바꿔 padding key가 active row의 분모와 context를 어떻게 바꾸는지 관찰한 뒤 셀을 초기화하세요.", "Change the final key_visible value to True, observe how a padding key changes active-row denominators and contexts, then reset the cell.")}</p>}
              editorMinHeight={850}
              ariaLabel={t("Self-Attention projection과 concat NumPy 코드", "NumPy code for self-attention projections and concatenation")}
            />
            <NotebookCell
              title={t("Softmax 뒤 mask 버그 수리", "Repair the mask-after-softmax bug")}
              initialCode={selfAttentionMaskRepairCode}
              supportCode={selfAttentionMaskRepairSupportCode}
              description={<p>{t("기본 실행은 active row 합 [0.097785,0.330238,0.778819]를 출력한 뒤 assertion에 실패합니다. REPAIR의 boolean 한 줄을 True로 바꿔 합 [1,1,1], future mass 0, padding-key mass 0, inactive-query mass 0을 동시에 복구하세요.", "The default run prints active row sums [0.097785,0.330238,0.778819] and then fails its assertion. Change the one REPAIR boolean to True to restore sums [1,1,1], zero future mass, zero padding-key mass, and zero inactive-query mass together.")}</p>}
              hint={<p>{t("0으로 지우는 위치가 아니라 정규화 순서를 고칩니다. mask_before_softmax = True 한 줄이면 masked_row_softmax가 허용 key만 분모에 넣습니다.", "Repair normalization order, not the location of a zero assignment. One line, mask_before_softmax = True, makes masked_row_softmax include only allowed keys in its denominator.")}</p>}
              editorMinHeight={730}
              ariaLabel={t("Self-Attention mask-before-softmax 수리 NumPy 코드", "NumPy code for repairing self-attention mask-before-softmax")}
            />
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">08 — OPTIONAL REMEDIATION · REPAIR CONSOLE</div>
            <h2>{t("projection·scaling·mask·head merge를 실행 결과로 수리합니다", "Repair projections, scaling, masks, and head merging from executed results")}</h2>
            <p>{t(
              "네 사건은 후보 연산을 고정 fixture에 실제 적용합니다. Q/K/V shape, scaled score, 미래·padding mass, query row 합, merged output shape를 다시 계산해 계약이 복구됐는지 판정합니다.",
              "Each of four incidents executes candidate operations against the fixed fixture. It recomputes Q/K/V shapes, scaled scores, future and padding mass, query-row sums, and merged-output shape to judge whether the contract is restored.",
            )}</p>
            <SelfAttentionDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="practice">
            <div className="margin-label">09 — OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE</div>
            <SelfAttentionPracticeDeck />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">10 — TRANSFER TO A TRANSFORMER BLOCK</div>
            <h2>{t("[T,d_model] 출력은 완성된 Transformer block이 아니라 다음 조립 지점입니다", "A [T,d_model] output is the next assembly point, not a complete Transformer block")}</h2>
            <div className="self-attention-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t(
                "positional signal과 causal mask가 없는 non-causal Self-Attention에서 token row 순서만 바꾼 두 입력을 생각하세요. Q/K/V와 출력 row가 같은 순열로 이동하는 이유를 설명하고, 다음 장에서 position을 추가하면서도 residual을 위해 [T,d_model] shape를 유지해야 하는 이유를 적으세요.",
                "Consider two inputs that differ only by token-row order in non-causal Self-Attention with no positional signal. Explain why Q/K/V and output rows move by the same permutation, then state why the next chapter must add position while preserving [T,d_model] for a residual path.",
              )}</p>
            </div>
            <div className="concept-callout misconception-callout"><span className="callout-mark">!</span><div><strong>{t("heatmap은 계산 trace이지 보장된 언어 설명이 아닙니다", "A heatmap is a computation trace, not a guaranteed linguistic explanation")}</strong><p>{t("head별 weight를 관찰할 수는 있지만 특정 head의 역할·정답성·충실한 설명을 자동으로 보장하지 않습니다.", "You can inspect per-head weights, but they do not automatically guarantee a head's role, correctness, or faithfulness as an explanation.")}</p></div></div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">11 — CONCEPT CHECK</div>
            <SelfAttentionConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="self-attention-completion-checklist" role="status" aria-live="polite">
              <span className={labComplete ? "is-complete" : undefined}>{labComplete ? "✓" : "○"} {t("핵심 challenge 3개", "Three core challenges")}</span>
              <span className={`is-optional${debuggerComplete ? " is-complete" : ""}`}>{debuggerComplete ? "✓" : t("선택", "Optional")} {t("causal multi-head 복구", "Causal multi-head repairs")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter curriculumSlug={TRANSFORMER_CURRICULUM_SLUG} slug="self-attention" canComplete={canComplete} lockedMessage={t("핵심 challenge 세 개와 다섯 개념 확인을 완료하세요. 나머지 challenge와 debugger는 선택입니다.", "Complete the three core challenges and all five concept checks. The remaining challenges and debugger are optional.")} />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={previousPreviewHref}>← {t("이전: Attention", "Previous: Attention")}</a> : <span>← {t("이전: Attention", "Previous: Attention")}</span>}
            {preview
              ? <a href={nextPreviewHref}>{t("다음: Transformer 블록", "Next: The Transformer Block")} →</a>
              : <span>{t("다음: Transformer 블록", "Next: The Transformer Block")}</span>}
          </nav>
          <noscript>{t("Self-Attention 활동에는 JavaScript가 필요합니다. 위 설명과 수식은 계속 읽을 수 있습니다.", "The Self-Attention activities require JavaScript. The explanation and formulas above remain readable.")}</noscript>
        </article>
      </div>
    </main>
  );
}
