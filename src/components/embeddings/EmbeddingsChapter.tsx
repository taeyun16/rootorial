import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  chaptersEn,
  chaptersKo,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum";
import {
  embeddingsLookupMaskedMeanCode,
  embeddingsScatterAddRepairCode,
} from "../../data/embeddingsNotebook";
import {
  baseEmbeddingTable,
  canCompleteEmbeddingsChapter,
  cosineSimilarity,
  embeddingVocabulary,
  meanPool,
} from "../../features/embeddings/embedding-model";
import { useLocale } from "../../features/localization/localization";
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
import { EmbeddingDebuggerLab } from "./EmbeddingDebuggerLab";
import { EmbeddingLookupLab } from "./EmbeddingLookupLab";
import { EmbeddingsConceptCheck } from "./EmbeddingsConceptCheck";

const tocItems = {
  ko: [
    { id: "tokenizer", label: "문자열에서 token ID로" },
    { id: "lookup", label: "one-hot과 lookup" },
    { id: "lookup-lab", label: "필수 embedding lab" },
    { id: "gradient", label: "row gradient" },
    { id: "geometry", label: "cosine geometry" },
    { id: "pooling", label: "masked mean" },
    { id: "numpy-bridge", label: "NumPy로 다시 증명" },
    { id: "debug", label: "계약 디버깅" },
    { id: "transfer", label: "순서로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "tokenizer", label: "Text to token IDs" },
    { id: "lookup", label: "One-hot and lookup" },
    { id: "lookup-lab", label: "Required embedding lab" },
    { id: "gradient", label: "Row gradients" },
    { id: "geometry", label: "Cosine geometry" },
    { id: "pooling", label: "Masked mean" },
    { id: "numpy-bridge", label: "Recheck in NumPy" },
    { id: "debug", label: "Contract debugging" },
    { id: "transfer", label: "Transfer to order" },
    { id: "check", label: "Concept check" },
  ],
} as const;

const displayRows = [2, 3, 4, 5, 7, 8];
const displayTable = displayRows.map((id) => [...baseEmbeddingTable[id]]);
const catDogCosine = cosineSimilarity(baseEmbeddingTable[2], baseEmbeddingTable[3]) ?? 0;
const catDogPool = meanPool([2, 3]);
const forwardPool = meanPool([3, 5, 2]);
const reversePool = meanPool([2, 5, 3]);

export function EmbeddingsChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? chaptersKo : chaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "embeddings");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [lookupLabComplete, setLookupLabComplete] = useState(false);
  const [debuggerComplete, setDebuggerComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteEmbeddingsChapter({
    lookupLabComplete,
    debuggerComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/training${isKo ? "" : "?lang=en"}`;
  const nextPreviewHref = `/admin/preview/curricula/${TRANSFORMER_CURRICULUM_SLUG}/chapters/sequences${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell embeddings-chapter-shell">
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
          <header className="lesson-hero embeddings-lesson-hero">
            <p className="eyebrow">
              TEXT → PIECES → IDS → LOOKUP → COSINE → POOL · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">05</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>문자열을 바로 계산하지 않습니다. tokenizer가 만든 <em>row 주소</em>로 table을 읽고, 반복 row의 gradient와 vector geometry를 추적한 뒤 평균이 순서를 잃는 지점까지 확인합니다.</>
              ) : (
                <>We do not compute on raw strings. Use tokenizer outputs as <em>row addresses</em>, trace repeated-row gradients and vector geometry, then find where a mean loses order.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("결정적 subword tokenizer로 문자열을 pieces와 IDs로 나누고 word·token·ID·[UNK]를 구분할 수 있다.", "Use a deterministic subword tokenizer to split text into pieces and IDs, distinguishing words, tokens, IDs, and [UNK].")}</li>
                <li>{t("one_hot(id)[V]×E[V,D]=E[id][D]를 계산하고 [B,T]→[B,T,D] lookup shape를 추적할 수 있다.", "Compute one_hot(id)[V]×E[V,D]=E[id][D] and trace lookup shape [B,T]→[B,T,D].")}</li>
                <li>{t("반복 token의 data-gradient 기여가 같은 row에 더해지고 미참조 row는 그대로임을 실행으로 증명할 수 있다.", "Demonstrate that repeated-token data-gradient contributions add into one row while unreferenced rows stay unchanged.")}</li>
                <li>{t("cosine의 scale 불변성과 zero-vector 경계를 설명하고 PAD를 제외한 mean pooling을 계산할 수 있다.", "Explain cosine scale invariance and its zero-vector boundary, then compute mean pooling with PAD excluded.")}</li>
                <li>{t("lookup row 배열은 순서를 보존하지만 plain mean은 같은 multiset의 순서를 잃음을 관찰해 sequence state의 필요성을 설명할 수 있다.", "Observe that lookup rows retain order while a plain mean loses order for the same multiset, motivating sequence state.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="tokenizer">
            <div className="margin-label">01 — TOKENIZER CONTRACT</div>
            <h2>{t("token은 자연어의 보편 단위가 아니라 모델의 입력 계약입니다", "A token is a model input contract, not a universal language unit")}</h2>
            <p>{t(
              "tokenizer는 문자열을 vocab에 있는 pieces로 나누고 각 piece에 integer ID를 붙입니다. 같은 kitten도 vocab과 분할 규칙에 따라 한 token, kit+##ten, 또는 [UNK]가 될 수 있습니다.",
              "A tokenizer splits a string into vocabulary pieces and assigns an integer ID to each. The same kitten may become one token, kit+##ten, or [UNK], depending on vocabulary and split rules.",
            )}</p>
            <div className="concept-callout embeddings-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t(
                  "벡터 장의 shape·내적·norm, 신경망 장의 trainable matrix, 훈련 장의 backward·row gradient를 그대로 사용합니다.",
                  "Reuse shapes, dot products, and norms from vectors; trainable matrices from neural networks; and backward row gradients from training.",
                )}</p>
                {preview
                  ? <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a>
                  : <span>{t("이전: 딥러닝 학습 구조", "Previous: Deep Learning Training")}</span>}
              </div>
            </div>
            <div className="embeddings-tokenizer-example" aria-label={t("subword tokenization 예시", "Subword tokenization example")}>
              <span>"kitten sleeps"</span>
              <span aria-hidden="true">→</span>
              <strong>kit · ##ten · sleeps</strong>
              <span aria-hidden="true">→</span>
              <code>[7, 8, 6]</code>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div>
                <strong>{t("ID 사이의 숫자 거리는 의미 거리가 아닙니다", "Numeric distance between IDs is not semantic distance")}</strong>
                <p>{t(
                  "ID 8이 ID 7보다 크다는 것은 vocab row가 뒤에 있다는 뜻뿐입니다. 의미 비교는 ID가 아니라 lookup 뒤 vector geometry에서 시작합니다.",
                  "ID 8 being larger than ID 7 only means its vocabulary row comes later. Semantic comparison starts from post-lookup vector geometry, not IDs.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="lookup">
            <div className="margin-label">02 — LOOKUP</div>
            <h2>{t("one-hot 행렬 곱을 계산하지 않고 같은 row를 바로 읽습니다", "Read the same row directly instead of materializing a one-hot product")}</h2>
            <p>{t(
              "E의 shape는 vocabulary size V × embedding dimension D입니다. ID i의 one-hot [V]에서 1인 항만 남으므로 one_hot(i)×E와 E[i]는 정확히 같습니다. direct lookup은 거대한 sparse one-hot을 만들지 않습니다.",
              "E has shape vocabulary size V × embedding dimension D. Only the 1 in ID i's one-hot [V] survives, so one_hot(i)×E exactly equals E[i]. Direct lookup avoids materializing a huge sparse one-hot.",
            )}</p>
            <MathFormula latex={String.raw`\mathrm{one\_hot}(i)^{\mathsf T}E=E_{i,:}\qquad [V]\,[V,D]\rightarrow[D]`} display />
            <div className="embeddings-shape-ladder" aria-label={t("embedding lookup shape", "Embedding lookup shape")}>
              <article><span>IDS</span><strong>[B,T]</strong><p>{t("정수 row 주소", "integer row addresses")}</p></article>
              <span aria-hidden="true">lookup E[V,D] →</span>
              <article><span>VECTORS</span><strong>[B,T,D]</strong><p>{t("각 위치의 D-vector", "a D-vector per position")}</p></article>
            </div>
            <div className="embeddings-table-preview">
              <MatrixGrid
                values={displayTable}
                label={t("교육 embedding table 일부", "Part of the didactic embedding table")}
                rowLabels={displayRows.map((id) => `${id} · ${embeddingVocabulary[id].token}`)}
                columnLabels={["d0", "d1"]}
                tone="indigo"
                formatValue={(value) => value.toFixed(2)}
              />
              <div>
                <ArrayDiagram
                  values={[[2, 2, 5]]}
                  shape={[1, 3]}
                  label={t("token ID sequence", "Token ID sequence")}
                  rowLabels={[t("문장", "sentence")]}
                  columnLabels={["t0", "t1", "t2"]}
                  tone="forest"
                  compact
                />
                <p><strong>[1,3] → [1,3,2]</strong></p>
              </div>
            </div>
            <p className="embeddings-precision-note">{t(
              "이 장의 2차원 좌표는 원리를 보이기 위한 작은 학습 table입니다. 실제 embedding은 훨씬 큰 D를 쓰며 개별 축 하나를 사람의 단일 의미로 이름 붙일 수 없습니다.",
              "This chapter's two-dimensional coordinates form a small learned table for exposing the mechanism. Real embeddings use much larger D, and a single axis does not carry one human-nameable meaning.",
            )}</p>
          </section>

          <div id="lookup-lab">
            <EmbeddingLookupLab onCompletionChange={setLookupLabComplete} />
          </div>

          <section className="article-section" id="gradient">
            <div className="margin-label">04 — ROW GRADIENT</div>
            <h2>{t("forward에서 읽은 row로 backward 기여가 돌아갑니다", "Backward contributions return to rows read in forward")}</h2>
            <p>{t(
              "IDs [2,2,5]는 row 2를 두 위치에서, row 5를 한 위치에서 읽습니다. 각 위치의 upstream gradient는 해당 row에 scatter-add됩니다. 같은 방향이면 두 배로 더해지고, 반대 방향이면 일부 또는 전부 상쇄될 수 있습니다.",
              "IDs [2,2,5] read row 2 at two positions and row 5 at one. Each position's upstream gradient is scatter-added into that row. Aligned contributions add to twice the size; opposing contributions may partially or fully cancel.",
            )}</p>
            <div className="embeddings-gradient-trace">
              <article><span>t0 · ID 2</span><strong>g = [0.2,-0.1]</strong></article>
              <article><span>t1 · ID 2</span><strong>g = [0.2,-0.1]</strong></article>
              <article><span>t2 · ID 5</span><strong>g = [0.2,-0.1]</strong></article>
              <span aria-hidden="true">scatter-add →</span>
              <article className="is-result"><span>ROW 2</span><strong>[0.4,-0.2]</strong></article>
              <article className="is-result"><span>ROW 5</span><strong>[0.2,-0.1]</strong></article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("미참조 row가 0인 것은 data-gradient 계약입니다", "Unreferenced rows are zero under the data-gradient contract")}</strong>
                <p>{t(
                  "weight decay나 다른 optimizer 규칙은 data-gradient가 0인 row도 바꿀 수 있습니다. 여기서는 이전 장의 lookup 경로만 분리해 관찰합니다.",
                  "Weight decay or other optimizer rules may still change a row with zero data gradient. Here we isolate only the lookup path carried from the previous chapter.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="geometry">
            <div className="margin-label">05 — COSINE GEOMETRY</div>
            <h2>{t("cosine은 크기가 아니라 두 vector의 방향을 비교합니다", "Cosine compares vector direction rather than magnitude")}</h2>
            <p>{t(
              "dot product는 방향과 크기를 함께 포함합니다. cosine은 두 norm을 나눠 양의 scale을 제거합니다. 이 table에서 cat과 dog는 비슷한 방향이지만, 높은 cosine이 보편적인 동의어·인과·공정성을 보장하지는 않습니다.",
              "A dot product mixes direction with magnitude. Cosine divides by both norms to remove positive scale. Cat and dog point similarly in this table, but high cosine guarantees neither universal synonymy, causality, nor fairness.",
            )}</p>
            <div className="embeddings-cosine-card">
              <MathFormula latex={String.raw`\cos(\mathbf a,\mathbf b)=\frac{\mathbf a\cdot\mathbf b}{\lVert\mathbf a\rVert\lVert\mathbf b\rVert}`} display />
              <div><span>cat ↔ dog</span><strong>{catDogCosine.toFixed(4)}</strong></div>
              <p>{t("dog를 7배 해도 같은 값", "Same value after scaling dog by 7")}</p>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">0</span>
              <div>
                <strong>{t("zero vector의 cosine은 0이 아니라 정의되지 않습니다", "Cosine for a zero vector is undefined, not zero")}</strong>
                <p>{t(
                  "norm이 0이면 분모가 0입니다. 이 장의 runtime은 잘못된 숫자를 만들지 않고 null 경계로 처리합니다.",
                  "A zero norm makes the denominator zero. This chapter's runtime returns a null boundary instead of inventing a numeric similarity.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="pooling">
            <div className="margin-label">06 — MASKED MEAN</div>
            <h2>{t("PAD를 제외해 길이가 달라도 같은 내용의 평균을 지킵니다", "Exclude PAD so equivalent content keeps the same mean across lengths")}</h2>
            <p>{t(
              "batch를 직사각형 [B,T]로 만들기 위해 짧은 문장에 PAD를 붙일 수 있습니다. masked mean은 PAD row를 합과 분모 모두에서 빼고 실제 token 수로 나눕니다.",
              "To form a rectangular [B,T] batch, shorter sentences may receive PAD. A masked mean removes PAD rows from both sum and denominator, dividing by the real-token count.",
            )}</p>
            <MathFormula latex={String.raw`\bar{\mathbf e}=\frac{\sum_t m_t\mathbf e_t}{\sum_t m_t}\qquad m_t=0\;\text{for PAD}`} display />
            <div className="embeddings-pooling-cases">
              <article><span>[cat,dog]</span><strong>{`[${catDogPool.map((value) => value.toFixed(3)).join(", ")}]`}</strong></article>
              <article><span>[cat,dog,PAD,PAD]</span><strong>{t("mask 후 동일", "same after masking")}</strong></article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">≠</span>
              <div>
                <strong>{t("plain mean은 문맥화된 sentence embedding이 아닙니다", "A plain mean is not a contextual sentence embedding")}</strong>
                <p>{t(
                  "static lookup row를 평균하면 간단한 baseline은 되지만 token interaction과 순서를 모델링하지 않습니다. pretrained contextual model을 실행했다고 부르지 않습니다.",
                  "A mean of static lookup rows is a useful baseline, but it models neither token interactions nor order. We do not call it pretrained contextual inference.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section embeddings-python-bridge" id="numpy-bridge">
            <div className="margin-label">07 — NUMPY BRIDGE · OPTIONAL</div>
            <h2>{t("forward gather와 backward scatter-add를 실제 NumPy로 연결합니다", "Connect forward gather to backward scatter-add in real NumPy")}</h2>
            <p>{t(
              "forward의 E[ids]는 token 위치마다 table row를 gather합니다. backward는 그 경로를 거꾸로 따라 각 위치의 upstream gradient를 원래 row에 scatter-add하며, 같은 ID가 반복되면 한 row에 모든 기여가 누적되어야 합니다. 첫 셀은 lookup·one-hot·masked mean을 한 trace로 검증하고, 둘째 셀은 반복 index 누적 버그를 직접 수리합니다.",
              "Forward E[ids] gathers one table row per token position. Backward follows those paths in reverse and scatter-adds each upstream gradient into its source row, so repeated IDs must accumulate every contribution in one row. The first cell verifies lookup, one-hot equivalence, and masked mean in one trace; the second repairs a repeated-index accumulation bug.",
            )}</p>
            <div className="concept-callout">
              <span className="callout-mark">Py</span>
              <div>
                <strong>{t("선택 심화이며 두 셀은 각각 완결된 실험입니다", "Optional extension; both cells are self-contained experiments")}</strong>
                <p>{t(
                  "브라우저가 공유 Pyodide 런타임과 NumPy를 처음 실행할 때만 지연 로드합니다. 다운로드가 실패해도 필수 lookup lab, 디버거, 챕터 완료에는 영향이 없습니다. 각 셀은 필요한 fixture를 모두 다시 만들므로 다른 셀이 남긴 상태에 의존하지 않습니다.",
                  "The browser lazily loads the shared Pyodide runtime and NumPy only when a cell first runs. A download failure never blocks the required lookup lab, debugger, or chapter completion. Each cell rebuilds every fixture it needs and does not depend on state left by the other.",
                )}</p>
              </div>
            </div>
            <NotebookCell
              title={t("lookup·one-hot·masked mean 동치 증명", "Prove lookup, one-hot, and masked-mean equivalence")}
              initialCode={embeddingsLookupMaskedMeanCode}
              description={<p>{t("교육용 E[11,2]와 IDs[2,3]를 직접 실행합니다. direct lookup과 one-hot 곱의 최대 차이가 0인지, PAD 0을 뺀 두 문장의 평균이 [2,2] shape인지 확인하세요.", "Execute the didactic E[11,2] and IDs[2,3]. Verify that direct lookup and one-hot multiplication have zero maximum difference, then confirm that excluding PAD 0 produces two means with shape [2,2].")}</p>}
              hint={<p>{t("둘째 문장의 마지막 ID 0을 3으로 바꿔 mask와 분모가 결과에 어떻게 반영되는지 비교한 뒤 셀을 초기화하세요.", "Change the final ID in the second sentence from 0 to 3, compare how the mask and denominator affect the result, then reset the cell.")}</p>}
              editorMinHeight={650}
              ariaLabel={t("embedding lookup과 masked mean NumPy 코드", "NumPy code for embedding lookup and masked mean")}
            />
            <NotebookCell
              title={t("반복 token의 scatter-add 수리", "Repair scatter-add for repeated tokens")}
              initialCode={embeddingsScatterAddRepairCode}
              description={<p>{t("처음 실행하면 gradient[ids] += upstream이 반복 ID 2의 첫 기여를 덮어 row 2가 [0.2,-0.1]에 머물고 assertion이 실패합니다. REPAIR 아래 한 줄을 np.add.at을 쓰도록 바꿔 두 기여를 [0.4,-0.2]로 누적하세요.", "The initial run fails because gradient[ids] += upstream overwrites one contribution for repeated ID 2, leaving row 2 at [0.2,-0.1]. Change the line below REPAIR to use np.add.at so both contributions accumulate to [0.4,-0.2].")}</p>}
              hint={<p>{t("np.add.at의 첫 인자는 destination, 둘째는 반복 가능한 row index, 셋째는 위치별 upstream 값입니다: np.add.at(destination, ids, values).", "The three np.add.at arguments are the destination, repeated row indices, and per-position upstream values: np.add.at(destination, ids, values).")}</p>}
              editorMinHeight={500}
              ariaLabel={t("반복 embedding gradient scatter-add 수리 NumPy 코드", "NumPy code for repairing repeated embedding-gradient scatter-add")}
            />
          </section>

          <section className="article-section" id="debug">
            <div className="margin-label">08 — DEBUG</div>
            <h2>{t("lookup·gradient·geometry·pooling 경계를 숫자로 복구합니다", "Restore lookup, gradient, geometry, and pooling boundaries with numbers")}</h2>
            <p>{t(
              "각 사건의 repair는 실제 vector를 다시 계산합니다. softmax로 embedding 좌표를 확률화하거나 반복 token을 dedupe하는 등 그럴듯한 오답이 어떤 불변식을 깨는지 확인하세요.",
              "Each incident recomputes real vectors. See which invariant is broken by plausible mistakes such as turning embedding coordinates into probabilities or deduplicating repeated tokens.",
            )}</p>
            <EmbeddingDebuggerLab onCompletionChange={setDebuggerComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">09 — TRANSFER TO SEQUENCES</div>
            <h2>{t("lookup은 순서를 남기지만 plain mean은 순서를 지웁니다", "Lookup retains order, but a plain mean erases it")}</h2>
            <p>{t(
              "[dog,runs,cat]과 [cat,runs,dog]는 lookup row 배열이 다릅니다. 그러나 같은 row multiset을 더해 평균하면 교환법칙 때문에 결과가 정확히 같습니다.",
              "[dog,runs,cat] and [cat,runs,dog] have different lookup-row arrays. Yet averaging the same row multiset gives exactly the same result because addition is commutative.",
            )}</p>
            <div className="embeddings-order-transfer">
              <article><span>dog · runs · cat</span><strong>{`[${forwardPool.map((value) => value.toFixed(3)).join(", ")}]`}</strong></article>
              <span aria-hidden="true">= mean =</span>
              <article><span>cat · runs · dog</span><strong>{`[${reversePool.map((value) => value.toFixed(3)).join(", ")}]`}</strong></article>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">→</span>
              <div>
                <strong>{t("전이 과제", "Transfer task")}</strong>
                <p>{t(
                  "두 row 배열의 t0와 t2는 어떻게 다른데 평균은 왜 같은지 index와 식으로 설명하세요. 다음 장에서 필요한 최소 장치를 position별 hidden state 또는 order-aware update로 제안하세요.",
                  "Explain with indices and an equation how t0 and t2 differ while the means match. Propose the minimal next mechanism as position-wise hidden state or an order-aware update.",
                )}</p>
              </div>
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">10 — CHECK</div>
            <EmbeddingsConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{t("이제 token을 trainable vector row로 바꾸고 그 한계를 읽을 수 있습니다", "You can now turn tokens into trainable vector rows and read their limits")}</h2>
            <p>{t(
              "shape를 예측하고 one-hot 동치와 반복 gradient를 증명한 뒤, 네 embedding 사건과 다섯 개념을 복구하면 목표에 도달했습니다.",
              "You have reached the goal after predicting shapes, proving one-hot equivalence and repeated gradients, then restoring four embedding incidents and all five concepts.",
            )}</p>
            <div className="embeddings-completion-checklist" role="status" aria-live="polite">
              <span className={lookupLabComplete ? "is-complete" : undefined}>{lookupLabComplete ? "✓" : "○"} {t("필수 lookup·gradient lab", "Required lookup and gradient lab")}</span>
              <span className={debuggerComplete ? "is-complete" : undefined}>{debuggerComplete ? "✓" : "○"} {t("embedding 계약 복구 4개", "Four embedding-contract repairs")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={TRANSFORMER_CURRICULUM_SLUG}
              slug="embeddings"
              canComplete={canComplete}
              lockedMessage={t(
                "필수 lookup lab, embedding 계약 복구 네 사건과 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
                "Finish the required lookup lab, all four embedding-contract repairs, and all five concept questions to complete the chapter.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview
              ? <a href={previousPreviewHref}>← {t("이전: 딥러닝 학습 구조", "Previous: Deep Learning Training")}</a>
              : <span>← {t("이전: 딥러닝 학습 구조", "Previous: Deep Learning Training")}</span>}
            {preview
              ? <a href={nextPreviewHref}>{t("다음: 순서가 있는 데이터", "Next: Sequential Data")} →</a>
              : <span>{t("다음: 순서가 있는 데이터", "Next: Sequential Data")} <small>{t("드래프트", "Draft")}</small></span>}
          </nav>
        </article>
      </div>
    </main>
  );
}
