import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChapterToc } from "../components/ChapterToc";
import { CompleteChapter } from "../components/CompleteChapter";
import { ConceptCheck } from "../components/ConceptCheck";
import { NotebookCell } from "../components/NotebookCell";
import { PythonCode } from "../components/PythonCode";
import { TensorShapeExplorer } from "../components/TensorShapeExplorer";
import { VectorExplorer } from "../components/VectorExplorer";
import { AuthControls } from "../components/AuthControls";
import {
  attentionPreviewCode,
  broadcastingHeatmapCode,
  cosineCurveCode,
  projectionCode,
  tensorShapeCode,
  vectorMagnitudeCode,
} from "../data/vectorNotebook";

export const Route = createFileRoute("/chapters/vectors")({
  head: () => ({
    meta: [
      { title: "01. 벡터와 텐서 · Re:Zero" },
      {
        name: "description",
        content:
          "벡터의 크기와 내적부터 텐서 shape와 브로드캐스팅까지 인터랙티브 시각화와 NumPy 코드로 이해합니다.",
      },
    ],
  }),
  component: VectorsChapter,
});

const tocItems = [
  { id: "meaning", label: "벡터의 의미" },
  { id: "tensor-shape", label: "텐서 shape" },
  { id: "dot-product", label: "내적" },
  { id: "projection", label: "투영" },
  { id: "lab", label: "Attention 미리보기" },
  { id: "check", label: "이해 확인" },
];

function VectorsChapter() {
  const [mastered, setMastered] = useState(false);

  return (
    <main className="chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" aria-label="Re:Zero 홈">
          <span className="wordmark-mark">R0</span>
          <span>Re:Zero</span>
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
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={tocItems} />

        <article className="lesson-article">
          <header className="lesson-hero">
            <p className="eyebrow">FOUNDATION · 70 MIN</p>
            <div className="lesson-number">01</div>
            <h1>벡터와 텐서</h1>
            <p className="lesson-deck">
              Transformer가 읽는 문장은 결국 숫자의 묶음입니다. 첫 챕터에서는
              그 숫자가 어떻게 <em>크기</em>, <em>방향</em>, 그리고 <em>관계</em>를
              갖게 되는지 직접 움직이며 확인합니다.
            </p>
            <div className="lesson-objectives">
              <span>학습 목표</span>
              <ul>
                <li>벡터를 방향과 크기로 설명할 수 있다.</li>
                <li>batch, tokens, d_model 축으로 텐서 shape를 읽을 수 있다.</li>
                <li>브로드캐스팅이 어느 축을 반복하는지 설명할 수 있다.</li>
                <li>내적을 두 벡터의 정렬 정도로 해석할 수 있다.</li>
                <li>투영이 Attention과 어떤 직관으로 이어지는지 안다.</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="meaning">
            <div className="margin-label">01 — VECTOR</div>
            <h2>숫자 두 개가 방향이 되는 순간</h2>
            <p>
              벡터 <PythonCode>v = [3, 2]</PythonCode>는 단순히 숫자 두 개가
              아닙니다. 원점에서 오른쪽으로 3, 위로 2만큼 이동하는
              화살표입니다. 숫자의 개수가 늘어나면 눈으로 그릴 수 없을 뿐,
              같은 규칙이 계속됩니다.
            </p>
            <p>
              중요한 것은 숫자 하나하나의 이름보다 <strong>벡터 전체가 어떤
              상태를 표현하는가</strong>입니다. 이미지의 픽셀, 사용자의 취향,
              토큰의 의미처럼 서로 다른 대상을 같은 계산 규칙으로 다룰 수 있게
              해 주는 공통 언어가 벡터입니다.
            </p>
            <div className="concept-definition-grid" aria-label="벡터를 읽는 세 관점">
              <article>
                <span>MAGNITUDE</span>
                <h3>크기</h3>
                <p>원점에서 얼마나 멀리 떨어져 있는지를 하나의 값으로 요약합니다.</p>
              </article>
              <article>
                <span>DIRECTION</span>
                <h3>방향</h3>
                <p>어떤 특징의 조합을 향하는지, 다른 벡터와 얼마나 정렬되는지 말합니다.</p>
              </article>
              <article>
                <span>DIMENSION</span>
                <h3>차원</h3>
                <p>벡터를 표현하는 숫자의 개수입니다. 모델에서는 보통 d_model로 표시합니다.</p>
              </article>
            </div>
            <div className="equation-block" aria-label="벡터 크기 공식">
              <span>‖v‖</span>
              <span>=</span>
              <span>√(v₁² + v₂² + ··· + vₙ²)</span>
            </div>
            <p>
              임베딩 벡터도 같습니다. 각 차원이 단어의 특징 하나와 정확히
              대응하지는 않지만, 벡터 사이의 상대적인 방향과 거리가 의미를
              표현합니다.
            </p>
            <div className="notebook-stack notebook-stack-inset">
              <NotebookCell
                title="벡터를 만들고 크기와 방향 확인하기"
                initialCode={vectorMagnitudeCode}
                description={
                  <p>
                    배열의 <PythonCode>shape</PythonCode>와 크기를 출력하고,
                    같은 벡터를 좌표 평면의 화살표로 그립니다.
                  </p>
                }
                hint={
                  <p>
                    <PythonCode>v = [3, 2]</PythonCode>를
                    <PythonCode> [6, 4]</PythonCode>로 바꾸면 방향과 크기 중
                    무엇이 유지되는지 비교해 보세요.
                  </p>
                }
                editorMinHeight={250}
                figureAlt="벡터 v의 크기와 방향을 나타낸 좌표 차트"
              />
            </div>
          </section>

          <section className="article-section full-bleed-section tensor-shape-section" id="tensor-shape">
            <div className="margin-label">02 — TENSOR SHAPE</div>
            <div className="section-intro">
              <div>
                <h2>벡터를 쌓으면 Transformer의 입력이 됩니다</h2>
                <p>
                  토큰 하나는 벡터이고, 문장은 토큰 벡터의 행렬입니다. 문장을
                  여러 개 묶으면 <PythonCode>[batch, tokens, d_model]</PythonCode>
                  순서의 텐서가 됩니다.
                </p>
                <p>
                  여기서 shape는 데이터의 내용이 아니라 <strong>계산이 통과할
                  수 있는 구조</strong>를 설명합니다. Transformer 디버깅의 많은
                  오류는 값이 아니라 축의 순서를 잘못 읽어서 생깁니다.
                </p>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </div>
            <TensorShapeExplorer />
            <div className="notebook-stack">
              <NotebookCell
                title="토큰 벡터를 문장과 배치로 쌓기"
                initialCode={tensorShapeCode}
                description={
                  <p>
                    같은 숫자도 쌓는 순서에 따라 rank와 shape가 달라집니다.
                    출력의 각 축을 소리 내어 읽어 보세요.
                  </p>
                }
                hint={
                  <p>
                    토큰을 하나 더 추가해 <PythonCode>[2, 4, 4]</PythonCode>를
                    만들고 어떤 축이 바뀌었는지 확인해 보세요.
                  </p>
                }
                editorMinHeight={260}
              />
              <NotebookCell
                title="브로드캐스팅 전후 값을 heatmap으로 비교하기"
                initialCode={broadcastingHeatmapCode}
                description={
                  <p>
                    위치 행렬 <PythonCode>[tokens, d_model]</PythonCode>이 batch
                    축을 따라 반복되면서도 최종 shape는 유지되는 과정을 봅니다.
                  </p>
                }
                hint={
                  <p>
                    <PythonCode>positions</PythonCode>의 첫 번째 행을 크게 바꾸고
                    두 heatmap에서 어느 토큰 행만 달라지는지 찾아보세요.
                  </p>
                }
                editorMinHeight={360}
                figureAlt="토큰 임베딩과 위치 값이 더해진 결과를 비교한 heatmap"
              />
            </div>
          </section>

          <section className="article-section full-bleed-section" id="dot-product">
            <div className="margin-label">03 — EXPLORE</div>
            <div className="section-intro">
              <div>
                <h2>두 벡터를 움직여 보세요</h2>
                <p>
                  슬라이더로 <strong>v</strong>와 <strong>w</strong>를 바꾸면 내적,
                  각도, 투영이 함께 변합니다. 같은 방향일수록 내적은 커지고,
                  직각이면 0이 됩니다.
                </p>
                <p>
                  내적은 크기와 방향을 동시에 포함합니다. 크기의 영향을 제거한
                  코사인 유사도는 두 벡터가 같은 방향인지에만 집중하며, 임베딩
                  검색과 Attention 점수의 직관으로 이어집니다.
                </p>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </div>
            <VectorExplorer />
            <div className="notebook-stack">
              <NotebookCell
                title="각도를 코사인 유사도로 바꾸기"
                initialCode={cosineCurveCode}
                description={
                  <p>
                    0°에서 180°까지 각도를 움직이며 같은 방향, 직각, 반대 방향이
                    각각 1, 0, -1에 대응하는지 확인합니다.
                  </p>
                }
                hint={
                  <p>
                    그래프에 60°와 120° 지점을 표시하고 두 값의 부호가 왜 다른지
                    설명해 보세요.
                  </p>
                }
                editorMinHeight={330}
                figureAlt="각도에 따른 코사인 유사도 곡선"
              />
            </div>
          </section>

          <section className="article-section" id="projection">
            <div className="margin-label">04 — PROJECTION</div>
            <h2>투영은 “얼마나 같은 방향인가”를 남긴다</h2>
            <p>
              <strong>w를 v에 투영</strong>한다는 것은 w에서 v와 같은 방향의
              성분만 남기는 일입니다. 내적이 투영의 길이를 결정합니다.
            </p>
            <p>
              남은 차이는 v와 직각인 성분입니다. 따라서 w는
              <PythonCode>평행 성분 + 직교 성분</PythonCode>으로 정확히 복원됩니다.
              이 분해를 이해하면 모델이 특정 방향의 특징을 얼마나 포함하는지
              읽을 수 있습니다.
            </p>
            <div className="equation-block equation-block-compact" aria-label="벡터의 평행 성분과 직교 성분 분해">
              <span>w</span>
              <span>=</span>
              <span>projᵥ(w) + (w − projᵥ(w))</span>
            </div>
            <div className="concept-callout">
              <span className="callout-mark">→</span>
              <div>
                <strong>Transformer로 이어지는 다리</strong>
                <p>
                  Attention에서도 Query와 Key의 내적으로 “얼마나 참고할지”를
                  정합니다. 지금 배우는 내적은 7장에서 그대로 다시 등장합니다.
                </p>
              </div>
            </div>
            <div className="notebook-stack notebook-stack-inset">
              <NotebookCell
                title="평행 성분과 직교 성분을 분리하기"
                initialCode={projectionCode}
                description={
                  <p>
                    투영 벡터를 계산하고, 남은 직교 성분과 다시 더해 원래
                    <PythonCode>w</PythonCode>가 복원되는지 검증합니다.
                  </p>
                }
                hint={
                  <p>
                    <PythonCode>w</PythonCode>를 v와 완전히 같은 방향으로 바꾸면
                    직교 성분과 점선이 어떻게 달라지는지 확인해 보세요.
                  </p>
                }
                editorMinHeight={390}
                figureAlt="벡터 w의 투영과 직교 성분을 나타낸 차트"
              />
            </div>
          </section>

          <section className="article-section full-bleed-section" id="lab">
            <div className="margin-label">05 — ATTENTION BRIDGE</div>
            <div className="section-intro">
              <div>
                <h2>내적을 Attention 행렬로 확장하기</h2>
                <p>
                  지금까지 두 벡터 사이에서 계산한 내적을 모든 토큰 쌍에 적용하면
                  정사각형 유사도 행렬이 됩니다. 각 행을 확률로 바꾸면 한 토큰이
                  다른 토큰을 얼마나 참고할지 나타내는 Attention 가중치가 됩니다.
                </p>
                <p>
                  아래 셀은 아직 Query, Key, Value를 따로 학습하지 않은 단순화된
                  미리보기입니다. 그래도 <PythonCode>X @ X.T</PythonCode>가 토큰
                  간 관계를 한 번에 만든다는 핵심 구조를 볼 수 있습니다.
                </p>
              </div>
              <span className="runtime-pill">Python · WASM</span>
            </div>
            <div className="notebook-stack">
              <NotebookCell
                title="작은 Self-Attention heatmap 만들기"
                initialCode={attentionPreviewCode}
                description={
                  <p>
                    토큰 세 개의 유사도 점수를 계산하고 softmax로 정규화합니다.
                    각 행의 합이 1인지 출력과 heatmap으로 확인하세요.
                  </p>
                }
                hint={
                  <p>
                    첫 번째와 두 번째 토큰을 똑같이 만든 뒤 Attention 가중치가
                    어떻게 달라지는지 실행해 보세요.
                  </p>
                }
                editorMinHeight={390}
                figureAlt="세 토큰 사이의 Self-Attention 가중치 heatmap"
              />
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">06 — CHECK</div>
            <h2>이해 확인: shape를 먼저 예측하기</h2>
            <p>
              Transformer 코드를 읽을 때는 계산값보다 각 축의 의미를 먼저
              추적하는 습관이 중요합니다.
            </p>
            <ConceptCheck onMasteryChange={setMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>이제 Attention의 가장 작은 부품을 갖췄습니다.</h2>
            <p>
              벡터를 관계의 점수로 읽고, 텐서를 batch, tokens, d_model 축으로
              설명할 수 있다면 첫 챕터의 목표를 달성했습니다.
            </p>
            <CompleteChapter
              slug="vectors"
              canComplete={mastered}
              lockedMessage="이해 확인 두 문제를 맞히면 완료할 수 있습니다."
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label="챕터 이동">
            <Link to="/">← 커리큘럼</Link>
            <span>
              다음: 학습과 최적화 <small>준비 중</small>
            </span>
          </nav>
        </article>
      </div>
    </main>
  );
}
