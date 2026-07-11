import { useState } from "react";
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";

type NotationId = "vector" | "component" | "space" | "norm";

type Notation = {
  id: NotationId;
  symbol: string;
  latex: string;
  reading: string;
  meaning: string;
  exampleLatex: string;
};

const notationsKo: Notation[] = [
  {
    id: "vector",
    symbol: "v",
    latex: String.raw`\mathbf{v}`,
    reading: "벡터 브이",
    meaning: "굵은 글씨나 화살표로도 쓰며, 순서가 있는 숫자 묶음 전체를 가리킵니다.",
    exampleLatex: String.raw`\mathbf{v} = [3, 2]`,
  },
  {
    id: "component",
    symbol: "vᵢ",
    latex: String.raw`v_i`,
    reading: "브이의 i번째 성분",
    meaning: "아래 첨자는 벡터 안의 몇 번째 숫자인지 알려 줍니다.",
    exampleLatex: String.raw`v_1 = 3,\quad v_2 = 2`,
  },
  {
    id: "space",
    symbol: "v ∈ ℝ²",
    latex: String.raw`\mathbf{v} \in \mathbb{R}^2`,
    reading: "브이는 알 투에 속한다",
    meaning: "실수 두 개로 만든 2차원 벡터라는 뜻입니다. 숫자 개수가 n개면 ℝⁿ입니다.",
    exampleLatex: String.raw`[3, 2] \in \mathbb{R}^2`,
  },
  {
    id: "norm",
    symbol: "‖v‖",
    latex: String.raw`\lVert \mathbf{v} \rVert_2`,
    reading: "브이의 노름",
    meaning: "벡터의 방향은 잠시 내려놓고, 원점에서 얼마나 긴지만 나타내는 숫자입니다.",
    exampleLatex: String.raw`\lVert [3, 2] \rVert_2 \approx 3.606`,
  },
];

const notationsEn: typeof notationsKo = [
  { ...notationsKo[0], reading: "vector v", meaning: "Written in bold or with an arrow, it refers to the entire ordered collection of numbers." },
  { ...notationsKo[1], reading: "the i-th component of v", meaning: "The subscript tells you which number inside the vector to read." },
  { ...notationsKo[2], reading: "v belongs to R two", meaning: "This means a two-dimensional vector made of two real numbers. With n numbers, the space is ℝⁿ." },
  { ...notationsKo[3], reading: "the norm of v", meaning: "Ignoring direction for a moment, this number tells you how far the vector extends from the origin." },
];

export function VectorNotationGuide() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const notations = isKo ? notationsKo : notationsEn;
  const [activeId, setActiveId] = useState<NotationId>("vector");
  const active = notations.find((notation) => notation.id === activeId) ?? notations[0];

  return (
    <section className="notation-guide" aria-labelledby="notation-guide-title">
      <div className="notation-guide-heading">
        <div>
          <p className="tensor-shape-kicker">READ THE SYMBOLS</p>
          <h3 id="notation-guide-title">{isKo ? "수식은 기호로 압축한 문장입니다" : "An equation is a sentence compressed into symbols"}</h3>
        </div>
        <p>{isKo ? "기호를 하나씩 눌러 소리 내어 읽어 보세요." : "Select each symbol and practice reading it aloud."}</p>
      </div>

      <div className="notation-symbols" role="group" aria-label={isKo ? "벡터 표기 기호 선택" : "Choose vector notation"}>
        {notations.map((notation) => (
          <button
            type="button"
            key={notation.id}
            aria-label={`${notation.symbol}, ${notation.reading}`}
            aria-pressed={notation.id === activeId}
            aria-controls="notation-active-explanation"
            onClick={() => setActiveId(notation.id)}
          >
            <MathFormula latex={notation.latex} />
          </button>
        ))}
      </div>

      <div
        className={`notation-explanation notation-active-${active.id}`}
        id="notation-active-explanation"
        aria-live="polite"
      >
        <div
          className="notation-vector-diagram"
          role="img"
          aria-label={isKo ? "원점에서 오른쪽으로 3, 위로 2 향하는 벡터 v와 성분 v1, v2, 벡터 길이를 표시한 좌표 그림" : "Coordinate diagram of vector v pointing three units right and two units up, with components v1 and v2 and the vector length"}
        >
          <i className="notation-axis-x" aria-hidden="true" />
          <i className="notation-axis-y" aria-hidden="true" />
          <i className="notation-component-x" aria-hidden="true" />
          <i className="notation-component-y" aria-hidden="true" />
          <i className="notation-vector-arrow" aria-hidden="true" />
          <MathFormula latex={String.raw`\mathbf{v}`} className="notation-label-vector" />
          <MathFormula latex={String.raw`\lVert \mathbf{v} \rVert_2`} className="notation-label-norm" />
          <MathFormula latex={String.raw`v_1 = 3`} className="notation-label-v1" />
          <MathFormula latex={String.raw`v_2 = 2`} className="notation-label-v2" />
          <MathFormula latex={String.raw`\mathbf{v} \in \mathbb{R}^2`} className="notation-label-space" />
        </div>
        <div>
          <span>{isKo ? "이렇게 읽어요" : "READ IT LIKE THIS"}</span>
          <h4>{active.reading}</h4>
          <p>{active.meaning}</p>
          <MathFormula latex={active.exampleLatex} className="notation-example-formula" />
        </div>
      </div>

      <div className="notation-index-note">
        <strong>{isKo ? "아래 첨자와 위 첨자는 달라요" : "Subscripts and superscripts mean different things"}</strong>
        <p>{isKo ? <><MathFormula latex={String.raw`v_2`} />의 아래 2는 “두 번째 성분”, <MathFormula latex={String.raw`v_2^2`} />의 위 2는 “그 값을 제곱”한다는 뜻입니다.</> : <>The 2 below <MathFormula latex={String.raw`v_2`} /> means “the second component,” while the 2 above <MathFormula latex={String.raw`v_2^2`} /> means “square that value.”</>}</p>
      </div>

      <div className="norm-walkthrough" aria-label={isKo ? "벡터 3, 2의 노름 계산 과정" : "Steps for calculating the norm of vector 3, 2"}>
        <div className="norm-formula-row">
          <span>{isKo ? "성분에서 길이로" : "FROM COMPONENTS TO LENGTH"}</span>
          <strong>{isKo ? "먼저 [3, 2]로 계산해 봅시다" : "Start by calculating with [3, 2]"}</strong>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div><small>{isKo ? "성분 찾기" : "Identify the components"}</small><MathFormula latex={String.raw`\mathbf{v} = [3, 2]`} className="norm-step-formula" /></div>
          </li>
          <li>
            <span>02</span>
            <div><small>{isKo ? "각 성분 제곱하기" : "Square each component"}</small><MathFormula latex={String.raw`3^2 + 2^2 = 13`} className="norm-step-formula" /></div>
          </li>
          <li>
            <span>03</span>
            <div><small>{isKo ? "제곱근으로 길이 구하기" : "Take the square root"}</small><MathFormula latex={String.raw`\sqrt{13} \approx 3.606`} className="norm-step-formula" /></div>
          </li>
        </ol>
        <p><strong>{isKo ? "읽기:" : "Read it:"}</strong> {isKo ? "“브이의 길이는 각 성분을 제곱해 더한 뒤 제곱근을 구한다.”" : "“The length of v is the square root of the sum of its squared components.”"}</p>
        <div className="norm-generalization">
          <span>{isKo ? "성분이 n개여도 같은 규칙" : "The same rule works for n components"}</span>
          <MathFormula
            latex={String.raw`\lVert \mathbf{v} \rVert_2 = \sqrt{v_1^2 + v_2^2 + \cdots + v_n^2}`}
            ariaLabel={isKo
              ? "벡터 v의 2-노름은 v의 각 성분을 제곱해 더한 값의 제곱근이다"
              : "The L2 norm of vector v is the square root of the sum of its squared components"}
            display
          />
        </div>
      </div>

      <div className="notation-quick-check" aria-label={isKo ? "벡터 표기 짧은 확인" : "Quick vector notation check"}>
        <details>
          <summary>{isKo ? <><MathFormula latex={String.raw`\mathbf{v} = [3, 2]`} />에서 <MathFormula latex={String.raw`v_2`} />는 무엇일까요?</> : <>In <MathFormula latex={String.raw`\mathbf{v} = [3, 2]`} />, what is <MathFormula latex={String.raw`v_2`} />?</>}</summary>
          <p>{isKo ? <><strong>2</strong>입니다. 아래 첨자 2는 대괄호 안 두 번째 값을 가리킵니다.</> : <>It is <strong>2</strong>. The subscript 2 points to the second value inside the brackets.</>}</p>
        </details>
        <details>
          <summary>{isKo ? <><MathFormula latex={String.raw`\lVert \mathbf{v} \rVert_2`} />는 그림의 어느 부분일까요?</> : <>Which part of the diagram is <MathFormula latex={String.raw`\lVert \mathbf{v} \rVert_2`} />?</>}</summary>
          <p>{isKo ? <>원점과 <MathFormula latex={String.raw`(3, 2)`} />를 잇는 <strong>대각선 화살표의 길이</strong>입니다.</> : <>It is the <strong>length of the diagonal arrow</strong> connecting the origin to <MathFormula latex={String.raw`(3, 2)`} />.</>}</p>
        </details>
      </div>
    </section>
  );
}
