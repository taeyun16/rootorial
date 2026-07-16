# Transformer curriculum quality baseline

Reviewed: 2026-07-16  
Repeatable report: `npm run report:curriculum-quality`  
Read-only gate: `npm run check:curriculum-quality`

## Result

The curriculum is structurally complete, but learner-authored Python stops after Chapter 2. Chapters 3–10 all have deterministic browser-model labs, semantic debuggers, concept checks, bilingual E2E coverage, completion gates, and a draft/public-404 boundary. Their shared gap is the bridge from those models into editable, executable ML code.

| # | Chapter | Sections | Activities | Python | Questions | Editorial | Default | Main target |
|---:|---|---:|---:|---:|---:|---:|---|---|
| 1 | 벡터와 텐서 | 6 | 8 (5 types) | 2 | 5 | 44/45 | published | — |
| 2 | 학습과 최적화 | 7 | 3 (3 types) | 1 | 4 | 41/45 | draft | Add a fifth concept question |
| 3 | 분류와 신경망 | 7 | 3 (3 types) | 0 | 5 | 39/45 | draft | Add an XOR Python bridge |
| 4 | 딥러닝 학습 구조 | 7 | 3 (3 types) | 0 | 5 | 40/45 | draft | Add a training-loop Python bridge |
| 5 | 토큰과 임베딩 | 8 | 3 (3 types) | 0 | 5 | 39/45 | draft | Add an embedding lookup Python bridge |
| 6 | 순서가 있는 데이터 | 7 | 3 (3 types) | 0 | 5 | 38/45 | draft | Add a recurrence Python bridge |
| 7 | Attention | 6 | 3 (3 types) | 0 | 5 | 38/45 | draft | Add Python and narrative depth |
| 8 | Self-Attention | 8 | 3 (3 types) | 0 | 5 | 36/45 | draft | Add Python, narrative, worked examples |
| 9 | Transformer 블록 | 9 | 3 (3 types) | 0 | 5 | 37/45 | draft | Add Python and worked examples |
| 10 | Mini Transformer | 8 | 3 (3 types) | 0 | 5 | 35/45 | draft | Add Python, narrative, worked examples |

## Measurement model

The 45-point editorial score records nine 0–5 dimensions:

1. Concept depth and boundary conditions
2. Narrative density
3. Worked examples with intermediate values
4. Learner agency in labs
5. Editable, executable Python
6. Specific repair feedback
7. Concept-check coverage
8. Completion evidence
9. Cross-chapter connection

The first, second, third, fourth, sixth, seventh, eighth, and ninth dimensions are explicit editorial review scores in `src/features/chapters/content-quality.ts`. The Python score is derived from the TSX source: zero cells = 0, one cell = 3, and two or more cells = 5.

The structural gate separately checks source-backed facts without pretending they measure pedagogy by themselves:

- At least six identified content sections
- Every declared activity component is rendered
- Python activity declarations match actual `NotebookCell`/`PythonLab` instances
- Concept-question registry count matches the chapter contract
- A concept check and `CompleteChapter` gate are rendered
- Korean/English copy calls and English E2E coverage exist
- Draft chapters retain an E2E public-404 assertion
- Default publication state remains published only for Chapter 1 and draft for Chapters 2–10

Known improvement targets do not fail the build. Contract drift does. This lets the report track deliberate curriculum debt while preventing existing structure, localization, assessment, and draft-safety coverage from regressing.

## Recommended order

1. Chapter 3: bridge XOR from the browser model into NumPy, because this is the first zero-Python discontinuity and the pattern can be reused.
2. Chapters 4–7: add one guided Python bridge per chapter.
3. Chapters 8–10: add Python together with denser worked examples; code alone will not close their explanation gap.
4. Chapter 2: add the fifth concept question and later expand its existing optional NumPy trace.
