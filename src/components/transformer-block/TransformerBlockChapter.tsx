import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  transformerBlockResidualRepairCode,
  transformerBlockStageLedgerCode,
  transformerBlockStageLedgerSupportCode,
} from "../../data/transformerBlockNotebook";
import { canCompleteTransformerBlockChapter } from "../../features/transformer-block/transformer-block-model";
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
import { TransformerBlockConceptCheck } from "./TransformerBlockConceptCheck";
import { TransformerBlockDebuggerLab } from "./TransformerBlockDebuggerLab";
import { TransformerBlockLab } from "./TransformerBlockLab";

const tocItems = {
  ko: [
    { id: "boundary", label: "Self-Attention에서 블록으로" },
    { id: "position", label: "위치 신호를 한 번 더하기" },
    { id: "prenorm", label: "Pre-norm 두 sublayer" },
    { id: "residual", label: "Residual 경로" },
    { id: "layernorm", label: "Token별 LayerNorm" },
    { id: "ffn", label: "Position-wise FFN" },
    { id: "transformer-block-lab", label: "핵심 3 challenge lab" },
    { id: "numpy-bridge", label: "NumPy 블록 원장" },
    { id: "debug", label: "선택 · 블록 계약 디버깅" },
    { id: "transfer", label: "Mini Transformer로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "boundary", label: "From Self-Attention to a block" },
    { id: "position", label: "Add position once" },
    { id: "prenorm", label: "Two pre-norm sublayers" },
    { id: "residual", label: "Residual paths" },
    { id: "layernorm", label: "LayerNorm per token" },
    { id: "ffn", label: "Position-wise FFN" },
    { id: "transformer-block-lab", label: "Three-core-challenge lab" },
    { id: "numpy-bridge", label: "NumPy block ledger" },
    { id: "debug", label: "Optional · Debug block contracts" },
    { id: "transfer", label: "Transfer to the Mini Transformer" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function TransformerBlockChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "transformer-block");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labComplete, setLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteTransformerBlockChapter({ labComplete, debuggerComplete, conceptsMastered });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/self-attention${isKo ? "" : "?lang=en"}`;
  const nextPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/mini-transformer${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell transformer-block-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}>
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span>
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
          <header className="lesson-hero transformer-block-lesson-hero">
            <p className="eyebrow">EMBEDDING + POSITION → LN → MHA → ADD → LN → FFN → ADD · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">09</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">{t(
              "직전 장의 causal multi-head routing을 완성된 decoder block으로 조립합니다. 이 장은 한 가지 명시적인 pre-LayerNorm 구조를 사용해 위치·정규화 branch·skip path·row-wise FFN을 숫자와 shape로 끝까지 추적합니다.",
              "Assemble the prior chapter's causal multi-head routing into a complete decoder block. This chapter uses one explicit pre-LayerNorm architecture and traces position, normalized branches, skip paths, and the row-wise FFN through numbers and shapes.",
            )}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("token embedding에 absolute sinusoidal position을 한 번 더해 같은 token의 순서를 구분할 수 있다.", "Add an absolute sinusoidal position once to token embeddings so identical tokens can be distinguished by order.")}</li>
                <li>{t("x₁=x₀+MHA(LN(x₀))와 y=x₁+FFN(LN(x₁))의 pre-norm branch와 residual 기준을 추적할 수 있다.", "Trace the normalized branch and residual base in x1=x0+MHA(LN(x0)) and y=x1+FFN(LN(x1)).")}</li>
                <li>{t("LayerNorm이 각 token의 feature축에서 mean·variance를 계산함을 수치로 검증할 수 있다.", "Verify numerically that LayerNorm computes mean and variance over each token's feature axis.")}</li>
                <li>{t("공유된 d_model→d_ff→d_model ReLU FFN을 token row마다 독립 실행하고 token mixing과 구분할 수 있다.", "Run a shared d_model-to-d_ff-to-d_model ReLU FFN independently per token row and distinguish it from token mixing.")}</li>
                <li>{t("두 residual 뒤에도 [T,d_model]을 보존해 다음 block 또는 LM head 이전 단계로 인계할 수 있다.", "Preserve [T,d_model] through both residuals for the next block or the stage before the language-model head.")}</li>
              </ul>
            </div>
          </header>

          <TransformerLearningGuide chapterSlug="transformer-block" />

          <section className="article-section" id="boundary">
            <div className="margin-label">01 — ASSEMBLY BOUNDARY</div>
            <h2>{t("Attention은 token 사이를 읽고, 블록은 그 결과를 학습 가능한 state로 이어 줍니다", "Attention reads across tokens; the block carries that result into a learnable state")}</h2>
            <p>{t(
              "Self-Attention은 [T,d_model] routing 출력을 만들었습니다. 블록은 같은 shape의 skip path를 두 번 보존하면서 정규화된 branch에 Attention과 FFN을 적용합니다. 마지막 장은 tokenizer, 한 block의 실행 가능한 전체 경로, final norm, vocabulary projection, loss와 head update를 연결하고 multi-block 확장은 전이 과제로 다룹니다.",
              "Self-attention produced a [T,d_model] routing output. A block preserves a same-shaped skip path twice while applying attention and the FFN to normalized branches. The final chapter connects tokenization, an executable one-block model path, final normalization, vocabulary projection, loss, and a head update, then treats multi-block scaling as a transfer task.",
            )}</p>
            <div className="transformer-block-boundary-grid" role="group" aria-label={t("Self-Attention과 Transformer block 경계", "Boundary between self-attention and a Transformer block")}>
              <article><span>SELF-ATTENTION</span><strong>token routing</strong><p>Q/K/V · mask · heads</p></article>
              <article><span>TRANSFORMER BLOCK</span><strong>state update</strong><p>position · LN · residual · FFN</p></article>
              <article><span>MINI TRANSFORMER</span><strong>model path</strong><p>one block · logits · loss</p></article>
            </div>
            <figure className="chapter-shape-ledger">
              <figcaption>{t("BLOCK SHAPE LEDGER · 실행 전에 각 stage의 입출력과 보존 조건을 읽으세요", "BLOCK SHAPE LEDGER · Read each stage's input, output, and preserved contract before running")}</figcaption>
              <div className="chapter-shape-ledger-scroll">
                <table>
                  <thead><tr><th scope="col">STAGE</th><th scope="col">INPUT</th><th scope="col">OUTPUT</th><th scope="col">INVARIANT</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">E + P</th><td>E, P · [T,d]</td><td>x₀ · [T,d]</td><td>{t("position을 한 번 더함", "add position once")}</td></tr>
                    <tr><th scope="row">LN → MHA</th><td>x₀ · [T,d]</td><td>A · [T,d]</td><td>{t("token 수와 폭 보존", "preserve tokens and width")}</td></tr>
                    <tr><th scope="row">ADD 1</th><td>x₀ + A</td><td>x₁ · [T,d]</td><td>{t("같은 좌표끼리 덧셈", "element-wise addition")}</td></tr>
                    <tr><th scope="row">LN → FFN → ADD 2</th><td>x₁ · [T,d]</td><td>y · [T,d]</td><td>{t("row별 FFN, 다음 block으로 handoff", "row-wise FFN, hand off to next block")}</td></tr>
                  </tbody>
                </table>
              </div>
            </figure>
            <div className="concept-callout transformer-block-prerequisite"><span className="callout-mark">↩</span><div>
              <strong>{t("선행 개념", "Prerequisites")}</strong>
              <p>{t("[T,d_model] embedding row, causal multi-head output, element-wise 덧셈, 평균·분산, 두 선형층과 ReLU를 사용합니다.", "Reuse [T,d_model] embedding rows, causal multi-head output, element-wise addition, mean and variance, two linear layers, and ReLU.")}</p>
              {preview ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a> : <span>{t("이전: Self-Attention", "Previous: Self-Attention")}</span>}
            </div></div>
          </section>

          <section className="article-section" id="position">
            <div className="margin-label">02 — POSITION ONCE AT INPUT</div>
            <h2>{t("이 fixture에서는 첫 블록 전에 absolute sinusoidal position을 더합니다", "This fixture adds absolute sinusoidal position before the first block")}</h2>
            <p>{t(
              "causal mask는 미래를 볼 수 없게 하지만 token의 절대 위치 vector를 만들지는 않습니다. 이 장은 계산이 투명한 sinusoidal P를 embedding E와 같은 shape로 한 번 더해 x₀를 만듭니다. 실제 모델은 learned position, RoPE 또는 relative bias 같은 다른 방식을 사용할 수 있습니다.",
              "A causal mask hides the future but does not create an absolute position vector. This chapter adds a transparent sinusoidal P once to same-shaped embeddings E to form x0. Real models may instead use learned positions, RoPE, or relative bias.",
            )}</p>
            <div className="transformer-block-formula-stack">
              <MathFormula latex={String.raw`x_0=E+P,\qquad E,P,x_0\in\mathbb{R}^{T\times d_{model}}`} display />
              <MathFormula latex={String.raw`P_{t,2i}=\sin(t/10000^{2i/d}),\quad P_{t,2i+1}=\cos(t/10000^{2i/d})`} display />
            </div>
          </section>

          <section className="article-section" id="prenorm">
            <div className="margin-label">03 — ONE EXPLICIT PRE-NORM VARIANT</div>
            <h2>{t("정규화된 branch를 실행하고 원래 state를 skip path로 더합니다", "Run a normalized branch and add the original state through the skip path")}</h2>
            <div className="transformer-block-flow" role="group" aria-label={t("Pre-norm Transformer block 계산 순서", "Pre-norm Transformer block computation order")}>
              <article><span>INPUT</span><strong>x₀=E+P</strong><p>[T,d]</p></article><span aria-hidden="true">→</span>
              <article><span>ATTENTION BRANCH</span><strong>MHA(LN(x₀))</strong><p>causal</p></article><span aria-hidden="true">→</span>
              <article><span>ADD 1</span><strong>x₁=x₀+A</strong><p>[T,d]</p></article><span aria-hidden="true">→</span>
              <article><span>FFN BRANCH</span><strong>FFN(LN(x₁))</strong><p>row-wise</p></article><span aria-hidden="true">→</span>
              <article><span>ADD 2</span><strong>y=x₁+F</strong><p>[T,d]</p></article>
            </div>
            <p className="transformer-block-precision-note">{t("Pre-norm과 post-norm은 모두 존재합니다. 이 장의 수치·문제·디버거는 위 순서 하나만 판정하므로 서로 다른 설계를 섞지 않습니다.", "Both pre-norm and post-norm exist. This chapter's numbers, questions, and debugger grade only the order above so the variants are not mixed.")}</p>
          </section>

          <section className="article-section" id="residual">
            <div className="margin-label">04 — TWO ELEMENT-WISE SKIP PATHS</div>
            <h2>{t("Residual은 concat이나 평균이 아니라 같은 좌표끼리 더하는 우회로입니다", "A residual is an element-wise bypass, not concatenation or averaging")}</h2>
            <p>{t(
              "Attention branch가 0이어도 x₁=x₀이고, FFN branch가 0이어도 y=x₁입니다. 이 identity path가 깊은 stack에서 state와 gradient가 이동할 직접 경로를 제공합니다. 덧셈하려면 양쪽이 정확히 [T,d_model]이어야 합니다.",
              "If the attention branch is zero, x1 equals x0; if the FFN branch is zero, y equals x1. This identity path gives state and gradients a direct route through a deep stack. Both sides must be exactly [T,d_model] for addition.",
            )}</p>
            <MathFormula latex={String.raw`\operatorname{shape}(x)=\operatorname{shape}(f(x))=[T,d_{model}]\Rightarrow x+f(x)`} display />
          </section>

          <section className="article-section" id="layernorm">
            <div className="margin-label">05 — FEATURE AXIS, TOKEN BY TOKEN</div>
            <h2>{t("LayerNorm은 token을 서로 섞지 않고 각 row의 feature 통계를 사용합니다", "LayerNorm uses each row's feature statistics without mixing tokens")}</h2>
            <p>{t(
              "각 token row t에서 d_model개 feature의 평균 μₜ와 분산 σ²ₜ를 구합니다. fixture는 γ=1, β=0이라 정규화 row의 평균이 약 0, 분산이 약 1입니다. 실제 γ와 β는 학습되므로 최종 출력 통계가 반드시 0과 1일 필요는 없습니다.",
              "For each token row t, compute mean mu_t and variance sigma squared_t over d_model features. The fixture uses gamma=1 and beta=0, so normalized rows have mean near zero and variance near one. Learned gamma and beta in a real model need not preserve those final statistics.",
            )}</p>
            <p>{t("norm1과 norm2는 서로 다른 LayerNorm module입니다. fixture는 두 parameter set을 각각 보관하되 계산을 투명하게 하려고 둘 다 같은 identity 값으로 초기화합니다.", "Norm1 and norm2 are distinct LayerNorm modules. The fixture stores two separate parameter sets, initialized to the same identity values only to keep the arithmetic transparent.")}</p>
            <div className="transformer-block-formula-stack">
              <MathFormula latex={String.raw`\mu_t=\frac1d\sum_j x_{t,j},\qquad \sigma_t^2=\frac1d\sum_j(x_{t,j}-\mu_t)^2`} display />
              <MathFormula latex={String.raw`\operatorname{LN}(x_t)=\gamma\odot\frac{x_t-\mu_t}{\sqrt{\sigma_t^2+\epsilon}}+\beta`} display />
            </div>
          </section>

          <section className="article-section" id="ffn">
            <div className="margin-label">06 — SHARED MLP, INDEPENDENT ROWS</div>
            <h2>{t("Attention이 token을 섞은 뒤 FFN은 각 token의 feature를 비선형 변환합니다", "After attention mixes tokens, the FFN transforms each token's features nonlinearly")}</h2>
            <p>{t(
              "같은 W₁,b₁,W₂,b₂를 모든 token row에 공유하지만 row끼리 곱하지 않습니다. 이 fixture는 작은 d_ff=6과 ReLU를 사용해 활성/비활성 hidden unit을 직접 보입니다. GELU·SiLU를 쓰는 모델도 있지만 여기서는 실행과 설명을 ReLU로 고정합니다.",
              "The same W1, b1, W2, and b2 are shared across token rows, but rows are never multiplied together. This fixture uses a small d_ff=6 and ReLU so active and inactive hidden units are directly visible. Some models use GELU or SiLU; execution and explanation here stay fixed to ReLU.",
            )}</p>
            <MathFormula latex={String.raw`\operatorname{FFN}(z_t)=\operatorname{ReLU}(z_tW_1+b_1)W_2+b_2`} display />
          </section>

          <div id="transformer-block-lab"><TransformerBlockLab onCompletionChange={setLabComplete} /></div>

          <section className="article-section transformer-block-python-bridge" id="numpy-bridge">
            <div className="margin-label">08 — NUMPY BLOCK LEDGER · OPTIONAL</div>
            <h2>{t("한 token을 E+P부터 두 번째 residual까지 숫자로 추적합니다", "Trace one token numerically from E+P through the second residual")}</h2>
            <p>{t(
              "첫 셀은 token 0의 E=[1,0,2,0]과 P=[0,1,0,1]에서 시작합니다. x₀=[1,1,2,1]의 feature 평균 1.25와 분산 0.1875를 직접 계산한 뒤, pre-norm attention branch와 row-wise ReLU FFN을 거쳐 y=[3.438475,0.113746,1.676509,0.039093]까지 같은 [4,4] shape로 이어지는 stage 원장을 검증합니다.",
              "The first cell starts token 0 at E=[1,0,2,0] and P=[0,1,0,1]. It computes feature mean 1.25 and variance 0.1875 for x0=[1,1,2,1], then verifies a stage ledger through the pre-norm attention branch and row-wise ReLU FFN to y=[3.438475,0.113746,1.676509,0.039093], always preserving shape [4,4].",
            )}</p>
            <p>{t(
              "이 고정 fixture는 이 장의 axis·순서·shape 계약을 증명하지만, 학습된 실제 모델의 품질이나 attention 의미를 증명하지는 않습니다. 둘째 셀은 그 경계를 더 좁혀 첫 residual에서 만든 x₁을 건너뛰고 x₀를 다시 더하는 버그를 실행 실패로 드러냅니다.",
              "This fixed fixture proves the chapter's axis, order, and shape contract; it does not prove the quality or semantics of a trained model. The second cell narrows the boundary further by exposing, as an executed failure, the bug of skipping x1 from the first residual and adding x0 again.",
            )}</p>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 실습이며 각 셀은 독립 실행됩니다", "Optional practice; each cell runs independently")}</strong>
                <p>{t(
                  "공유 Pyodide·NumPy 런타임은 첫 실행 때만 지연 로드됩니다. 다운로드 실패나 수리 미완료는 필수 블록 lab, 디버거, 이해 확인, 챕터 완료를 막지 않습니다.",
                  "The shared Pyodide and NumPy runtime loads lazily on first execution. A download failure or unfinished repair never blocks the required block lab, debugger, concept check, or chapter completion.",
                )}</p>
              </div>
            </div>
            <div className="notebook-stack">
              <NotebookCell
                title={t("Pre-norm 블록 stage 원장 검증", "Verify the pre-norm block stage ledger")}
                initialCode={transformerBlockStageLedgerCode}
                supportCode={transformerBlockStageLedgerSupportCode}
                description={<p>{t("실행 후 token0.LN(x0), token0.x1, token0.FFN, token0.y와 일곱 개 [4,4] stage shape를 손계산 표와 대조하세요.", "Run the cell, then compare token0.LN(x0), token0.x1, token0.FFN, token0.y, and all seven [4,4] stage shapes with the hand-worked ledger.")}</p>}
                hint={<p>{t("TRY 줄의 주석을 풀어 x₀[0,2]에 1을 더하면 mean·variance·정규화 좌표와 뒤 stage가 함께 어떻게 변하는지 관찰한 뒤 초기화하세요.", "Uncomment the TRY line to add one to x0[0,2], observe how the mean, variance, normalized coordinates, and downstream stages move together, then reset.")}</p>}
                editorMinHeight={640}
                ariaLabel={t("Transformer block stage 원장 NumPy 코드", "NumPy code for the Transformer block stage ledger")}
              />
              <NotebookCell
                title={t("두 번째 residual 기준 수리", "Repair the second residual base")}
                initialCode={transformerBlockResidualRepairCode}
                description={<p>{t("처음 실행하면 y=x₀+F 때문에 max_skip_error=1.732005와 함께 assertion이 실패합니다. REPAIR 아래 한 줄에서 x₀를 x₁으로 바꿔 첫 attention update가 최종 y에 보존되도록 하세요.", "The initial run fails with max_skip_error=1.732005 because y=x0+F. On the line below REPAIR, replace x0 with x1 so the first attention update is preserved in final y.")}</p>}
                hint={<p>{t("두 번째 skip source는 FFN 입력을 만들었던 state와 같습니다: norm2는 x₁을 읽고 residual도 x₁을 더합니다.", "The second skip source is the same state used to form the FFN input: norm2 reads x1, and the residual also adds x1.")}</p>}
                editorMinHeight={720}
                ariaLabel={t("Transformer block 두 번째 residual 수리 NumPy 코드", "NumPy code for repairing the Transformer block second residual")}
              />
            </div>
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">09 — OPTIONAL REMEDIATION · REPAIR CONSOLE</div>
            <h2>{t("position·axis·skip source·FFN 경계를 실행 결과로 수리합니다", "Repair position, axis, skip-source, and FFN boundaries from executed results")}</h2>
            <p>{t(
              "각 사건은 후보 조립을 같은 fixture에 적용하고 위치 차이, row 통계, residual identity, token 독립성, 최종 shape를 다시 계산합니다. option 이름이 아니라 결과 invariant가 맞아야 통과합니다.",
              "Each incident applies a candidate assembly to the same fixture and recomputes positional differences, row statistics, residual identity, token independence, and final shape. The resulting invariants—not an option label—must pass.",
            )}</p>
            <TransformerBlockDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">10 — TRANSFER TO A MINI TRANSFORMER</div>
            <h2>{t("한 block의 [T,d_model] state를 logits 경계로 넘기고 stack 확장을 설계합니다", "Hand one block's [T,d_model] state to the logits boundary and design stack scaling")}</h2>
            <div className="transformer-block-transfer-task"><strong>{t("전이 과제", "TRANSFER TASK")}</strong><p>{t(
              "두 번째 block을 쌓는다고 가정하세요. position P를 다시 더하지 않고 첫 block의 y를 다음 x로 넘긴 뒤, 어떤 두 LN→sublayer→ADD가 반복되는지 쓰세요. 마지막 token의 next-token logits를 만들려면 block 밖에서 어떤 final norm과 vocabulary projection이 더 필요한지도 구분하세요.",
              "Suppose you stack a second block. Pass the first block's y as the next x without adding P again, then state which two LN-to-sublayer-to-ADD paths repeat. Also separate the final normalization and vocabulary projection needed outside the block to create next-token logits.",
            )}</p></div>
          </section>

          <section className="article-section" id="check">
            <div className="margin-label">11 — CONCEPT CHECK</div>
            <TransformerBlockConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-completion-section">
            <div className="transformer-block-completion-checklist" role="status" aria-live="polite">
              <strong>{t("완료 조건", "COMPLETION GATE")}</strong>
              <span className={labComplete ? "is-complete" : undefined}>{labComplete ? "✓" : "○"} {t("핵심 challenge 3개", "Three core challenges")}</span>
              <span className={`is-optional${debuggerComplete ? " is-complete" : ""}`}>{debuggerComplete ? "✓" : "선택"} {t("별도 debugger 4사건", "Four separate debugger incidents")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter curriculumSlug={TRANSFORMER_CURRICULUM_SLUG} slug="transformer-block" canComplete={canComplete} lockedMessage={t("핵심 challenge 세 개와 다섯 개념 확인을 완료하세요. 나머지 challenge와 debugger는 선택입니다.", "Complete the three core challenges and all five concept checks. The remaining challenges and debugger are optional.")} />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={previousPreviewHref}>← {t("이전: Self-Attention", "Previous: Self-Attention")}</a> : <span>← {t("이전: Self-Attention", "Previous: Self-Attention")}</span>}
            {preview ? <a href={nextPreviewHref}>{t("다음: Mini Transformer", "Next: Mini Transformer")} →</a> : <span>{t("다음: Mini Transformer", "Next: Mini Transformer")}</span>}
          </nav>
          <noscript>{t("Transformer block 활동에는 JavaScript가 필요합니다. 위 설명과 수식은 계속 읽을 수 있습니다.", "The Transformer block activities require JavaScript. The explanation and formulas above remain readable.")}</noscript>
        </article>
      </div>
    </main>
  );
}
