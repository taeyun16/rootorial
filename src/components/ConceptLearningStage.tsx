import {
  ArrowCounterClockwiseIcon,
  MouseSimpleIcon,
  PauseIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "../features/localization/localization";
import { ThreeVectorScene } from "./ThreeVectorScene";
import type { ConceptVector } from "./ThreeVectorScene";

type ConceptLearningStageProps = {
  locale: Locale;
  variant: "hero" | "lesson";
  activationId?: number;
};

const stageCopy = {
  ko: {
    title: "벡터를 직접 움직이며 크기와 방향을 확인하세요",
    breadcrumb: "벡터의 기초  ›  1. 벡터 한눈에 보기",
    mode: "실습 모드",
    complete: "값 동기화",
    output: "출력",
    pause: "일시정지",
    play: "움직임 재생",
    static: "정적 장면",
    staticHint: "정적 벡터 값으로 표시 중",
    reset: "초기화",
    drag: "끝점을 드래그하거나 방향키로 움직여 보세요",
    vector: "벡터 v",
    magnitude: "크기 ‖v‖",
    direction: "방향 θ",
    undefined: "정의되지 않음",
  },
  en: {
    title: "Move the vector to inspect its magnitude and direction",
    breadcrumb: "Vector basics  ›  1. See a vector at a glance",
    mode: "Lab mode",
    complete: "Live calculation",
    output: "Output",
    pause: "Pause motion",
    play: "Play motion",
    static: "Static scene",
    staticHint: "Showing a static vector value",
    reset: "Reset",
    drag: "Drag the endpoint or use the arrow keys",
    vector: "Vector v",
    magnitude: "Magnitude ‖v‖",
    direction: "Direction θ",
    undefined: "undefined",
  },
} as const;

const INITIAL_VECTOR = { x: 1.63, y: 1.15 } satisfies ConceptVector;

function format(value: number, digits = 2) {
  const rounded = Math.abs(value) < 0.0005 ? 0 : value;
  return rounded.toFixed(digits);
}

export function ConceptLearningStage({
  locale,
  variant,
  activationId = 0,
}: ConceptLearningStageProps) {
  const t = stageCopy[locale];
  const stageRef = useRef<HTMLElement>(null);
  const [vector, setVector] = useState<ConceptVector>(INITIAL_VECTOR);
  const [playing, setPlaying] = useState(() => variant === "hero");
  const [sceneStatus, setSceneStatus] = useState({
    motionAvailable: true,
    interactive: true,
  });
  const { motionAvailable, interactive: sceneInteractive } = sceneStatus;
  const displayedVector = useMemo(
    () => ({ x: Number(format(vector.x)), y: Number(format(vector.y)) }),
    [vector],
  );
  const metrics = useMemo(() => {
    const magnitude = Math.hypot(displayedVector.x, displayedVector.y);
    if (magnitude === 0) return { magnitude, direction: null };
    const rawDirection = Math.atan2(displayedVector.y, displayedVector.x) * (180 / Math.PI);
    const direction = rawDirection < 0 ? rawDirection + 360 : rawDirection;
    return { magnitude, direction };
  }, [displayedVector]);

  useEffect(() => {
    if (activationId < 1) return;
    setPlaying(motionAvailable);

    const shouldReveal = variant === "hero"
      && window.matchMedia("(max-width: 1100px)").matches;
    if (shouldReveal) {
      stageRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }

    window.requestAnimationFrame(() => {
      stageRef.current
        ?.querySelector<HTMLElement>(".three-vector-canvas, .three-vector-fallback")
        ?.focus({ preventScroll: true });
    });
  }, [activationId, motionAvailable, variant]);

  function reset() {
    setPlaying(false);
    setVector(INITIAL_VECTOR);
    stageRef.current
      ?.querySelector<HTMLElement>(".three-vector-canvas, .three-vector-fallback")
      ?.focus({ preventScroll: true });
  }

  function handleSceneStatus(status: typeof sceneStatus) {
    setSceneStatus(status);
    if (!status.motionAvailable) setPlaying(false);
  }

  return (
    <section
      ref={stageRef}
      id={variant === "hero" ? "hero-learning-preview" : "chapter-learning-preview"}
      className={`concept-learning-stage concept-learning-stage-${variant}`}
      data-testid="rootorial-learning-scene"
      aria-labelledby={`${variant}-concept-stage-title`}
    >
      <div className="concept-stage-kicker" aria-hidden="true">
        <span>LIVE CONCEPT LAB</span>
        <span>VECTOR · 01 / 08</span>
      </div>
      <h2
        id={`${variant}-concept-stage-title`}
        className={variant === "hero" ? "sr-only" : "concept-stage-title"}
      >
        {t.title}
      </h2>

      <div className="concept-stage-frame">
        <div className="concept-stage-main">
          <header className="concept-stage-toolbar">
            <span>{t.breadcrumb}</span>
            <span className="concept-stage-live"><i aria-hidden="true" />{t.mode}</span>
          </header>

          <div className="concept-stage-scene">
            <ThreeVectorScene
              value={vector}
              playing={playing}
              locale={locale}
              onChange={setVector}
              onUserInteraction={() => setPlaying(false)}
              onSceneStatusChange={handleSceneStatus}
            />
            <div className="concept-stage-coordinate" aria-hidden="true">
              <span>(x, y)</span>
              <strong>{format(displayedVector.x)}, {format(displayedVector.y)}</strong>
            </div>
            <span className="concept-stage-vector-label" aria-hidden="true">v</span>
          </div>

          <div className="concept-stage-controls">
            <button
              type="button"
              disabled={!motionAvailable}
              onClick={() => setPlaying((current) => !current)}
            >
              {playing ? <PauseIcon aria-hidden="true" weight="fill" /> : <PlayIcon aria-hidden="true" weight="fill" />}
              {!motionAvailable ? t.static : (playing ? t.pause : t.play)}
            </button>
            <button type="button" onClick={reset} disabled={!sceneInteractive}>
              <ArrowCounterClockwiseIcon aria-hidden="true" />
              {t.reset}
            </button>
            <span className="concept-stage-drag-hint">
              {sceneInteractive ? <MouseSimpleIcon aria-hidden="true" /> : null}
              {sceneInteractive ? t.drag : t.staticHint}
            </span>
          </div>

          <dl className="concept-stage-metrics">
            <div>
              <dt>{t.vector}</dt>
              <dd>[{format(displayedVector.x)}, {format(displayedVector.y)}]</dd>
            </div>
            <div>
              <dt>{t.magnitude}</dt>
              <dd>{format(metrics.magnitude)}</dd>
            </div>
            <div>
              <dt>{t.direction}</dt>
              <dd>{metrics.direction === null ? t.undefined : `${format(metrics.direction, 1)}°`}</dd>
            </div>
          </dl>
        </div>

        <aside className="concept-stage-code" aria-label={locale === "ko" ? "Python 코드와 출력" : "Python code and output"}>
          <header>
            <span>Python</span>
            <span><i aria-hidden="true" />{t.complete}</span>
          </header>
          <ol aria-label={locale === "ko" ? "벡터 계산 코드" : "Vector calculation code"}>
            <li><span className="code-keyword">import</span> numpy <span className="code-keyword">as</span> np</li>
            <li>v = np.array([{format(displayedVector.x)}, {format(displayedVector.y)}])</li>
            <li>norm = np.linalg.norm(v) <span className="code-comment"># {locale === "ko" ? "크기" : "magnitude"}</span></li>
            <li>angle = np.arctan2(v[1], v[0])</li>
            <li>angle = np.degrees(angle) % 360</li>
            <li>angle if norm else np.nan <span className="code-comment"># {locale === "ko" ? "방향" : "direction"}</span></li>
            <li>v <span className="code-comment"># {locale === "ko" ? "벡터" : "vector"}</span></li>
          </ol>
          <div className="concept-stage-output" aria-live="off">
            <strong>{t.output}</strong>
            <code>{format(metrics.magnitude, 12)}</code>
            <code>{metrics.direction === null ? "nan" : format(metrics.direction, 12)}</code>
            <code>array([{format(displayedVector.x)}, {format(displayedVector.y)}])</code>
          </div>
        </aside>
      </div>
    </section>
  );
}
