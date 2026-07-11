"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { chapters } from "../curriculum";

const progressKey = "rezero-progress";

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(progressKey) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function CurriculumHome() {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setCompleted(readProgress());
  }, []);

  const progress = useMemo(
    () => Math.round((completed.length / chapters.length) * 100),
    [completed],
  );

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Re:Zero 홈">
          <span className="wordmark-mark">R0</span>
          <span>Re:Zero</span>
        </Link>
        <nav className="topnav" aria-label="주요 메뉴">
          <a href="#curriculum">커리큘럼</a>
          <a href="#how">학습 방식</a>
          <span className="runtime-status">
            <span className="status-dot" aria-hidden="true" /> 브라우저 실습
          </span>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">INTERACTIVE DEEP LEARNING TEXTBOOK</p>
          <h1>
            Transformer를
            <br />
            <em>바닥부터</em> 이해하기
          </h1>
          <p className="hero-summary">
            공식을 외우기 전에 직접 움직여 보고, 코드를 복사하기 전에
            브라우저에서 실행합니다. 벡터에서 시작해 Attention과 작은
            Transformer까지 하나의 길로 연결합니다.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/chapters/vectors">
              첫 챕터 시작하기 <span aria-hidden="true">→</span>
            </Link>
            <a className="text-link" href="#curriculum">
              전체 여정 보기
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-label="커리큘럼 개요">
          <div className="concept-orbit">
            <div className="orbit-core">
              <span>10</span>
              <small>CHAPTERS</small>
            </div>
            <span className="orbit-label orbit-label-a">Vector</span>
            <span className="orbit-label orbit-label-b">Gradient</span>
            <span className="orbit-label orbit-label-c">Embedding</span>
            <span className="orbit-label orbit-label-d">Attention</span>
          </div>
          <div className="progress-card">
            <div>
              <span>나의 진도</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-track" aria-label={`전체 진도 ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <small>이 브라우저에 자동 저장됩니다.</small>
          </div>
        </div>
      </section>

      <section className="principles" id="how" aria-labelledby="how-title">
        <div>
          <p className="section-index">학습 원칙</p>
          <h2 id="how-title">읽는 지식을 움직이는 지식으로</h2>
        </div>
        <div className="principle-grid">
          <article>
            <span>01</span>
            <h3>먼저 직관</h3>
            <p>슬라이더와 그림으로 변화의 방향을 본 뒤 수식을 만납니다.</p>
          </article>
          <article>
            <span>02</span>
            <h3>바로 실행</h3>
            <p>설치 없이 Python과 NumPy 코드를 브라우저에서 바꿔 봅니다.</p>
          </article>
          <article>
            <span>03</span>
            <h3>하나의 연결</h3>
            <p>각 개념이 Transformer의 어느 부분으로 이어지는지 놓치지 않습니다.</p>
          </article>
        </div>
      </section>

      <section className="curriculum-section" id="curriculum" aria-labelledby="curriculum-title">
        <div className="section-heading">
          <div>
            <p className="section-index">메인 커리큘럼</p>
            <h2 id="curriculum-title">0에서 Transformer까지</h2>
          </div>
          <p>
            각 챕터는 직관, 시각화, 최소 수식, 코드 실습, 이해 확인으로
            구성됩니다.
          </p>
        </div>

        <div className="chapter-list">
          {chapters.map((chapter) => {
            const isCompleted = completed.includes(chapter.slug);
            const content = (
              <>
                <div className="chapter-number">
                  {String(chapter.number).padStart(2, "0")}
                </div>
                <div className="chapter-main">
                  <div className="chapter-kicker">
                    <span>{chapter.runtime}</span>
                    <span>{chapter.duration}</span>
                  </div>
                  <h3>{chapter.title}</h3>
                  <p className="chapter-subtitle">{chapter.subtitle}</p>
                  <p className="chapter-description">{chapter.description}</p>
                  <div className="concept-tags">
                    {chapter.concepts.map((concept) => (
                      <span key={concept}>{concept}</span>
                    ))}
                  </div>
                </div>
                <div className="chapter-action">
                  {isCompleted ? (
                    <span className="completion-badge">완료</span>
                  ) : chapter.status === "available" ? (
                    <span className="enter-mark" aria-hidden="true">↗</span>
                  ) : (
                    <span className="planned-badge">준비 중</span>
                  )}
                </div>
              </>
            );

            return chapter.status === "available" ? (
              <Link className="chapter-row chapter-row-active" href={`/chapters/${chapter.slug}`} key={chapter.slug}>
                {content}
              </Link>
            ) : (
              <article className="chapter-row" key={chapter.slug} aria-label={`${chapter.title}, 준비 중`}>
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <span className="wordmark-mark">R0</span>
          <p>복잡한 개념을 한 단계씩, 실행 가능한 형태로.</p>
        </div>
        <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          맨 위로 ↑
        </a>
      </footer>
    </main>
  );
}
