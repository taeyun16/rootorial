import { useMemo, useRef, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  evaluatePracticeMastery,
  type PracticeAttempt,
  type PracticeCheck,
} from "../../features/practice/practice";
import {
  checkHiddenGradient,
  neuralNetworksPracticeChallenges,
  runScalarNeuronStep,
  scalarSecondFixture,
  scalarVisibleFixture,
  transferOutputLogits,
  xnorLabels,
  xnorSecondLogits,
  xnorVisibleLogits,
  type GradientCheckPrediction,
  type HiddenGradientPath,
  type LossDirectionPrediction,
  type NeuralNetworksPracticeChallengeId,
  type OutputLogitTransform,
  type OutputSignalFormula,
  type XnorTransferPrediction,
} from "../../features/neural-networks/neural-networks-practice";
import { DirectChoice } from "../interactive/DirectChoice";
import {
  PracticeDeck,
  PracticeResultChecks,
} from "../interactive/PracticeDeck";

type Attempts = Partial<Record<
  NeuralNetworksPracticeChallengeId,
  PracticeAttempt<NeuralNetworksPracticeChallengeId>
>>;

function formatNumber(value: number) {
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function labelsText(values: readonly number[]) {
  return `[${values.join(", ")}]`;
}

export function NeuralNetworksPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<NeuralNetworksPracticeChallengeId>("reproduce-output-signal");
  const [attempts, setAttempts] = useState<Attempts>({});
  const [lossPrediction, setLossPrediction] =
    useState<LossDirectionPrediction | "">("");
  const [outputFormula, setOutputFormula] =
    useState<OutputSignalFormula | "">("");
  const [gradientPrediction, setGradientPrediction] =
    useState<GradientCheckPrediction | "">("");
  const [hiddenPath, setHiddenPath] =
    useState<HiddenGradientPath | "">("");
  const [xnorPrediction, setXnorPrediction] =
    useState<XnorTransferPrediction | "">("");
  const [xnorTransform, setXnorTransform] =
    useState<OutputLogitTransform | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => neuralNetworksPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-output-signal": {
          skillId: t("재현", "reproduce"),
          label: "δ² = ?",
          title: t(
            "새 뉴런 두 개에서 output signal을 재현하세요",
            "Reproduce the output signal on two fresh neurons",
          ),
          summary: t(
            "BCE와 output sigmoid가 합쳐진 신호 하나로 두 one-step update의 loss를 모두 낮춥니다.",
            "Choose the BCE-plus-sigmoid signal that makes both one-step updates descend.",
          ),
        },
        "diagnose-hidden-gradient": {
          skillId: t("진단", "diagnose"),
          label: t("Gradient 검사", "Gradient check"),
          title: t(
            "수치 gradient로 빠진 factor를 찾으세요",
            "Find the missing factor with a numerical gradient",
          ),
          summary: t(
            "hidden weight의 analytic gradient를 중앙차분 결과와 비교해 끊어진 chain-rule edge를 진단합니다.",
            "Compare one analytic hidden gradient with a central finite-difference probe.",
          ),
        },
        "transfer-xnor-head": {
          skillId: t("전이", "transfer"),
          label: "XOR → XNOR",
          title: t(
            "학습한 경계를 보완 규칙으로 전이하세요",
            "Transfer one learned boundary to the complementary rule",
          ),
          summary: t(
            "hidden 표현은 유지하고 output logit 계약만 바꿔 XNOR을 만듭니다.",
            "Keep the hidden representation and change only the output-logit contract.",
          ),
        },
      }[challenge.id];
      return { ...challenge, ...localized };
    }),
    [isKo],
  );

  const mastery = useMemo(
    () => evaluatePracticeMastery(challenges, attempts),
    [attempts, challenges],
  );

  const resultLabels = {
    idle: t(
      "예측과 learner 영역을 채운 뒤 실행하세요.",
      "Complete the prediction and learner-owned controls, then run.",
    ),
    passed: t(
      "이 문제의 증거가 완성되었습니다.",
      "Evidence for this challenge is complete.",
    ),
    failed: t(
      "첫 실패 계약을 확인하고 같은 문제를 다시 실행하세요.",
      "Inspect the first failed contract, then run the same challenge again.",
    ),
    expected: t("기대 계약", "EXPECTED"),
    actual: t("실제 결과", "ACTUAL"),
    firstFailed: t("먼저 고칠 계약", "FIX THIS CONTRACT FIRST"),
  };

  const updateAttempt = (
    challengeId: NeuralNetworksPracticeChallengeId,
    checks: readonly PracticeCheck[],
  ) => {
    setAttempts((current) => ({
      ...current,
      [challengeId]: {
        challengeId,
        passed: checks.every(({ passed }) => passed),
        checks,
      },
    }));
  };

  const invalidate = (challengeId: NeuralNetworksPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReproduce = () => {
    if (!lossPrediction || !outputFormula) return;
    const visible = runScalarNeuronStep(scalarVisibleFixture, outputFormula);
    const second = runScalarNeuronStep(scalarSecondFixture, outputFormula);
    updateAttempt("reproduce-output-signal", [
      {
        id: "loss-prediction",
        label: t("두 fixture loss 방향 예측", "Predict both loss directions"),
        passed: lossPrediction === "both-decrease",
        expected: t("둘 다 감소", "both decrease"),
        actual: {
          "both-decrease": t("둘 다 감소", "both decrease"),
          "visible-only": t("공개 fixture만 감소", "visible only decreases"),
          "both-increase": t("둘 다 증가", "both increase"),
        }[lossPrediction],
        explanation: t(
          "같은 local signal이 label 1에서는 음수, label 0에서는 양수가 되어 두 update를 각자의 내리막으로 보냅니다.",
          "The same local signal is negative for label 1 and positive for label 0, sending both updates downhill.",
        ),
      },
      {
        id: "visible-fixture",
        label: t("공개 fixture · y=1", "Visible fixture · y=1"),
        passed:
          outputFormula === "p-minus-y"
          && visible.after.loss < visible.before.loss,
        expected: `δ²=p−y · loss ${formatNumber(visible.before.loss)} → ↓`,
        actual:
          `δ²=${formatNumber(visible.outputSignal)} · loss `
          + `${formatNumber(visible.before.loss)} → ${formatNumber(visible.after.loss)}`,
        explanation: t(
          "sigmoid output과 BCE를 함께 미분하면 output logit 신호는 p−y로 단순화됩니다.",
          "Differentiating sigmoid output and BCE together simplifies the output-logit signal to p−y.",
        ),
      },
      {
        id: "second-fixture",
        label: t("두 번째 fixture · y=0", "Second fixture · y=0"),
        passed:
          outputFormula === "p-minus-y"
          && second.after.loss < second.before.loss,
        expected: `δ²=p−y · loss ${formatNumber(second.before.loss)} → ↓`,
        actual:
          `δ²=${formatNumber(second.outputSignal)} · loss `
          + `${formatNumber(second.before.loss)} → ${formatNumber(second.after.loss)}`,
        explanation: t(
          "label과 parameter가 바뀌어도 같은 output signal과 θ−η∇θ update를 사용합니다.",
          "The label and parameters changed, but the same output signal and θ−η∇θ update apply.",
        ),
      },
    ]);
  };

  const runDiagnose = () => {
    if (!gradientPrediction || !hiddenPath) return;
    const visible = checkHiddenGradient(scalarVisibleFixture, hiddenPath);
    const second = checkHiddenGradient(scalarSecondFixture, hiddenPath);
    updateAttempt("diagnose-hidden-gradient", [
      {
        id: "check-prediction",
        label: t("analytic·numeric 일치 예측", "Predict analytic-to-numeric agreement"),
        passed: gradientPrediction === "both-match",
        expected: t("두 fixture 모두 일치", "both fixtures match"),
        actual: {
          "both-match": t("둘 다 일치", "both match"),
          "visible-only": t("공개 fixture만 일치", "visible only matches"),
          "neither-match": t("둘 다 불일치", "neither matches"),
        }[gradientPrediction],
        explanation: t(
          "중앙차분은 구현한 analytic chain과 독립적으로 같은 dL/dw¹을 근사합니다.",
          "Central differences approximate the same dL/dw¹ independently of the analytic chain implementation.",
        ),
      },
      {
        id: "visible-gradient",
        label: t("공개 fixture gradient", "Visible-fixture gradient"),
        passed: hiddenPath === "complete-chain" && visible.matches,
        expected: `analytic ≈ numeric ${formatNumber(visible.numerical)}`,
        actual:
          `${formatNumber(visible.analytic)} vs `
          + `${formatNumber(visible.numerical)}`,
        explanation: t(
          "hidden logit으로 돌아오려면 output weight W²와 sigmoid local derivative H(1−H)를 모두 지나야 합니다.",
          "Returning to the hidden logit requires both output weight W² and sigmoid local derivative H(1−H).",
        ),
      },
      {
        id: "second-gradient",
        label: t("두 번째 fixture gradient", "Second-fixture gradient"),
        passed: hiddenPath === "complete-chain" && second.matches,
        expected: `analytic ≈ numeric ${formatNumber(second.numerical)}`,
        actual:
          `${formatNumber(second.analytic)} vs `
          + `${formatNumber(second.numerical)}`,
        explanation: t(
          "두 fixture에서 모두 일치해야 우연히 맞은 상수 대신 chain rule을 재현한 것입니다.",
          "Agreement on both fixtures distinguishes the chain rule from an accidentally correct constant.",
        ),
      },
    ]);
  };

  const runTransfer = () => {
    if (!xnorPrediction || !xnorTransform) return;
    const visible = transferOutputLogits(xnorVisibleLogits, xnorTransform);
    const second = transferOutputLogits(xnorSecondLogits, xnorTransform);
    updateAttempt("transfer-xnor-head", [
      {
        id: "rule-prediction",
        label: t("새 truth table 예측", "Predict the new truth table"),
        passed: xnorPrediction === "invert-labels",
        expected: "XNOR = 1 − XOR",
        actual:
          xnorPrediction === "invert-labels"
            ? "XNOR = 1 − XOR"
            : "XNOR = XOR",
        explanation: t(
          "XNOR은 두 bit가 같을 때 1이므로 XOR의 네 label을 정확히 뒤집습니다.",
          "XNOR is 1 when the two bits match, exactly complementing all four XOR labels.",
        ),
      },
      {
        id: "visible-transfer",
        label: t("공개 logit fixture", "Visible logit fixture"),
        passed:
          xnorTransform === "negate-logit"
          && labelsText(visible) === labelsText(xnorLabels),
        expected: labelsText(xnorLabels),
        actual: labelsText(visible),
        explanation: t(
          "sigmoid(−z)=1−sigmoid(z)이므로 hidden 표현을 다시 학습하지 않고 output 결정만 뒤집습니다.",
          "Because sigmoid(−z)=1−sigmoid(z), the output decision flips without relearning the hidden representation.",
        ),
      },
      {
        id: "second-transfer",
        label: t("낮은 margin fixture", "Lower-margin fixture"),
        passed:
          xnorTransform === "negate-logit"
          && labelsText(second) === labelsText(xnorLabels),
        expected: labelsText(xnorLabels),
        actual: labelsText(second),
        explanation: t(
          "confidence margin이 달라도 logit 부호를 뒤집는 같은 계약이 네 label을 전이합니다.",
          "The same sign-negation contract transfers all four labels even when confidence margins change.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-output-signal") {
      setLossPrediction("");
      setOutputFormula("");
    } else if (activeId === "diagnose-hidden-gradient") {
      setGradientPrediction("");
      setHiddenPath("");
    } else {
      setXnorPrediction("");
      setXnorTransform("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setLossPrediction("");
    setOutputFormula("");
    setGradientPrediction("");
    setHiddenPath("");
    setXnorPrediction("");
    setXnorTransform("");
    setActiveId("reproduce-output-signal");
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  return (
    <PracticeDeck
      challenges={challenges}
      activeId={activeId}
      attempts={attempts}
      mastery={mastery}
      onSelect={setActiveId}
      onResetAll={resetAll}
      className="neural-networks-practice-deck"
      copy={{
        kicker: t(
          "선택 연습 · 독립 수행",
          "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE",
        ),
        title: t(
          "새 입력에서도 forward와 backward 계약을 다시 만들 수 있나요?",
          "Can you rebuild the forward and backward contracts on fresh inputs?",
        ),
        description: t(
          "필수 XOR·backprop lab과 다른 scalar·logit fixture로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer with scalar and logit fixtures that differ from the required labs. This stays separate from chapter completion.",
        ),
        challengeNavigation: t(
          "신경망 독립 연습 문제",
          "Neural-network independent practice challenges",
        ),
        levelLabels: {
          "single-boundary": t("단일 경계", "Single boundary"),
          "multi-boundary": t("복합 경계", "Multi-boundary"),
          transfer: t("전이", "Transfer"),
        },
        evidenceTitle: t("독립 수행 증거", "Independent performance evidence"),
        evidenceDescription: t(
          "이 브라우저 세션에서만 유지되며 챕터 완료 조건을 바꾸지 않습니다.",
          "Kept only for this browser session and does not change the chapter completion gate.",
        ),
        complete: t(
          "output signal 재현·gradient 진단·XNOR 전이 증거를 모두 만들었습니다.",
          "You produced output-signal, gradient-diagnosis, and XNOR-transfer evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reproduce-output-signal" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 scalar neuron", "Fixed scalar neurons")}
          >
            <span>{t("고정 scalar neuron", "FIXED SCALAR NEURONS")}</span>
            <pre><code>{`h = sigmoid(x * w1 + b1)
p = sigmoid(h * w2 + b2)

delta2 = learnerSignal
theta  = theta - learningRate * grad

visible: x=0.75, y=1
second:  x=-1.25, y=0`}</code></pre>
            <p>{t(
              "parameter와 learning rate는 fixture마다 고정됩니다.",
              "Parameters and learning rates are fixed per fixture.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "one-step update 뒤 loss 방향 예측",
                "Predict loss direction after one update",
              )}
              value={lossPrediction}
              options={[
                { value: "both-decrease", label: t("둘 다 감소", "Both decrease") },
                { value: "visible-only", label: t("공개 fixture만 감소", "Visible only") },
                { value: "both-increase", label: t("둘 다 증가", "Both increase") },
              ]}
              onChange={(value) => {
                setLossPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerSignal"
              value={outputFormula}
              options={[
                { value: "p-minus-y", label: "p − y" },
                { value: "y-minus-p", label: "y − p" },
                { value: "sigmoid-derivative-only", label: "p(1 − p)" },
              ]}
              onChange={(value) => {
                setOutputFormula(value);
                invalidate(activeId);
              }}
              compact
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!lossPrediction || !outputFormula}
              onClick={runReproduce}
            >
              {t("두 scalar fixture 실행", "Run both scalar fixtures")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetCurrent}
            >
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks
            attempt={attempts[activeId]}
            labels={resultLabels}
          />
        </div>
      ) : null}

      {activeId === "diagnose-hidden-gradient" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("독립 gradient probe", "Independent gradient probe")}
          >
            <span>{t("독립 gradient probe", "INDEPENDENT GRADIENT PROBE")}</span>
            <pre><code>{`numeric = (
  loss(w1 + epsilon) - loss(w1 - epsilon)
) / (2 * epsilon)

analytic = x * (p - y) * learnerHiddenPath`}</code></pre>
            <p>{t(
              "epsilon=1e-5 · 같은 두 scalar fixture를 사용합니다.",
              "epsilon=1e-5 · the same two scalar fixtures are used.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("진단 영역", "DIAGNOSIS REGION")}</strong>
            <DirectChoice
              label={t(
                "analytic·numeric 결과 예측",
                "Predict analytic-to-numeric results",
              )}
              value={gradientPrediction}
              options={[
                { value: "both-match", label: t("둘 다 일치", "Both match") },
                { value: "visible-only", label: t("공개 fixture만 일치", "Visible only") },
                { value: "neither-match", label: t("둘 다 불일치", "Neither matches") },
              ]}
              onChange={(value) => {
                setGradientPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerHiddenPath"
              value={hiddenPath}
              options={[
                {
                  value: "complete-chain",
                  label: "W² × H(1 − H)",
                },
                {
                  value: "missing-output-weight",
                  label: "H(1 − H)",
                },
                {
                  value: "missing-sigmoid-derivative",
                  label: "W²",
                },
              ]}
              onChange={(value) => {
                setHiddenPath(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!gradientPrediction || !hiddenPath}
              onClick={runDiagnose}
            >
              {t("analytic·numeric gradient 비교", "Compare analytic and numeric gradients")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetCurrent}
            >
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks
            attempt={attempts[activeId]}
            labels={resultLabels}
          />
        </div>
      ) : null}

      {activeId === "transfer-xnor-head" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("새로운 logit fixture", "New logit fixtures")}
          >
            <span>{t("새로운 logit fixture", "NEW LOGIT FIXTURES")}</span>
            <pre><code>{`inputs:       00, 01, 10, 11
XOR logits:  [-4,  4,  5, -5]
second:    [-1.5,2.2,1.8,-2.5]

XNOR logits = learnerTransform(XOR logits)`}</code></pre>
            <p>{t(
              "hidden 표현과 입력 순서는 고정됩니다.",
              "The hidden representation and input order stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("전이 영역", "TRANSFER REGION")}</strong>
            <DirectChoice
              label={t("XNOR truth table 예측", "Predict the XNOR truth table")}
              value={xnorPrediction}
              options={[
                {
                  value: "invert-labels",
                  label: "XNOR = 1 − XOR",
                },
                {
                  value: "keep-labels",
                  label: "XNOR = XOR",
                },
              ]}
              onChange={(value) => {
                setXnorPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerTransform"
              value={xnorTransform}
              options={[
                { value: "negate-logit", label: "zₓₙₒᵣ = −zₓₒᵣ" },
                { value: "reuse-logit", label: "zₓₙₒᵣ = zₓₒᵣ" },
                { value: "absolute-logit", label: "zₓₙₒᵣ = |zₓₒᵣ|" },
              ]}
              onChange={(value) => {
                setXnorTransform(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!xnorPrediction || !xnorTransform}
              onClick={runTransfer}
            >
              {t("두 XNOR fixture 실행", "Run both XNOR fixtures")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetCurrent}
            >
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks
            attempt={attempts[activeId]}
            labels={resultLabels}
          />
        </div>
      ) : null}
    </PracticeDeck>
  );
}
