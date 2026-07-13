import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChapterToc } from "./ChapterToc";
import { CompleteChapter } from "./CompleteChapter";
import { ConceptCheck } from "./ConceptCheck";
import { Discussable } from "./DiscussionPanel";
import { NotebookCell } from "./NotebookCell";
import { PythonCode } from "./PythonCode";
import { TensorShapeExplorer } from "./TensorShapeExplorer";
import { VectorExplorer } from "./VectorExplorer";
import { VectorBasicsLab } from "./VectorBasicsLab";
import { VectorNotationGuide } from "./VectorNotationGuide";
import { ShapeDebuggingLab } from "./ShapeDebuggingLab";
import { ReshapeBlocksLab } from "./ReshapeBlocksLab";
import { AxisBuilderLab } from "./AxisBuilderLab";
import { RootorialMark } from "./RootorialMark";
import { MathFormula } from "./MathFormula";
import { AuthControls } from "./AuthControls";
import { PublicLearningProof } from "./PublicLearningProof";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "../features/localization/localization";
import { chaptersEn, chaptersKo } from "../data/curriculum";
import {
  cosineCurveCode,
  vectorMagnitudeCode,
  vectorMagnitudeCodeEn,
} from "../data/vectorNotebook";

const tocItemsKo = [
  { id: "meaning", label: "벡터의 의미" },
  { id: "basics", label: "기본 연산" },
  { id: "orientation", label: "행·열과 전치" },
  { id: "tensor-shape", label: "텐서 shape" },
  { id: "dot-product", label: "내적" },
  { id: "check", label: "이해 확인" },
];

const tocItemsEn = [
  { id: "meaning", label: "What vectors mean" },
  { id: "basics", label: "Basic operations" },
  { id: "orientation", label: "Rows, columns, transpose" },
  { id: "tensor-shape", label: "Tensor shape" },
  { id: "dot-product", label: "Dot product" },
  { id: "check", label: "Concept check" },
];

function useChapterTopbarVisibility() {
  const [topbarHidden, setTopbarHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let frameId: number | null = null;

    const updateVisibility = () => {
      const nextScrollY = window.scrollY;
      const scrollDelta = nextScrollY - lastScrollY;

      if (nextScrollY < 48) {
        setTopbarHidden(false);
      } else if (scrollDelta > 8 && nextScrollY > 96) {
        setTopbarHidden(true);
      } else if (scrollDelta < -8) {
        setTopbarHidden(false);
      }

      if (Math.abs(scrollDelta) > 8) {
        lastScrollY = nextScrollY;
      }
      frameId = null;
    };

    const handleScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateVisibility);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return [topbarHidden, setTopbarHidden] as const;
}

export function VectorsChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const [mastered, setMastered] = useState(false);
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const chapter = (isKo ? chaptersKo : chaptersEn).find(({ slug }) => slug === "vectors")!;
  const t = (ko: string, en: string) => isKo ? ko : en;
  const tocItems = isKo ? tocItemsKo : tocItemsEn;
  const [topbarHidden, setTopbarHidden] = useChapterTopbarVisibility();

  return (
    <main
      className={`chapter-shell${topbarHidden ? " chapter-shell-topbar-hidden" : ""}`}
    >
      <header
        className={`chapter-topbar${topbarHidden ? " chapter-topbar-hidden" : ""}`}
        onFocusCapture={() => setTopbarHidden(false)}
      >
        <Link className="wordmark" to="/" aria-label={isKo ? "Rootorial 홈" : "Rootorial home"}>
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status">
            <span className="status-dot" aria-hidden="true" /> Python · NumPy
          </span>
          <div className="chapter-progress-label">
            <span>CHAPTER 01</span>
            <div className="mini-progress"><span /></div>
            <span>1 / 10</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={tocItems} />

        <article className="lesson-article">
          <header className="lesson-hero">
            <p className="eyebrow">
              FOUNDATION · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">01</div>
            <h1>{isKo ? "벡터와 텐서" : "Vectors and Tensors"}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>Transformer가 읽는 문장은 결국 숫자의 묶음입니다. 첫 챕터에서는 그 숫자가 어떻게 <em>크기</em>, <em>방향</em>, 그리고 <em>관계</em>를 갖게 되는지 직접 움직이며 확인합니다.</>
              ) : (
                <>A sentence read by a Transformer is ultimately a collection of numbers. In this first chapter, you will move those numbers yourself to see how they gain <em>magnitude</em>, <em>direction</em>, and <em>relationships</em>.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{isKo ? "학습 목표" : "LEARNING OBJECTIVES"}</span>
              {isKo ? (
                <ul>
                  <li>벡터를 방향과 크기로 설명할 수 있다.</li>
                  <li>덧셈, 뺄셈, 스칼라 배와 정규화를 해석할 수 있다.</li>
                  <li>NumPy의 rank-1 배열, 행·열벡터와 reshape를 구분할 수 있다.</li>
                  <li>stack과 axis를 이용해 batch, tokens, d_model shape를 읽을 수 있다.</li>
                  <li>브로드캐스팅이 어느 축을 반복하는지 설명할 수 있다.</li>
                  <li>내적을 두 벡터의 정렬 정도로 해석할 수 있다.</li>
                </ul>
              ) : (
                <ul>
                  <li>Explain a vector in terms of direction and magnitude.</li>
                  <li>Interpret addition, subtraction, scalar multiplication, and normalization.</li>
                  <li>Distinguish NumPy rank-1 arrays, row and column vectors, and reshape operations.</li>
                  <li>Use stack and axis to read batch, tokens, and d_model shapes.</li>
                  <li>Explain which axes broadcasting repeats.</li>
                  <li>Interpret the dot product as the alignment between two vectors.</li>
                </ul>
              )}
            </div>
          </header>

          <section className="article-section" id="meaning">
            <div className="margin-label">01 — VECTOR</div>
            <h2>{t("숫자 두 개가 방향이 되는 순간", "When two numbers become a direction")}</h2>
            <p>
              {isKo ? <>벡터 <PythonCode>v = [3, 2]</PythonCode>는 단순히 숫자 두 개가 아닙니다. 원점에서 오른쪽으로 3, 위로 2만큼 이동하는 화살표입니다. 숫자의 개수가 늘어나면 눈으로 그릴 수 없을 뿐, 같은 규칙이 계속됩니다.</> : <>The vector <PythonCode>v = [3, 2]</PythonCode> is more than two numbers. It is an arrow that moves 3 units right and 2 units up from the origin. With more numbers it becomes impossible to draw, but the same rules still apply.</>}
            </p>
            <p>
              {isKo ? <>중요한 것은 숫자 하나하나의 이름보다 <strong>벡터 전체가 어떤 상태를 표현하는가</strong>입니다. 이미지의 픽셀, 사용자의 취향, 토큰의 의미처럼 서로 다른 대상을 같은 계산 규칙으로 다룰 수 있게 해 주는 공통 언어가 벡터입니다.</> : <>What matters is not the name of each number, but <strong>the state represented by the vector as a whole</strong>. Vectors are a common language that lets us apply the same computational rules to very different things: image pixels, user preferences, and token meanings.</>}
            </p>
            <Discussable scopeId="transformer-from-zero.vectors.meaning" subjectLabel={t("벡터를 읽는 세 관점", "Three ways to read a vector")}>
              <div className="concept-definition-grid" aria-label={t("벡터를 읽는 세 관점", "Three ways to read a vector")}>
                <article>
                  <span>MAGNITUDE</span>
                  <h3>{t("크기", "Magnitude")}</h3>
                  <p>{t("원점에서 얼마나 멀리 떨어져 있는지를 하나의 값으로 요약합니다.", "A single value summarizing how far the vector reaches from the origin.")}</p>
                </article>
                <article>
                  <span>DIRECTION</span>
                  <h3>{t("방향", "Direction")}</h3>
                  <p>{t("어떤 특징의 조합을 향하는지, 다른 벡터와 얼마나 정렬되는지 말합니다.", "Shows which combination of features it points toward and how closely it aligns with other vectors.")}</p>
                </article>
                <article>
                  <span>DIMENSION</span>
                  <h3>{t("차원", "Dimension")}</h3>
                  <p>{t("벡터를 표현하는 숫자의 개수입니다. 모델에서는 보통 d_model로 표시합니다.", "The number of values used to represent the vector, commonly written as d_model in a model.")}</p>
                </article>
              </div>
            </Discussable>
            <VectorNotationGuide />
            <p>
              {t("임베딩 벡터도 같습니다. 각 차원이 단어의 특징 하나와 정확히 대응하지는 않지만, 벡터 사이의 상대적인 방향과 거리가 의미를 표현합니다.", "Embedding vectors work the same way. Individual dimensions do not map cleanly to single word features, but relative directions and distances between vectors express meaning.")}
            </p>
            <div className="notebook-stack notebook-stack-inset">
              <Discussable
                scopeId="transformer-from-zero.vectors.notebook.vector-magnitude"
                subjectLabel={t("벡터 크기 코드 셀", "Vector magnitude code cell")}
                variant="code-cell"
              >
                <NotebookCell
                  title={t("벡터를 만들고 크기와 방향 확인하기", "Create a vector and inspect its magnitude and direction")}
                  initialCode={isKo ? vectorMagnitudeCode : vectorMagnitudeCodeEn}
                  description={
                    <p>
                      {isKo ? <>배열의 <PythonCode>shape</PythonCode>와 크기를 출력하고, 같은 벡터를 좌표 평면의 화살표로 그립니다.</> : <>Print the array <PythonCode>shape</PythonCode> and magnitude, then draw the same vector as an arrow on a coordinate plane.</>}
                    </p>
                  }
                  hint={
                    <p>
                      {isKo ? <><PythonCode>v = [3, 2]</PythonCode>를 <PythonCode> [6, 4]</PythonCode>로 바꾸면 방향과 크기 중 무엇이 유지되는지 비교해 보세요.</> : <>Change <PythonCode>v = [3, 2]</PythonCode> to <PythonCode> [6, 4]</PythonCode> and compare which of direction and magnitude stays the same.</>}
                    </p>
                  }
                  editorMinHeight={250}
                  figureAlt={t("벡터 v의 크기와 방향을 나타낸 좌표 차트", "Coordinate chart showing the magnitude and direction of vector v")}
                />
              </Discussable>
            </div>
          </section>

          <section className="article-section full-bleed-section vector-basics-section" id="basics">
            <div className="margin-label">02 — OPERATIONS</div>
            <div className="section-intro">
              <div>
                <h2>{t("벡터 연산은 “이동하고, 비교하고, 크기를 맞추는” 규칙입니다", "Vector operations are rules for moving, comparing, and scaling")}</h2>
                <p>
                  {t("같은 차원의 벡터는 좌표별로 더하고 뺍니다. 스칼라를 곱하면 방향을 유지하거나 뒤집으면서 크기를 바꾸고, 노름으로 나누면 방향만 남긴 단위벡터가 됩니다.", "Vectors with the same dimensions are added and subtracted coordinate by coordinate. Multiplying by a scalar changes magnitude while preserving or reversing direction; dividing by the norm leaves a unit vector that carries only direction.")}
                </p>
                <p>
                  {isKo ? <>아래 실험실은 원본 노트북의 덧셈 <PythonCode>[1, 2] + [5, -4]</PythonCode>, 스칼라 배, 단위벡터 예제를 한곳에 모았습니다. 결과를 보기 전에 먼저 종이나 머릿속으로 예측해 보세요.</> : <>The lab below brings together the original notebook&apos;s addition example <PythonCode>[1, 2] + [5, -4]</PythonCode>, scalar multiplication, and unit vectors. Predict each result on paper or in your head before revealing it.</>}
                </p>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </div>
            <VectorBasicsLab />
            <div className="concept-definition-grid vector-rule-grid" aria-label={t("벡터 기본 연산 규칙", "Basic vector operation rules")}>
              <article>
                <span>SAME SHAPE</span>
                <h3>{t("덧셈·뺄셈", "Addition and subtraction")}</h3>
                <p>{t("수학에서는 차원과 방향이 같은 벡터끼리 대응 원소를 계산합니다.", "In mathematics, vectors with matching dimensions and orientation are computed element by element.")}</p>
              </article>
              <article>
                <span>SCALE</span>
                <h3>{t("스칼라 배", "Scalar multiplication")}</h3>
                <p>{t("양수는 방향을 유지하고, 음수는 방향을 뒤집으며, 0은 영벡터를 만듭니다.", "A positive scalar preserves direction, a negative scalar reverses it, and zero produces the zero vector.")}</p>
              </article>
              <article>
                <span>UNIT VECTOR</span>
                <h3>{t("정규화와 v̂", "Normalization and v̂")}</h3>
                <p>{isKo ? <><MathFormula latex={String.raw`\widehat{\mathbf{v}}`} />는 “브이 햇”이라고 읽습니다. <MathFormula latex={String.raw`\widehat{\mathbf{v}} = \frac{\mathbf{v}}{\lVert \mathbf{v} \rVert_2}`} />로 길이를 1로 만들며, 영벡터에는 정의되지 않습니다.</> : <><MathFormula latex={String.raw`\widehat{\mathbf{v}}`} />, read “v hat,” is <MathFormula latex={String.raw`\widehat{\mathbf{v}} = \frac{\mathbf{v}}{\lVert \mathbf{v} \rVert_2}`} /> with its length scaled to 1. It is undefined for the zero vector.</>}</p>
              </article>
            </div>
          </section>

          <section className="article-section" id="orientation">
            <div className="margin-label">03 — ORIENTATION</div>
            <h2>{t("원소 수가 같아도 shape는 다를 수 있습니다", "The same number of elements can have different shapes")}</h2>
            <p>
              {isKo ? <>수학의 벡터에는 행과 열 방향이 있습니다. NumPy에서는 <PythonCode>(3,)</PythonCode>, <PythonCode>(1, 3)</PythonCode>, <PythonCode>(3, 1)</PythonCode>이 서로 다릅니다. 특히 1차원 배열에 <PythonCode>.T</PythonCode>를 붙여도 shape가 바뀌지 않는 점이 자주 실수를 만듭니다.</> : <>Mathematical vectors can have row or column orientation. In NumPy, <PythonCode>(3,)</PythonCode>, <PythonCode>(1, 3)</PythonCode>, and <PythonCode>(3, 1)</PythonCode> are different. A common source of mistakes is that adding <PythonCode>.T</PythonCode> to a one-dimensional array does not change its shape.</>}
            </p>
            <p>
              {isKo ? <>수학에서는 전치를 <MathFormula latex={String.raw`\mathbf{v}^{\mathsf{T}}`} />, “브이 전치”라고 읽습니다. 위 첨자 T는 값을 바꾸는 것이 아니라 행과 열의 방향을 바꾸라는 표시입니다.</> : <>In mathematics, the transpose is written <MathFormula latex={String.raw`\mathbf{v}^{\mathsf{T}}`} /> and read “v transpose.” The superscript T says to swap row and column orientation, not to change the values.</>}
            </p>
            <ReshapeBlocksLab />
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("수학 규칙과 NumPy 동작을 구분하세요", "Distinguish mathematical rules from NumPy behavior")}</strong>
                <p>
                  {isKo ? <>열벡터 <PythonCode>(3, 1)</PythonCode>과 행벡터 <PythonCode>(1, 3)</PythonCode>의 덧셈은 수학의 벡터 덧셈이 아닙니다. NumPy는 두 축을 브로드캐스팅해 <PythonCode>(3, 3)</PythonCode> 행렬을 만듭니다.</> : <>Adding a column vector <PythonCode>(3, 1)</PythonCode> and a row vector <PythonCode>(1, 3)</PythonCode> is not mathematical vector addition. NumPy broadcasts both axes and creates a <PythonCode>(3, 3)</PythonCode> matrix.</>}
                </p>
              </div>
            </div>
            <ShapeDebuggingLab />
          </section>

          <section className="article-section full-bleed-section tensor-shape-section" id="tensor-shape">
            <div className="margin-label">04 — TENSOR SHAPE</div>
            <div className="section-intro">
              <div>
                <h2>{t("벡터를 쌓으면 Transformer의 입력이 됩니다", "Stack vectors to create Transformer input")}</h2>
                <p>
                  {isKo ? <>토큰 하나는 벡터이고, 문장은 토큰 벡터의 행렬입니다. 문장을 여러 개 묶으면 <PythonCode>[batch, tokens, d_model]</PythonCode> 순서의 텐서가 됩니다.</> : <>One token is a vector, and one sentence is a matrix of token vectors. Group several sentences together and you get a tensor ordered as <PythonCode>[batch, tokens, d_model]</PythonCode>.</>}
                </p>
                <p>
                  {isKo ? <>여기서 shape는 데이터의 내용이 아니라 <strong>계산이 통과할 수 있는 구조</strong>를 설명합니다. Transformer 디버깅의 많은 오류는 값이 아니라 축의 순서를 잘못 읽어서 생깁니다.</> : <>Here, shape describes not the contents of the data but <strong>the structure through which computation can flow</strong>. Many Transformer bugs come from misreading axis order rather than from incorrect values.</>}
                </p>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </div>
            <Discussable
              scopeId="transformer-from-zero.vectors.tensor-shape.explorer"
              subjectLabel={t("텐서 shape 탐색기", "Tensor shape explorer")}
            >
              <TensorShapeExplorer />
            </Discussable>
            <AxisBuilderLab />
          </section>

          <section className="article-section full-bleed-section" id="dot-product">
            <div className="margin-label">05 — EXPLORE</div>
            <div className="section-intro">
              <div>
                <h2>{t("두 벡터를 움직여 보세요", "Move the two vectors")}</h2>
                <p>
                  {isKo ? <>슬라이더로 <strong>v</strong>와 <strong>w</strong>를 바꾸면 내적, 각도, 코사인 유사도가 함께 변합니다. 먼저 내적의 부호를 예측한 뒤 벡터를 움직여 확인해 보세요.</> : <>Use the sliders to change <strong>v</strong> and <strong>w</strong>; the dot product, angle, and cosine similarity change together. Predict the sign of the dot product before moving the vectors to check.</>}
                </p>
                <p>
                  {t("내적은 크기와 방향을 동시에 포함합니다. 크기의 영향을 제거한 코사인 유사도는 두 벡터가 같은 방향인지에만 집중하며, 임베딩 검색과 Attention 점수의 직관으로 이어집니다.", "The dot product combines magnitude and direction. Cosine similarity removes the magnitude effect and focuses only on whether two vectors point the same way, providing intuition for embedding search and Attention scores.")}
                </p>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </div>
            <Discussable
              scopeId="transformer-from-zero.vectors.dot-product.explorer"
              subjectLabel={t("내적 탐색기", "Dot product explorer")}
            >
              <VectorExplorer />
            </Discussable>
            <div className="notebook-stack">
              <Discussable
                scopeId="transformer-from-zero.vectors.notebook.cosine"
                subjectLabel={t("코사인 유사도 코드 셀", "Cosine similarity code cell")}
                variant="code-cell"
              >
                <NotebookCell
                  title={t("각도를 코사인 유사도로 바꾸기", "Convert angles to cosine similarity")}
                  initialCode={cosineCurveCode}
                  description={
                    <p>
                      {t("0°에서 180°까지 각도를 움직이며 같은 방향, 직각, 반대 방향이 각각 1, 0, -1에 대응하는지 확인합니다.", "Move through angles from 0° to 180° and verify that the same direction, perpendicular, and opposite directions correspond to 1, 0, and -1.")}
                    </p>
                  }
                  hint={
                    <p>
                      {t("그래프에 60°와 120° 지점을 표시하고 두 값의 부호가 왜 다른지 설명해 보세요.", "Mark 60° and 120° on the graph and explain why the two values have different signs.")}
                    </p>
                  }
                  editorMinHeight={330}
                  figureAlt={t("각도에 따른 코사인 유사도 곡선", "Cosine similarity curve by angle")}
                />
              </Discussable>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">→</span>
              <div>
                <strong>{t("다음 챕터들을 위한 한 문장", "One sentence for later chapters")}</strong>
                <p>{t("두 벡터의 내적은 관계를 하나의 점수로 바꿉니다. Attention에서는 이 점수를 어떻게 만들고 사용할지 7장과 8장에서 단계별로 배웁니다.", "A dot product turns the relationship between two vectors into one score. Chapters 7 and 8 will build and use those scores step by step in Attention.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">06 — CHECK</div>
            <h2>{isKo ? "이해 확인: 계산 전에 구조를 예측하기" : "Concept check: predict the structure before calculating"}</h2>
            <p>
              {isKo
                ? "Transformer 코드를 읽을 때는 계산값뿐 아니라 방향, 예외 조건, 각 축의 의미를 먼저 추적하는 습관이 중요합니다."
                : "When reading Transformer code, build the habit of tracing directions, edge cases, and the meaning of each axis before calculating values."}
            </p>
            <Discussable scopeId="transformer-from-zero.vectors.check" subjectLabel={t("shape 이해 확인", "Shape concept check")}>
              <ConceptCheck onMasteryChange={setMastered} />
            </Discussable>
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{isKo ? "이제 숫자의 모양과 관계를 먼저 읽을 수 있습니다." : "You can now read shape and relationships before values."}</h2>
            <p>
              {isKo
                ? "벡터의 방향과 크기를 설명하고, reshape와 axis를 이용해 batch, tokens, d_model shape를 추적하며, 내적의 부호를 예측할 수 있다면 첫 챕터의 목표를 달성했습니다."
                : "If you can explain vector direction and magnitude, use reshape and axis to trace batch, tokens, d_model shapes, and predict the sign of a dot product, you have reached this chapter's goal."}
            </p>
            <CompleteChapter
              slug="vectors"
              canComplete={mastered}
              lockedMessage={isKo
                ? "이해 확인 다섯 문제를 맞히면 완료할 수 있습니다."
                : "Answer all five concept-check questions correctly to complete the chapter."}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={isKo ? "챕터 이동" : "Chapter navigation"}>
            <Link to="/curricula/$curriculumSlug" params={{ curriculumSlug: "transformer-from-zero" }}>
              ← {isKo ? "커리큘럼" : "Curriculum"}
            </Link>
            <span>
              {isKo ? "다음: 학습과 최적화" : "Next: Learning and Optimization"} <small>{isKo ? "준비 중" : "Coming soon"}</small>
            </span>
          </nav>
        </article>
      </div>
    </main>
  );
}
