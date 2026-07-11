import type { Metadata } from "next";
import Link from "next/link";
import { VectorExplorer } from "../../components/VectorExplorer";
import { PythonLab } from "../../components/PythonLab";
import { CompleteChapter } from "../../components/CompleteChapter";
import { PythonCode } from "../../components/PythonCode";

export const metadata: Metadata = {
  title: "01. 벡터와 텐서",
  description:
    "벡터의 크기, 내적, 코사인 유사도와 투영을 인터랙티브 시각화와 NumPy 코드로 이해합니다.",
};

const starterCode = `import numpy as np

v = np.array([3.0, 2.0])
w = np.array([-1.0, 3.0])

print("v의 크기:", round(np.linalg.norm(v), 3))
print("w의 크기:", round(np.linalg.norm(w), 3))
print("내적 v·w:", np.dot(v, w))

cosine = np.dot(v, w) / (np.linalg.norm(v) * np.linalg.norm(w))
print("코사인 유사도:", round(cosine, 3))

projection = np.dot(w, v) / np.dot(v, v) * v
print("w를 v에 투영:", np.round(projection, 3))`;

export default function VectorsChapter() {
  return (
    <main className="chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" href="/" aria-label="Re:Zero 홈">
          <span className="wordmark-mark">R0</span>
          <span>Re:Zero</span>
        </Link>
        <div className="chapter-progress-label">
          <span>CHAPTER 01</span>
          <div className="mini-progress"><span /></div>
          <span>1 / 10</span>
        </div>
      </header>

      <div className="article-layout">
        <aside className="article-toc" aria-label="챕터 목차">
          <p>이 챕터에서</p>
          <a href="#meaning">벡터의 의미</a>
          <a href="#dot-product">내적</a>
          <a href="#projection">투영</a>
          <a href="#lab">NumPy 실습</a>
          <div className="toc-runtime">
            <span className="status-dot" />
            <div>
              <strong>Python · NumPy</strong>
              <small>내 브라우저에서 실행</small>
            </div>
          </div>
        </aside>

        <article className="lesson-article">
          <header className="lesson-hero">
            <p className="eyebrow">FOUNDATION · 35 MIN</p>
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
          </section>

          <section className="article-section full-bleed-section" id="dot-product">
            <div className="margin-label">02 — EXPLORE</div>
            <div className="section-intro">
              <div>
                <h2>두 벡터를 움직여 보세요</h2>
                <p>
                  슬라이더로 <strong>v</strong>와 <strong>w</strong>를 바꾸면 내적,
                  각도, 투영이 함께 변합니다. 같은 방향일수록 내적은 커지고,
                  직각이면 0이 됩니다.
                </p>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </div>
            <VectorExplorer />
          </section>

          <section className="article-section" id="projection">
            <div className="margin-label">03 — PROJECTION</div>
            <h2>투영은 “얼마나 같은 방향인가”를 남긴다</h2>
            <p>
              <strong>w를 v에 투영</strong>한다는 것은 w에서 v와 같은 방향의
              성분만 남기는 일입니다. 내적이 투영의 길이를 결정합니다.
            </p>
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
          </section>

          <section className="article-section full-bleed-section" id="lab">
            <div className="margin-label">04 — CODE LAB</div>
            <div className="section-intro">
              <div>
                <h2>NumPy로 같은 계산 재현하기</h2>
                <p>
                  아래 코드는 서버로 전송되지 않습니다. Python과 NumPy가 이
                  브라우저 안에서 로드되어 실행됩니다.
                </p>
              </div>
              <span className="runtime-pill">Python · WASM</span>
            </div>
            <PythonLab initialCode={starterCode} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>이제 Attention의 가장 작은 부품을 갖췄습니다.</h2>
            <p>
              벡터를 크기와 방향으로 읽고, 내적을 관계의 점수로 해석할 수 있다면
              첫 챕터의 목표를 달성했습니다.
            </p>
            <CompleteChapter slug="vectors" />
          </section>

          <nav className="chapter-bottom-nav" aria-label="챕터 이동">
            <Link href="/">← 커리큘럼</Link>
            <span>
              다음: 학습과 최적화 <small>준비 중</small>
            </span>
          </nav>
        </article>
      </div>
    </main>
  );
}
