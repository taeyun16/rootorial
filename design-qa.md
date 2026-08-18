# Design QA — network namespace ownership delta explorer

## Evidence

- Selected visual direction: `/Users/mixlink/.codex-personal2/generated_images/019f6fb8-3938-7120-a34e-ff24ba190687/exec-68d1b131-40a8-4983-9a77-b980bbe318fb.png`
- Reference/implementation comparison in one input: `/Users/mixlink/.codex-personal2/visualizations/2026/07/17/019f6fb8-3938-7120-a34e-ff24ba190687/ownership-redesign-20260719/17-design-qa-comparison.png`
- Desktop implementation, `setns(app)`: `/Users/mixlink/.codex-personal2/visualizations/2026/07/17/019f6fb8-3938-7120-a34e-ff24ba190687/ownership-redesign-20260719/11-ownership-figure-desktop.png`
- Mobile command and BEFORE scene: `/Users/mixlink/.codex-personal2/visualizations/2026/07/17/019f6fb8-3938-7120-a34e-ff24ba190687/ownership-redesign-20260719/12-ownership-mobile-viewport.png`
- Mobile AFTER scene and corrected delta table: `/Users/mixlink/.codex-personal2/visualizations/2026/07/17/019f6fb8-3938-7120-a34e-ff24ba190687/ownership-redesign-20260719/16-ownership-mobile-table-final.png`
- Browser and states: Chrome, 1440 × 1000 and 390 × 844, `thread-enters-app` plus `socket-created-in-app` interaction checks

## Comparison result

- The selected direction's article hierarchy is preserved: figure label, serif question, restrained explanation, command selection, equal BEFORE/AFTER scenes, ruled ownership table, invariant, and caption.
- The implementation intentionally removes the mock's travel arrows. A command causes an immediate semantic comparison; only the changed or created AFTER object receives a short 180 ms outline/fade. There is no autoplay, playback control, or animated travel path.
- The existing purpose-built 1586 × 992 WebP supplies the hand-drawn kernel and namespace boundaries. DOM overlays carry real owner state, accessible descriptions, and test hooks; no placeholder diagram or CSS-drawn replacement was introduced.
- At the real 928 px article width, the command controls adapt to a horizontal research-figure rail so both diagrams remain readable. Wider containers retain the selected direction's left command rail. At 390 px the commands become an internal snap scroller and BEFORE/AFTER stack vertically.
- The delta ledger is a single ruled table rather than a collection of cards. Changed, preserved, created, and baseline states are named in text and do not rely on color.
- Rootorial's paper, ink, line, blue accent, serif, and mono tokens are used throughout. The figure has hairline boundaries and no heavy outer card or shadow.

## Corrected findings

- P2 desktop density: the first pass left excess vertical whitespace and rendered both scenes too small inside the article column. The 960 px container adaptation now gives the comparison the full figure width and keeps the table in the same reading frame.
- P1 mobile table overlap: the global inline-code rule overrode the BEFORE cell padding, causing its value to collide with the mobile column label. A component-scoped override and full-width OBJECT/WHY rows corrected the layout.
- P2 accessibility cue: the command-list help now explains Arrow-key navigation and is connected with `aria-describedby`; the misleading comparison-only `aria-controls` reference was removed.

## Runtime and accessibility checks

- Chrome interaction: selecting `setns(app)` produced BEFORE=`interface-moves`, AFTER=`thread-enters-app`, thread owner=`app`, and host socket owner=`host`.
- Chrome interaction: selecting socket creation rendered two socket objects, app listener owner=`app`, and delta kind=`created`.
- Chrome keyboard: Home moved from socket creation to the baseline; End moved back to socket creation. The roving tab stop and `aria-current="step"` state remained singular.
- Desktop and mobile component overflow were `0`; document overflow at 390 px was `0`; the active mobile target measured 74 px high.
- A newly opened Chrome QA tab rendered the component with no console warnings or errors.
- TypeScript, production build, deterministic ownership tests, and scoped diff checks pass. The full Clerk-backed E2E runner could not start in this environment because `CLERK_SECRET_KEY` is absent; its updated contract was covered by the deterministic tests and the live Chrome interaction checks above.

## Final assessment

- No remaining P0, P1, or P2 visual, responsive, interaction, or accessibility findings.

final result: passed

---

# Rootorial Hero and Learning Stage Design QA

## Reference and final state

- Selected concept: `/Users/mixlink/.codex-personal2/generated_images/019f5bea-0d45-74c0-8917-c348b0dfeaed/exec-055ae839-4ea2-438a-bfa8-66604975658e.png`
- Final implementation: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/final-qa/rootorial-home-ko-final.png`
- Side-by-side comparison: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/final-qa/target-vs-implementation.png`
- Comparison viewport: 1672 x 941, Korean locale, live scene state.

## Visual passes

1. Matched the concept's asymmetric hero composition, stage width and top alignment, orange CTA scale, dark lab surface, and code/output hierarchy.
2. Rechecked the exact-size combined comparison and retained the product's real navigation, typography, and localization rather than replacing them with mock chrome.
3. Verified the shared lesson stage in its chapter context and corrected tablet and mobile clipping with a container-based layout transition.

## Interaction and content checks

- The hero CTA scrolls to and focuses the interactive scene on mobile.
- Pointer drag, arrow-key movement, pause/resume, and reset work against the same vector state.
- The vector, magnitude, direction, Python example, and output use the same rounded values, including the undefined zero-vector direction.
- Reduced-motion users retain manual interaction; unsupported WebGL and data-saving contexts receive a static fallback.
- Rendering pauses when the scene is paused, outside the viewport, or in a hidden tab.

## Responsive matrix

- 1672 x 941: reference comparison passed.
- 1024 px: hero stacks without horizontal overflow.
- 800 px chapter view: lesson code and scene stack without clipping.
- 390 x 844: CTA, stage controls, and chapter content remain usable without horizontal overflow.

## Verification

- `npm run check`: passed.
- `npm test`: passed, 56 tests.
- Clean browser session: no console errors.
- Remaining non-blocking warnings: local admin user IDs are unset and Vite reports large production chunks.

## Responsive CTA overlap follow-up — 2026-07-14

### Source and implementation evidence

- Reported source crop: `/var/folders/bt/hs3t5j6d5js0bx5gwzk2m6tr0000gn/T/codex-clipboard-da82225a-98e6-44bd-a207-90d581544a76.png`
- Korean before state: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/overlap-audit/01-current-hero.jpg`
- Korean corrected state: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/overlap-fix-qa/01-ko-1280-after.jpg`
- English before state: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/overlap-audit/02-english-hero.jpg`
- English corrected state: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/overlap-fix-qa/02-en-1280-after.jpg`
- Full-view comparisons: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/overlap-fix-qa/03-ko-1280-before-after.jpg` and `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/overlap-fix-qa/04-en-1280-before-after.jpg`
- Focused CTA-boundary comparison: `/Users/mixlink/.codex-personal2/visualizations/2026/07/13/019f5bea-0d45-74c0-8917-c348b0dfeaed/overlap-fix-qa/05-en-cta-boundary-before-after.jpg`
- Comparison viewport and state: 1280 x 720, Korean and English locales, live hero stage.

### Comparison history

1. Earlier finding — P2 responsive collision: the fixed-width CTA plus non-wrapping helper text exceeded the narrow copy track. At 1280 px the helper crossed beneath the lab by 50 px in Korean and 84 px in English.
2. Fix: constrained the helper row to the available copy track plus the intentional hero gutter, enabled wrapping, and separated row and column gaps. No z-index or lab-panel changes were made.
3. Post-fix evidence: CTA and helper overlap are both 0 px at 1101, 1280, 1440, 1550, and 1672 px. Document overflow is 0 px at every checked width. The helper wraps below the CTA only at 1101–1440 px and returns inline at 1550 and 1672 px.

### Required fidelity surfaces

- Fonts and typography: button and helper font, size, weight, and copy are unchanged; only responsive line placement changes.
- Spacing and layout rhythm: the helper now uses an 8 px wrapped-row gap and never enters the lab boundary; the 1672 px selected-concept composition remains inline.
- Colors and visual tokens: orange CTA, green lab accents, borders, and dark surfaces are unchanged.
- Image and asset fidelity: the Three.js scene, Rootorial mark, and icon-library assets are unchanged.
- Copy and content: Korean and English CTA and helper strings are unchanged and fully readable.

### Interaction and verification

- CTA activation still focuses the Three.js canvas (`role="application"`).
- Browser console errors: none.
- `npm run check`: passed.
- Focused rendered-HTML tests: 6/6 passed.
- `npm test`: production client/SSR builds and all 56 tests passed.
- Remaining non-blocking warnings are unchanged: large Vite chunks and an unset local `ROOTORIAL_ADMIN_USER_IDS` value.

No unresolved P0, P1, or P2 issues remain.

final result: passed
