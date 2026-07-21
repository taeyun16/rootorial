import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  miniTransformerGenerationRepairCode,
  miniTransformerLmHeadUpdateCode,
  miniTransformerLmHeadUpdateSupportCode,
} from "../../data/miniTransformerNotebook";
import { canCompleteMiniTransformerChapter } from "../../features/mini-transformer/mini-transformer-model";
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
import { MiniTransformerConceptCheck } from "./MiniTransformerConceptCheck";
import { MiniTransformerDebuggerLab } from "./MiniTransformerDebuggerLab";
import { MiniTransformerLab } from "./MiniTransformerLab";

const tocItems = {
  ko: [
    { id: "boundary", label: "블록에서 언어 모델로" },
    { id: "shift", label: "입력과 target shift" },
    { id: "forward", label: "ID에서 logits까지" },
    { id: "loss", label: "Softmax·loss·한 update" },
    { id: "decode", label: "Autoregressive decode" },
    { id: "mini-transformer-lab", label: "핵심 3 challenge lab" },
    { id: "numpy-bridge", label: "NumPy로 경계 검증" },
    { id: "debug", label: "선택 · 모델 경계 디버깅" },
    { id: "transfer", label: "실제 모델로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "boundary", label: "From a block to a language model" },
    { id: "shift", label: "Shift inputs and targets" },
    { id: "forward", label: "From IDs to logits" },
    { id: "loss", label: "Softmax, loss, one update" },
    { id: "decode", label: "Autoregressive decoding" },
    { id: "mini-transformer-lab", label: "Three-core-challenge lab" },
    { id: "numpy-bridge", label: "Verify boundaries in NumPy" },
    { id: "debug", label: "Optional · Debug model boundaries" },
    { id: "transfer", label: "Transfer to real models" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function MiniTransformerChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "mini-transformer");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labComplete, setLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteMiniTransformerChapter({ labComplete, debuggerComplete, conceptsMastered });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/transformer-block${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell mini-transformer-chapter-shell">
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
          <header className="lesson-hero mini-transformer-lesson-hero">
            <p className="eyebrow">TOKENIZE → SHIFT → BLOCK → FINAL LN → LOGITS → LOSS / DECODE · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">10</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">{t(
              "앞의 아홉 장을 작은 decoder-only next-token 모델 하나로 닫습니다. 브라우저 안의 결정적 TypeScript fixture를 사용해 token ID부터 loss와 생성 loop까지 실제 숫자로 실행하며, 학습된 대형 모델이나 WebGPU backend가 있다고 가장하지 않습니다.",
              "Close the previous nine chapters by assembling one tiny decoder-only next-token model. A deterministic in-browser TypeScript fixture executes real numbers from token IDs through loss and the generation loop, without pretending that a trained large model or WebGPU backend exists.",
            )}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("BOS·EOS가 포함된 token ID와 한 칸 shifted next-token target을 만들 수 있다.", "Create token IDs with BOS and EOS and one-step-shifted next-token targets.")}</li>
                <li>{t("embedding+position을 한 번 만든 뒤 causal pre-LayerNorm block을 통과해 [T,d_model]을 추적할 수 있다.", "Trace embedding plus position through one causal pre-LayerNorm block while preserving [T,d_model].")}</li>
                <li>{t("final LayerNorm과 vocabulary projection으로 [T,V] logits를 만들고 row별 stable Softmax·cross entropy를 계산할 수 있다.", "Create [T,V] logits with final LayerNorm and a vocabulary projection, then compute row-wise stable softmax and cross entropy.")}</li>
                <li>{t("hidden state를 고정한 한 번의 LM-head gradient update가 같은 batch loss를 낮추는지 검증할 수 있다.", "Verify whether one LM-head gradient update lowers same-batch loss while hidden states stay fixed.")}</li>
                <li>{t("마지막 row의 next token을 append하고 prefix를 다시 실행해 EOS 또는 maxNewTokens에서 멈출 수 있다.", "Append the last row's next token, rerun the prefix, and stop at EOS or maxNewTokens.")}</li>
              </ul>
            </div>
          </header>

          <TransformerLearningGuide chapterSlug="mini-transformer" />

          <section className="article-section" id="boundary">
            <div className="margin-label">01 — CAPSTONE BOUNDARY</div>
            <h2>{t("Transformer block은 hidden state를 만들고, language-model head가 다음 token 문제로 바꿉니다", "The Transformer block creates hidden state; the language-model head turns it into a next-token problem")}</h2>
            <p>{t(
              "직전 장의 block output은 vocabulary 확률이 아니라 [T,d_model] state였습니다. 이 장은 deterministic tokenizer, 하나의 block, final LayerNorm, LM head와 decoding controller를 명시적으로 연결합니다. 한 block과 작은 vocabulary를 쓰는 이유는 각 경계의 shape와 숫자를 화면에 전부 보이기 위해서입니다.",
              "The previous chapter's block output was a [T,d_model] state, not a vocabulary probability. This chapter explicitly connects a deterministic tokenizer, one block, final LayerNorm, an LM head, and a decoding controller. One block and a tiny vocabulary keep every boundary's shape and numbers visible.",
            )}</p>
            <div className="mini-transformer-boundary-grid" role="group" aria-label={t("Mini Transformer 전체 경계", "Complete Mini Transformer boundary")}>
              <article><span>TEXT</span><strong>token IDs</strong><p>BOS · vocabulary · EOS</p></article>
              <article><span>DECODER</span><strong>[T,d_model]</strong><p>E+P · causal block · final LN</p></article>
              <article><span>LM HEAD</span><strong>[T,V]</strong><p>logits · probability · loss</p></article>
              <article><span>CONTROLLER</span><strong>next token</strong><p>append · rerun · stop</p></article>
            </div>
            <div className="concept-callout mini-transformer-prerequisite"><span className="callout-mark">↩</span><div>
              <strong>{t("선행 개념", "Prerequisites")}</strong>
              <p>{t("tokenizer·embedding, stable Softmax와 cross entropy, causal Self-Attention, pre-norm residual block, gradient descent를 다시 사용합니다.", "Reuse tokenization and embeddings, stable softmax and cross entropy, causal self-attention, the pre-norm residual block, and gradient descent.")}</p>
              {preview ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a> : <span>{t("이전: Transformer 블록", "Previous: The Transformer Block")}</span>}
            </div></div>
          </section>

          <section className="article-section" id="shift">
            <div className="margin-label">02 — TOKENIZE AND SHIFT</div>
            <h2>{t("각 causal prefix row는 바로 다음 token 하나를 배웁니다", "Each causal prefix row learns one immediately following token")}</h2>
            <p>{t(
              "fixture는 입력을 소문자 영단어와 마침표로 나눈 뒤 고정 vocabulary ID에 대응시키고, 없는 항목은 UNK로 보내는 작은 word-level tokenizer를 사용합니다. teacher forcing에서는 완성된 문장을 한 번에 block에 넣되 causal mask로 미래 입력을 숨기고, 입력 IDs와 target IDs를 한 칸 어긋나게 만듭니다. padding row가 있다면 loss에서 제외해야 하지만 이 작은 batch에는 padding이 없습니다.",
              "The fixture uses a tiny word-level tokenizer: lowercase the input, split alphabetic words and periods, map them to fixed-vocabulary IDs, and send missing entries to UNK. Teacher forcing feeds a complete sentence to the block while the causal mask hides future inputs, then shifts input and target IDs by one. Padding rows would be excluded from loss, though this tiny batch has none.",
            )}</p>
            <div className="mini-transformer-shift-example" role="group" aria-label={t("입력과 target shift 예시", "Input and target shift example")}>
              <span><strong>INPUT</strong> [BOS, the, cat, sat, .]</span>
              <span><strong>TARGET</strong> [the, cat, sat, ., EOS]</span>
            </div>
            <MathFormula latex={String.raw`x_t=[w_0,\ldots,w_t]\quad\longrightarrow\quad y_t=w_{t+1}`} display />
          </section>

          <section className="article-section" id="forward">
            <div className="margin-label">03 — FORWARD PATH AND SHAPES</div>
            <h2>{t("vocabulary 폭은 block 안이 아니라 LM head에서 처음 나타납니다", "Vocabulary width first appears at the LM head, not inside the block")}</h2>
            <div className="mini-transformer-flow" role="group" aria-label={t("Mini Transformer forward 계산 순서", "Mini Transformer forward computation order")}>
              <article><span>LOOKUP + POSITION</span><strong>X₀</strong><p>[T,d]</p></article><span aria-hidden="true">→</span>
              <article><span>PRE-LN BLOCK</span><strong>H</strong><p>[T,d]</p></article><span aria-hidden="true">→</span>
              <article><span>FINAL LN</span><strong>Ĥ</strong><p>[T,d]</p></article><span aria-hidden="true">→</span>
              <article><span>VOCAB PROJECTION</span><strong>Z</strong><p>[T,V]</p></article>
            </div>
            <figure className="chapter-shape-ledger">
              <figcaption>{t("END-TO-END SHAPE LEDGER · vocabulary 폭이 생기는 경계를 분리해서 읽으세요", "END-TO-END SHAPE LEDGER · Isolate the boundary where vocabulary width first appears")}</figcaption>
              <div className="chapter-shape-ledger-scroll">
                <table>
                  <thead><tr><th scope="col">STAGE</th><th scope="col">INPUT</th><th scope="col">OUTPUT</th><th scope="col">READ</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">TOKENIZER</th><td>{t("text", "text")}</td><td>ids · [T]</td><td>{t("BOS와 고정 vocabulary", "BOS and fixed vocabulary")}</td></tr>
                    <tr><th scope="row">DECODER BLOCK</th><td>ids · [T]</td><td>H · [T,d]</td><td>{t("causal hidden state", "causal hidden state")}</td></tr>
                    <tr><th scope="row">LM HEAD</th><td>Ĥ · [T,d]</td><td>Z · [T,V]</td><td>{t("각 row의 vocabulary 후보", "vocabulary candidates per row")}</td></tr>
                    <tr><th scope="row">DECODE</th><td>{t("마지막 row · [V]", "last row · [V]")}</td><td>{t("next token · scalar", "next token · scalar")}</td><td>{t("append → prefix 재실행", "append → rerun prefix")}</td></tr>
                  </tbody>
                </table>
              </div>
            </figure>
            <div className="mini-transformer-formula-stack">
              <MathFormula latex={String.raw`H=\operatorname{Block}(E[\mathrm{ids}]+P),\qquad \hat H=\operatorname{LN}_{final}(H)`} display />
              <MathFormula latex={String.raw`Z=\hat H W_{vocab}+b_{vocab},\qquad W_{vocab}\in\mathbb{R}^{d_{model}\times V}`} display />
            </div>
          </section>

          <section className="article-section" id="loss">
            <div className="margin-label">04 — STABLE PROBABILITIES AND ONE UPDATE</div>
            <h2>{t("각 prefix의 vocabulary 후보끼리 경쟁시키고 shifted target의 loss를 평균합니다", "Compete vocabulary candidates within each prefix and average shifted-target loss")}</h2>
            <p>{t(
              "각 row에서 max logit을 먼저 빼도 Softmax 확률은 바뀌지 않으며 overflow를 피합니다. 활동은 hidden state를 고정하고 W_vocab과 b_vocab만 한 번 업데이트합니다. 이는 end-to-end corpus training이 아니라 gradient·loss·LM-head 경계를 확인하는 작은 학습 probe입니다.",
              "Subtracting the maximum logit within each row preserves softmax probabilities while avoiding overflow. The activity freezes hidden states and updates only W_vocab and b_vocab once. This is a small probe of gradient, loss, and LM-head boundaries—not end-to-end corpus training.",
            )}</p>
            <div className="mini-transformer-formula-stack">
              <MathFormula latex={String.raw`p_{t,v}=\frac{e^{z_{t,v}-\max_jz_{t,j}}}{\sum_k e^{z_{t,k}-\max_jz_{t,j}}},\qquad L=-\frac1T\sum_t\log p_{t,y_t}`} display />
              <MathFormula latex={String.raw`W'_{vocab}=W_{vocab}-\eta\nabla_W L,\qquad b'_{vocab}=b_{vocab}-\eta\nabla_b L`} display />
            </div>
          </section>

          <section className="article-section" id="decode">
            <div className="margin-label">05 — AUTOREGRESSIVE CONTROLLER</div>
            <h2>{t("학습의 모든 row와 생성의 마지막 row를 구분합니다", "Separate all training rows from the final generation row")}</h2>
            <p>{t(
              "teacher forcing은 여러 shifted target의 loss를 병렬로 계산하지만, 생성 시점에는 현재 prefix의 마지막 row만 다음 token 분포로 사용합니다. 이 fixture는 KV cache를 구현하지 않으므로 token 하나를 append할 때마다 전체 prefix를 다시 실행합니다. EOS를 만나거나 maxNewTokens에 도달하면 반드시 멈춥니다.",
              "Teacher forcing computes loss for several shifted targets in parallel, but generation uses only the current prefix's last row as the next-token distribution. This fixture implements no KV cache, so it reruns the full prefix after appending each token. It must stop on EOS or at maxNewTokens.",
            )}</p>
            <ol className="mini-transformer-decode-steps">
              <li>{t("현재 prefix를 tokenize하고 forward한다.", "Tokenize and run the current prefix.")}</li>
              <li>{t("이 활동에서는 마지막 [V] row의 greedy argmax token을 고른다.", "In this activity, choose the greedy argmax token from the final [V] row.")}</li>
              <li>{t("token을 append하고 EOS/한도를 검사한 뒤 필요하면 반복한다.", "Append the token, check EOS and the limit, then repeat if needed.")}</li>
            </ol>
          </section>

          <div id="mini-transformer-lab"><MiniTransformerLab onCompletionChange={setLabComplete} /></div>

          <section className="article-section mini-transformer-python-bridge" id="numpy-bridge">
            <div className="margin-label">07 — NUMPY BRIDGE · OPTIONAL</div>
            <h2>{t("shifted loss와 generation controller를 실제 NumPy로 분리해 검증합니다", "Verify shifted loss and the generation controller separately in real NumPy")}</h2>
            <p>{t(
              "첫 셀은 고정 tokenizer가 만든 [BOS,the,cat,sat,.] ID와 챕터 fixture에서 손으로 옮긴 final-LayerNorm hidden state를 사용합니다. [5,8] LM-head logits에서 row별 stable Softmax와 shifted cross entropy를 계산한 뒤, hidden state는 고정하고 vocabulary projection과 bias만 gradient descent로 한 번 갱신합니다. 둘째 셀은 \"the cat\" prefix에서 greedy token을 append하고 전체 prefix를 매번 다시 계산하며 EOS 또는 max-length에서 멈추는 controller를 수리합니다.",
              "The first cell uses IDs from the fixed tokenizer—[BOS, the, cat, sat, .]—and final-LayerNorm hidden states copied by hand from the chapter fixture. It computes row-wise stable softmax and shifted cross entropy over [5,8] LM-head logits, freezes the hidden states, and applies one gradient-descent update only to the vocabulary projection and bias. The second cell repairs a controller that must append each greedy token to the \"the cat\" prefix, recompute the full prefix, and stop on EOS or at max length.",
            )}</p>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 심화이며 각 셀은 독립적입니다", "Optional extension; each cell is independent")}</strong>
                <p>{t(
                  "공유 Pyodide 런타임과 NumPy는 첫 실행 때만 지연 로드됩니다. 두 셀은 입력·함수·검증값을 각각 다시 만들며 필수 lab, debugger, 이해 확인, 완료 조건에 포함되지 않습니다. 런타임 다운로드가 실패해도 챕터 완료에는 영향이 없습니다.",
                  "The shared Pyodide runtime and NumPy load lazily on first execution. Each cell rebuilds its own inputs, functions, and assertions, and neither is part of the required lab, debugger, concept check, or completion gate. A runtime download failure cannot block chapter completion.",
                )}</p>
              </div>
            </div>
            <NotebookCell
              title={t("shifted cross entropy와 LM-head 한 번 갱신", "Shifted cross entropy and one LM-head update")}
              initialCode={miniTransformerLmHeadUpdateCode}
              supportCode={miniTransformerLmHeadUpdateSupportCode}
              description={<p>{t("입력 ID [0,1,2,3,4]를 target [1,2,3,4,5]와 맞춥니다. logits shape (5,8), loss 1.655967, gradient L2 0.728164를 확인하고 learning rate 0.2의 올바른 뺄셈 update가 같은 batch loss를 1.552597로 낮추는지 실행하세요. 반대로 gradient를 더하면 1.764646으로 오릅니다.", "Align input IDs [0,1,2,3,4] with targets [1,2,3,4,5]. Run the cell to verify logits shape (5,8), loss 1.655967, and gradient L2 0.728164, then confirm that a correct subtractive update at learning rate 0.2 lowers same-batch loss to 1.552597. Adding the gradient instead raises it to 1.764646.")}</p>}
              hint={<p>{t("target 위치에서 1을 뺀 probability gradient를 다섯 row로 평균한 뒤 W와 b에서 빼야 합니다. learning_rate 부호를 바꿔 ascent 대조값도 확인해 보세요.", "Subtract one at each target position, average the probability gradient over five rows, then subtract the resulting gradients from W and b. Flip the learning-rate sign to inspect the ascent counterexample.")}</p>}
              editorMinHeight={660}
              ariaLabel={t("shifted cross entropy와 LM-head 갱신 NumPy 코드", "NumPy code for shifted cross entropy and an LM-head update")}
            />
            <NotebookCell
              title={t("append·recompute·stop generation controller 수리", "Repair the append, recompute, and stop generation controller")}
              initialCode={miniTransformerGenerationRepairCode}
              description={<p>{t("기본 코드는 새 token으로 prefix 마지막 항목을 덮어써 길이를 계속 3으로 유지합니다. REPAIR 아래 한 줄을 prefix.append(next_token_id)로 바꾸면 sat → . → cat → cat → cat을 생성하고 prefix 길이가 3→4→5→6→7로 자라며 max-length에서 멈춥니다.", "The default code overwrites the final prefix item, so its length remains three. Change the line below REPAIR to prefix.append(next_token_id): generation becomes sat → . → cat → cat → cat, prefix lengths grow 3→4→5→6→7, and the controller stops at max length.")}</p>}
              hint={<p>{t("greedy argmax는 현재 전체 prefix의 마지막 logits row에서 고릅니다. 이 fixture에는 KV cache가 없으므로 token을 append한 뒤 다음 loop에서 전체 prefix를 다시 전달해야 합니다.", "Greedy argmax selects from the last logits row of the current full prefix. This fixture has no KV cache, so append the token and pass the whole enlarged prefix again on the next loop.")}</p>}
              editorMinHeight={780}
              ariaLabel={t("generation controller 수리 NumPy 코드", "NumPy code for repairing the generation controller")}
            />
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div>
                <strong>{t("이 두 probe가 증명하는 것과 증명하지 않는 것을 구분하세요", "Separate what these probes prove from what they do not prove")}</strong>
                <p>{t(
                  "이 실행은 shifted pair, vocabulary-axis CE, 한 LM-head update의 방향, greedy append/recompute/stop 불변식을 증명합니다. tokenizer 품질, 전체 block의 end-to-end 학습, 일반적인 문장 생성 품질, 학습된 언어 모델, KV cache의 정확성은 증명하지 않습니다. generation token은 학습 결과가 아니라 손으로 정한 fixture입니다.",
                  "These executions prove shifted pairs, vocabulary-axis cross entropy, the direction of one LM-head update, and greedy append/recompute/stop invariants. They do not prove tokenizer quality, end-to-end block training, general generation quality, a learned language model, or KV-cache correctness. Generation tokens come from a hand-authored fixture, not training.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">08 — OPTIONAL REMEDIATION · REPAIR CONSOLE</div>
            <h2>{t("tokenizer·causality·LM head·decode loop를 실행 결과로 수리합니다", "Repair tokenizer, causality, the LM head, and the decoding loop from executed results")}</h2>
            <p>{t(
              "각 사건은 후보 조립을 같은 tiny fixture에 실제 적용하고 shifted IDs, future leakage, row probability sum, loss 변화, prefix replay와 stop reason을 다시 계산합니다. 설명처럼 들리는 option이 아니라 수치 invariant가 맞아야 통과합니다.",
              "Each incident executes a candidate assembly on the same tiny fixture and recomputes shifted IDs, future leakage, row probability sums, loss movement, prefix replay, and stop reason. Numeric invariants—not an option that merely sounds plausible—must pass.",
            )}</p>
            <MiniTransformerDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">09 — TRANSFER BEYOND THE FIXTURE</div>
            <h2>{t("크기가 커져도 경계는 유지되고 구현 전략이 추가됩니다", "The boundaries remain as scale grows; implementation strategies are added")}</h2>
            <div className="mini-transformer-transfer-task"><strong>{t("전이 과제", "TRANSFER TASK")}</strong><p>{t(
              "block을 12개로 늘리고 tied embedding, subword vocabulary, KV cache, temperature sampling을 추가한다고 가정하세요. [T,d_model]을 유지하는 부분, [T,V]가 처음 생기는 부분, training에서만 필요한 shifted loss, generation에서만 필요한 append/stop controller를 네 범주로 분류하세요. cache는 결과 의미를 바꾸지 않고 중복 계산만 줄여야 합니다.",
              "Suppose you scale to 12 blocks and add tied embeddings, a subword vocabulary, a KV cache, and temperature sampling. Classify what preserves [T,d_model], where [T,V] first appears, what shifted loss is training-only, and what append/stop controller is generation-only. A cache must reduce repeated computation without changing result semantics.",
            )}</p></div>
          </section>

          <section className="article-section" id="check">
            <div className="margin-label">10 — CONCEPT CHECK</div>
            <MiniTransformerConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-completion-section">
            <div className="mini-transformer-completion-checklist" role="status" aria-live="polite">
              <strong>{t("완료 조건", "COMPLETION GATE")}</strong>
              <span className={labComplete ? "is-complete" : undefined}>{labComplete ? "✓" : "○"} {t("핵심 challenge 3개", "Three core challenges")}</span>
              <span className={`is-optional${debuggerComplete ? " is-complete" : ""}`}>{debuggerComplete ? "✓" : "선택"} {t("별도 debugger 4사건", "Four separate debugger incidents")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter curriculumSlug={TRANSFORMER_CURRICULUM_SLUG} slug="mini-transformer" canComplete={canComplete} lockedMessage={t("핵심 challenge 세 개와 다섯 개념 확인을 완료하세요. 나머지 challenge와 debugger는 선택입니다.", "Complete the three core challenges and all five concept checks. The remaining challenges and debugger are optional.")} />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={previousPreviewHref}>← {t("이전: Transformer 블록", "Previous: The Transformer Block")}</a> : <span>← {t("이전: Transformer 블록", "Previous: The Transformer Block")}</span>}
            <span>{t("Transformer 커리큘럼 마지막 챕터", "Final chapter of the Transformer curriculum")} ✓</span>
          </nav>
          <noscript>{t("Mini Transformer 활동에는 JavaScript가 필요합니다. 위 설명과 수식은 계속 읽을 수 있습니다.", "The Mini Transformer activities require JavaScript. The explanation and formulas above remain readable.")}</noscript>
        </article>
      </div>
    </main>
  );
}
