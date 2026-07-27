# Curriculum improvement ledger

## Implemented

### IMP-001 — Explicit local content-preview mode

- Added `npm run dev:content` using Vite `content-preview` mode.
- Kept the gate fail-closed unless development mode, explicit mode/flag, and a
  loopback host all agree.
- Added a clearly labeled, bilingual local-preview banner.
- Added deterministic publication-catalog fallback for read-only preview routes.
- Verified the Linux shell curriculum path and five-command learning output in
  the in-app browser at desktop and 390×844.

### IMP-002 — Local curriculum audit index

- Added one read-only index for all 5 curricula, 32 implemented chapters, and
  8 planned chapters.
- Linked only preview-ready chapters; planned chapters remain labeled text.
- Added a localized return link from curriculum and chapter previews.
- Fixed English preview banners that previously retained the Korean title.
- Verified 32 chapter links, 5 curriculum links, 0 planned links, 0 console
  errors, 0 native selects, and 0 desktop/mobile horizontal overflow.
- At 390×844 all 40 visible controls meet the 44×44 touch-target contract.

### IMP-004 — Vectors chapter exhaustive learning pass

- Exercised Shape Detective and Axis Builder through wrong answers, immediate
  explanations, retry, reset, explicit AxisError, and 3/3 completion.
- Exercised all five reshape targets, tensor stages, broadcasting disclosure,
  notation choices and disclosures, vector-operation presets, sliders, and
  aligned/perpendicular/opposite/zero-vector states.
- Ran both browser Python cells. Verified plotted successful output, a learner
  edit producing `NameError`, the localized next action, and deterministic reset.
- Exercised all five concept questions as an incorrect attempt followed by a
  5/5 successful attempt; KO/EN state, keyboard vector control, mobile language
  switching, and chapter-to-curriculum navigation also passed.
- Raised every enabled mobile interaction target to at least 44×44 without
  adding a native select or creating horizontal overflow.

Research basis:

- [NumPy transpose](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html)
  confirms that a 1-D transpose is unchanged and that a new axis is required for
  a column vector. The chapter already teaches and repairs this exact trap.
- [NumPy broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html)
  confirms right-to-left comparison and the equal-or-one compatibility rule.
  The chapter exposes both the `(3, 1) + (1, 3)` expansion and an invalid axis;
  no additional prose was needed.
- [NumPy reshape](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html)
  confirms compatible element counts and one inferred `-1` dimension. The five
  visible reshape predictions already cover the useful beginner boundary. Copy
  versus view and C/F order were not added because they do not help this chapter's
  stated shape-debugging output.
- [Vaswani et al., Attention Is All You Need](https://arxiv.org/abs/1706.03762)
  defines query/key dot products, matrix-packed queries, and value weighting.
  The chapter's dot-product transfer is accurate. Scaling, masking, heads, and
  projection matrices remain in later chapters to keep this first checkpoint
  focused on vector alignment and axes.

### IMP-005 — Optimization chapter completion-contract pass

- Exercised the required learning-rate repair from an incorrect prediction to a
  correctly observed divergence, then changed only η and reached convergence.
- Solved all four optional optimizer incidents after first reproducing an uphill
  sign error and reading the resulting `w` and loss change.
- Ran the trace notebook successfully, forced a Python error, read its next
  action, and reset. In the independent gradient cell, reproduced analytic
  `[-9, -6]` versus finite-difference `[-6, -4]`, repaired the missing `2/n`
  factor, and observed the passing contract.
- Submitted all five concepts incorrectly and then recovered to 5/5. Corrected
  completion copy that called the optional debugger required, localized its
  unfinished `Optional` marker, and expanded the mobile prerequisite link from
  20px to 44px.
- Rechecked KO/EN state, 1280 and 390×844 layouts, 0 native selects, 0 console
  errors, 0 horizontal overflow, and 0 enabled mobile targets below 44×44.

Research basis:

- [Rumelhart, Hinton, and Williams (1986)](https://www.nature.com/articles/323533a0)
  describes repeatedly adjusting connection weights to minimize a measure of
  output error. The chapter makes that historical learning loop observable as
  loss trace → gradient → weight update, then explicitly transfers it to the
  next neural-network chapter. Hidden-unit credit assignment stays in that next
  chapter rather than being introduced before the linear update is mastered.
- [SciPy's current numerical-derivative documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.differentiate.derivative.html)
  documents central finite differences and the risk of subtractive cancellation
  as steps shrink. The existing independent finite-difference probe is an
  appropriate learner-visible contract. Adaptive differentiation was not added:
  it would introduce a second optional dependency without improving the intended
  MSE scaling repair.

### IMP-006 — Explicit keyboard activation and continuous preview navigation

- Added an explicit Enter/Space activation fallback to the shared language
  switcher and direct-choice group. Pointer behavior and `aria-pressed` semantics
  are unchanged.
- Reproduced the pre-fix failure, then verified Enter selects the diverging trace,
  Space selects the converging trace, Enter switches EN→KO, and Space switches
  KO→EN with focus retained on the activated button.
- Kept the first two Transformer chapters inside the local preview context:
  vectors now links forward to optimization, while optimization links backward
  to vectors and forward to the available neural-networks draft. Public routes
  retain their existing publication-aware `Coming soon` presentation.
- Clicked vectors → optimization → neural-networks and browser Back in the actual
  in-app browser. Every destination retained the English locale and `Local
  content preview` banner.
- At 390×844, both new chapter-navigation links measured 45px high, document and
  viewport width remained 390px, native select count was 0, and no enabled target
  was below 44×44. The browser console error log remained empty.

Research basis:

- [WAI-ARIA Authoring Practices Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
  requires both Enter and Space to activate a focused button and recommends that
  focus remain on a button when its action does not dismiss the current context.
  The shared fallback follows that contract and the browser recheck confirmed
  both activation keys plus retained focus.

### IMP-007 — Neural-network round-trip learning pass

- Exercised every one of the chapter's 56 direct-choice options and verified its
  immediate pressed-state transition. Completed the required XOR builder and
  hidden-backprop labs through wrong predictions, corrective feedback, and a
  successful 4/4 or loss-reducing outcome.
- Ran the bounded affine NumPy search to its 3/4 proof, reproduced the missing-
  activation assertion, repaired only the guided line to reach 4/4 with BCE
  0.022529, then reset it. Restored all four optional network-surgery incidents
  and recovered an incorrect five-question submission to 5/5.
- Added explicit Enter/Space activation to the shared concept-answer buttons
  after the browser focused them without selecting. Focus remains on the chosen
  native button and `aria-pressed` changes immediately.
- Linked the neural-network preview backward to optimization and forward to the
  already implemented training chapter. Raised its mobile prerequisite link
  from 28px to 44px. At 390×844 the chapter has 0 horizontal overflow, native
  selects, or enabled controls below 44×44.

Research basis:

- [Rumelhart, Hinton, and Williams (1986)](https://www.nature.com/articles/323533a0)
  describes back-propagation for neuron-like networks and learning internal
  representations. The chapter already makes both claims executable through
  cached forward values, hidden signals, parameter-shaped gradients, and a
  verified loss-reducing update. A longer historical survey was not added
  because it would interrupt the predict → execute → observe path.
- [WAI-ARIA Authoring Practices Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
  specifies Enter and Space activation and retained focus for actions that keep
  the current context. The shared concept-option repair now meets that behavior
  in the actual in-app browser.

### IMP-008 — Training-loop completion-contract pass

- Corrected the chapter's completion guidance to require one mini-batch/Adam lab
  plus five questions, while keeping the four-incident debugger optional. The
  English optional marker no longer exposes Korean text.
- Predicted the deliberately grouped first batch incorrectly and correctly,
  observed batch CE 0.3147→0.1413 while full CE rose 0.3010→0.4062, then ran all
  four updates including the one-row tail. Direct inspection connected W[0,0]
  gradient 0.1276 with carried Adam moment −0.0449→−0.0276; the epoch recovered
  full CE to 0.2254.
- Ran the Softmax NumPy repair through its intended assertion, changed only
  `class_axis = 1`, and observed row sums [1,1], zero cross-sample shift, and
  mean CE 0.288726. The independent Adam cell reached step 4, tail [6], and the
  same final full loss. Restored all four optional training contracts and
  recovered an incorrect five-question attempt to 5/5.
- Exercised all 32 direct-choice options, both order presets, all six parameter
  cells, code disclosure/reset controls, debugger resets, KO/EN keyboard state,
  and both preview neighbors. Raised the mobile prerequisite link from 17px to
  44px; at 390×844 the chapter has 0 overflow, native selects, or enabled targets
  below 44×44.

Research basis:

- [Kingma and Ba, Adam (2014)](https://arxiv.org/abs/1412.6980) defines adaptive
  first- and second-moment estimates for stochastic gradients. The chapter's
  separation of fresh batch gradients from persistent m, v, and step state is
  faithful and directly observable, so no additional optimizer taxonomy was
  added.
- [Srivastava et al., Dropout (2014)](https://jmlr.org/papers/v15/srivastava14a.html)
  introduces random unit removal during training and an unthinned test network.
  The chapter uses the equivalent inverted-dropout convention—scale during
  training, identity during evaluation—and explicitly avoids promising that
  dropout alone guarantees generalization.
- [PyTorch CrossEntropyLoss](https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html)
  specifies unnormalized class logits and mean reduction by default. The current
  raw-logit, true-label, mean-CE exercise matches that production contract;
  probability targets and label smoothing were left out because they do not
  improve this first three-class loop.

### IMP-009 — Embedding-table round-trip learning pass

- Corrected the completion guidance to require one lookup-and-gradient lab plus
  five questions while keeping the four embedding incidents optional. The
  English checklist no longer exposes the Korean `선택` marker.
- Exercised missing and incorrect shape predictions, all three tokenizer presets,
  both tokenizer modes, every token position, unknown-token output, a safe
  tokenizer-error recovery, and all 11 unchanged-row choices. A deliberately
  wrong affected-row prediction exposed rows 2 and 5; the successful run showed
  repeated row 2 move exactly twice as far as row 5 while unreferenced row 4
  remained `[-0.780, 0.220]`.
- Ran the lookup/one-hot/masked-mean NumPy cell to zero difference and shape
  `[2,2]`, changed a PAD ID to observe the changed mean and assertion, then reset.
  The scatter-add cell first left repeated row 2 at `[0.2,-0.1]`; replacing the
  repair line with `np.add.at` accumulated `[0.4,-0.2]`, followed by reset.
- Exercised all 12 debugger repair choices and all 15 concept choices, observed
  numerical failure explanations, restored all four contracts, then recovered an
  all-wrong concept submission to 5/5 using Enter and Space with retained focus.
- Rechecked deterministic resets, code disclosures, KO/EN, preview-local neighbor
  navigation, and an immediate lookup result at 390×844. Radio controls use a
  282×44px label hit area around the 20px indicator. Effective enabled targets,
  horizontal overflow, and native-select counts were all zero violations.

Research basis:

- [Bengio et al., A Neural Probabilistic Language Model (2003)](https://jmlr.org/papers/v3/bengio03a.html)
  learns distributed word feature vectors jointly with a sequence probability
  model. The chapter accurately isolates the trainable-row mechanism before
  order-aware sequence state; it does not imply that the didactic coordinates
  are pretrained or individually human-nameable.
- [Sennrich, Haddow, and Birch, Neural Machine Translation of Rare Words with
  Subword Units (2016)](https://aclanthology.org/P16-1162/) demonstrates a
  fixed-vocabulary subword approach to open-vocabulary rare-word handling. The
  chapter's `kit + ##ten` example correctly treats pieces and IDs as a tokenizer
  contract. A full BPE merge trainer was not added because it would displace the
  lookup-and-gradient checkpoint.
- [NumPy `ufunc.at`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.at.html)
  specifies unbuffered accumulation for indices that repeat, unlike buffered
  advanced-index `+=`. The learner-visible `[0.2,-0.1]` failure and
  `np.add.at` repair reproduce that exact boundary.

### IMP-010 — Sequence-memory round-trip learning pass

- Corrected the completion guidance to require one sequence-memory lab plus five
  questions while keeping the four-incident debugger optional. The English
  checklist no longer exposes the Korean `선택` marker.
- Exercised every prediction for long-gap, short-gap, and reverse-order sequences,
  both Vanilla RNN and LSTM cells, and every visible timestep. At gain 0.4 the
  long-gap RNN ended with hidden 0.0030 and gradient 0.0015, while the LSTM kept
  cell sensitivity 0.2778 and hidden sensitivity 0.1960; reverse order changed
  the final hidden sign and retained gradient 0.4997.
- Ran the NumPy unroll cell to final states `[-0.674144, 0.674144]`, forced and
  recovered from a learner-code error, then reproduced analytic gradient
  0.348985 versus finite difference 0.005453. Adding the missing recurrent gain
  and local derivative made both gradients 0.005453, followed by deterministic
  reset.
- Exercised all 12 debugger repairs and all 15 concept choices through deliberate
  failure, immediate explanation, retry, and 4/4 plus 5/5 recovery. Reset each
  activity, switched KO/EN with Enter and Space, and kept embeddings←sequences→
  attention navigation inside local preview.
- Raised the mobile prerequisite and both bottom navigation links from 20–22px
  to 44px. At 390×844 an immediate timestep result remained beside its control,
  and the chapter had 0 horizontal overflow, native selects, or effective
  undersized targets.

Research basis:

- [Elman, Finding Structure in Time (1990)](https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1402_1)
  uses recurrent connections as a dynamic memory of preceding state. The lab's
  ordered hidden-state trace makes that historical mechanism directly observable.
- [Bengio, Simard, and Frasconi (1994)](https://pubmed.ncbi.nlm.nih.gov/18267787/)
  explains why learning long dependencies becomes increasingly difficult. The
  chapter's product of recurrent gain and local derivatives turns that training
  obstacle into a measured timestep-by-timestep gradient rather than a slogan.
- [Hochreiter and Schmidhuber, Long Short-Term Memory (1997)](https://direct.mit.edu/neco/article/9/8/1735/6109/Long-Short-Term-Memory)
  addresses decaying error backflow with a persistent internal path. The chapter
  accurately frames its gated cell as mitigation, not a guarantee that gradients
  can never vanish.
- [Gers, Schmidhuber, and Cummins, Learning to Forget (2000)](https://direct.mit.edu/neco/article/12/10/2451/6415/Learning-to-Forget-Continual-Prediction-with-LSTM)
  specifically introduces the adaptive forget gate used by the chapter's modern
  LSTM equation. This distinction is recorded here instead of adding a historical
  timeline that would interrupt the predict → run → observe exercise.

### IMP-011 — Attention-routing round-trip learning pass

- Corrected the completion guidance to require one Attention routing lab plus
  five questions while keeping the four-incident debugger optional. The English
  checklist no longer exposes the Korean `선택` marker.
- Stopped empty query components from silently becoming zero. The learner now
  sees the existing finite-number failure beside the controls, can retry the
  current setup, and can recover the fixed local preset without external state.
- Routed all three who/where/what presets, selected every prediction and stage,
  inspected all value contributions, and executed every counterfactual. The
  where-query value-only edit kept scores and weights fixed while moving context
  to `[0.300, 0.758, 0.243]`; mastery evidence reached 2/2 predictions, 3/2
  contributions, and the counterfactual contract before deterministic reset.
- Ran both NumPy cells, forced and recovered from a learner-code error and an
  indentation error, then repaired `weights @ K` to `weights @ values`. The
  result kept scores and weights stable, changed context under a value-only edit,
  and restored its shape from `[3,2]` to `[3,3]`.
- Exercised all 12 debugger repairs and all 15 concept choices through deliberate
  failure, immediate explanation, retry, and 4/4 plus 5/5 recovery. Switched
  KO/EN with Enter and Space, kept sequences←attention→self-attention navigation
  inside local preview, and reset required/optional activities independently.
- Raised the mobile prerequisite link from 17px to 44px. At 390×844 an immediate
  correct-routing result remained beside its control, and the chapter had 0
  horizontal overflow, native selects, or effective undersized targets.

Research basis:

- [Bahdanau, Cho, and Bengio, Neural Machine Translation by Jointly Learning to
  Align and Translate (2014)](https://arxiv.org/abs/1409.0473) identifies the
  fixed-length encoder-vector bottleneck and learns a soft search over source
  positions for each target step. The required lab makes that historical
  motivation observable as query-specific source routing.
- [Luong, Pham, and Manning, Effective Approaches to Attention-based Neural
  Machine Translation (2015)](https://aclanthology.org/D15-1166/) studies global
  and local attention plus dot-product-family alignment functions. It is the
  closer source for this chapter's unscaled dot-product routing formulation.
- [Vaswani et al., Attention Is All You Need (2017)](https://arxiv.org/abs/1706.03762)
  introduces the Transformer and scaled dot-product attention. Scaling, masks,
  learned projections, and multiple heads remain intentionally deferred to the
  next Self-Attention chapter so this gate isolates Q/K/V roles and αV first.
- [SciPy `softmax`](https://scipy.github.io/devdocs/reference/generated/scipy.special.softmax.html)
  documents the max-shift used to avoid overflow. The chapter already executes
  stable key-axis softmax per query, so no extra prose-only section was added.

### IMP-012 — Self-Attention contract round-trip learning pass

- Corrected the completion guidance to name the three core workbench challenges
  plus five questions while keeping scaling, padding, NumPy, and debugger depth
  optional. The English checklist no longer exposes the Korean `선택` marker.
- Exercised all five presets and every prediction, including broken scaling,
  causal-mask, and padding-key configurations before repairing them. Required
  inspections recorded distinct Q/K/V rows, raw versus scaled scores, a blocked
  future cell, padding-key weight 0.402 with an inactive padding query, and the
  two-head `[T,4]` handoff. The three core challenges reached 3/3.
- Ran the forward NumPy cell, forced and recovered from a `NameError`, reproduced
  the mask-after-softmax assertion and a syntax error, then changed the single
  repair line to `mask_before_softmax = True`. The output restored active row
  sums to one and future, padding-key, and inactive-query mass to zero.
- Executed all 13 repair candidates across four debugger incidents, observed
  their computed contract results, and restored 4/4. Selected all 15 concept
  choices, submitted an incorrect attempt, then recovered to 5/5 with Enter and
  Space selection and retained focus.
- Raised the mobile prerequisite link from 17px to 44px. At 390×844 an immediate
  projection result remained beside its controls, and the chapter had 0
  horizontal overflow, native selects, or enabled targets below 44×44.

Research basis:

- [Vaswani et al., Attention Is All You Need (2017)](https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html)
  defines scaled dot-product attention, masking illegal decoder connections
  before softmax, and parallel learned projections whose head outputs are
  concatenated. The chapter makes each boundary executable and keeps positional
  signals, residuals, normalization, and FFN assembly in the next chapter.
  Later efficient-attention variants were not added because they would dilute
  this first exact forward-contract checkpoint.
- [WCAG 2.2 target size](https://www.w3.org/TR/WCAG22/#target-size-enhanced)
  gives 44×44 CSS pixels as the enhanced pointer-target contract. The standalone
  prerequisite link now meets that size rather than relying on an inline-text
  exception.

### IMP-013 — Transformer Block assembly round-trip learning pass

- Corrected the completion guidance to name the three core workbench challenges
  plus five questions while keeping position, first-residual, NumPy, and debugger
  depth optional. The English checklist no longer exposes the Korean `선택`
  marker.
- Exercised all five presets and 15 predictions through their broken settings
  before repairing position scale, pre-LayerNorm, both skip paths, and shared FFN
  parameters. Required inspections recorded `x₀[1,0]=0.841`,
  `LN(x₀)[1,2]=-0.333`, `x₁[1,0]=0.612`, `FFN[2,1]=0.227`, and
  `y[2,0]=1.883`; the three representative challenges reached 3/3.
- Set LayerNorm epsilon to zero to expose the local finite-range failure, then
  used safe preset recovery without losing mastery. The NumPy ledger preserved
  `[4,4]` across every stage, exposed a learner `NameError`, and reset. The
  independent residual cell reproduced `y=x0+F`, a syntax error, and finally
  passed with `y=x1+F`.
- Executed all 13 repair candidates across four debugger incidents and restored
  4/4. Selected all 15 concept choices, submitted an incorrect attempt, then
  recovered to 5/5 with Enter and Space. Current, lab-wide, incident, debugger,
  and notebook resets all returned deterministic initial state.
- Raised the mobile prerequisite link from 17px to 44px. At 390×844 an immediate
  E+P result remained beside its controls, and the chapter had 0 horizontal
  overflow, native selects, or enabled targets below 44×44.

Research basis:

- [Vaswani et al., Attention Is All You Need (2017)](https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html)
  grounds sinusoidal position, residual connections, normalization, and the
  shared position-wise two-layer ReLU FFN. The chapter preserves those component
  contracts while explicitly choosing one pre-norm ordering for its numbers.
- [Ba, Kiros, and Hinton, Layer Normalization (2016)](https://arxiv.org/abs/1607.06450)
  computes normalization statistics within one training case and applies learned
  gain and bias. The fixture's per-token feature statistics, gamma, beta, and
  epsilon stability probe make that boundary observable; batch statistics were
  not added because they would contradict the intended LayerNorm exercise.
- [Xiong et al., On Layer Normalization in the Transformer Architecture (2020)](https://proceedings.mlr.press/v119/xiong20b.html)
  distinguishes the original post-LN Transformer from pre-LN and studies their
  initialization gradients. This supports the chapter's explicit variant label;
  optimizer warm-up experiments were left out because this checkpoint is about
  exact forward assembly, not training dynamics.

### IMP-014 — Mini Transformer capstone round-trip learning pass

- Corrected the completion guidance to name the three core causal-block,
  LM-head, and generation challenges plus five questions. The English checklist
  no longer exposes the Korean `선택` marker, and the mobile prerequisite link
  now provides a 44px target.
- Exercised all five presets and 15 predictions through broken tokenizer,
  position, causal-mask, probability-axis, and prefix-recompute settings before
  repair. Required inspections recorded BOS ID `0`, `E+P[1,0]=0.841`, future
  attention weight `0`, target-token probability `0.382`, and generation-step-1
  dot probability `0.340`; all five presets and the three core challenges passed.
- Forced position scale outside the deterministic fixture range and recovered
  safely. The LM-head trace exposed shifted targets
  `the→cat→sat→.→EOS` and reduced loss `1.656→1.553` while updating only the
  vocabulary projection and bias.
- Ran the NumPy LM-head cell, forced a visible `NameError`, and reset. The
  generation repair reproduced fixed prefix length `3`, then a syntax error.
  Entering the instructed unindented replacement exposed a real guided-editor
  `IndentationError`; `NotebookCell` now preserves the original repair-line
  indentation and the same input passes with prefix lengths `3→4→5→6→7`.
- Executed all 14 candidates across four debugger incidents and restored 4/4.
  Selected all 15 concept choices, submitted an incorrect attempt, then recovered
  to 5/5 with Enter and Space. Lab, incident, debugger, and notebook resets
  returned deterministic initial state.
- At 390×844, immediate execution feedback remained beside the controls,
  width equaled scroll width, native selects were 0, and no enabled non-matrix
  target was below 44×44. KO/EN and preview-local previous navigation passed.

Research basis:

- [Vaswani et al., Attention Is All You Need (2017)](https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html)
  states that decoding is autoregressive, consumes previously generated symbols,
  masks subsequent positions, offsets decoder outputs by one, and converts
  decoder output to next-token probabilities with a learned linear transform and
  softmax. The chapter makes each of those boundaries numerically observable.
- [Radford et al., Improving Language Understanding by Generative Pre-Training
  (2018)](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf)
  formalizes the conditional next-token likelihood and a Transformer decoder
  followed by a vocabulary softmax. This supports the shifted-target loss and
  causal-prefix flow. Full-corpus pretraining, quality claims, sampling, tied
  embeddings, and KV-cache implementation were not added because this fixture
  deliberately proves boundary semantics rather than trained-model scale.

### IMP-015 — Boot-boundary diagnosis and real-kernel observation pass

- Corrected the completion checklist from four to the actual five concept
  questions and added a regression contract that counts the question specs.
  The shared concept submit action now handles Enter and Space through form
  submission, matching the already explicit answer-button keyboard contract.
- Predicted and observed missing-kernel and missing-shell stops, changed only
  their causal settings, and reached all four stages. Submitted an intentionally
  wrong first diagnosis, then paired all four earliest failed boundaries with
  their minimal repairs and recovered five wrong concept answers to 5/5.
- Booted the optional v86 Buildroot guest twice on desktop and once at 390×844,
  exercised start, reboot, stop, and restart, and ran `uname -a`, CPU inspection,
  `mount`, `ps`, root listing, and `cat /proc/cmdline`. The output kept PID 1,
  the serial shell, mounted root, and `console=ttyS0` observable without exposing
  a host shell or configuring an external network relay.
- Raised the prerequisite and v86 source links from 20px and 18px to 44px. The
  post-fix 390×844 audit found width equal to scroll width, zero native selects,
  and zero enabled targets below 44×44; desktop remained 1280px wide with no
  document overflow or console errors.

Research basis:

- [Linux kernel: explaining “No working init found”](https://docs.kernel.org/admin-guide/init.html)
  orders root filesystem, init presence, console, dependencies, architecture,
  and interpreter failures roughly by execution. This supports the chapter's
  last-good-marker diagnosis and its explicit rootfs→init boundary. Library and
  architecture mismatch incidents were not added because the current exercise
  is deliberately the smallest four-boundary model.
- [Linux kernel command-line parameters](https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html)
  documents how unrecognized arguments are passed to init and how the live
  command line is exposed through `/proc/cmdline`. The optional guest therefore
  observes that file beside the deterministic model instead of treating the
  modeled settings as a verbatim distro boot configuration.
- [copy/v86 source and documentation](https://github.com/copy/v86) identifies
  v86 as an x86 PC emulator with an x86-to-WebAssembly JIT, lists Buildroot as a
  supported minimal Linux path, and notes its 32-bit/feature limits. The chapter
  keeps it optional, reports the download and boot time, disables guest keyboard
  and mouse input, and leaves networking without a relay/backend.
- [First Edition UNIX `init` manual (1971), TUHS archive](https://www.tuhs.org/Archive/Distributions/Research/Dennis_v1/UNIX_ProgrammersManual_Nov71.pdf)
  describes init as the last boot step that creates terminal login processes.
  This historical continuity supports teaching init as a userspace handoff, but
  its typewriter-specific recovery duties were omitted because they do not
  transfer to this fixed BusyBox serial-console guest.

### IMP-016 — Process lifecycle and state-recovery learning pass

- Exercised both fork/exec predictions through an explicit wrong explanation,
  then created PID 73 with terminal stdout and PID 74 with redirected stdout.
  Predicted and observed deterministic 73→74 worker turns, excluded PID 73 while
  stopped, resumed that same PID, observed both terminal and `out.log` output,
  moved both children through Z, and reaped both with `waitpid`.
- Clicked every action candidate in all four state incidents. Reproduced an
  unproductive tick for T, empty pipe input for S, a signal sent to Z, and an
  ignored TERM before solving T→R→tick, input→R→tick→S, Z→wait, and
  KILL→Z(137)→wait. Submitted five wrong concepts and recovered to 5/5.
- Reproduced a cross-viewport accessibility gap: all four per-incident retry
  controls measured 28px high on desktop and mobile. A chapter-scoped style now
  makes each one 44px without enlarging unrelated text links. The post-fix
  390×844 page remained 390px wide, had zero native selects, and retained
  immediate local feedback.

Research basis:

- [POSIX.1-2024 `fork`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/fork.html)
  specifies an independently executable child and the characteristic parent/
  child return paths; [POSIX.1-2024 `exec`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/exec.html)
  defines replacement of the process image. The chapter's common external-
  command fork→exec boundary is accurate and already warns that built-ins and
  `posix_spawn` are different implementation paths.
- [Linux `proc_pid_stat(5)`](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html)
  defines R, S, T, and Z as running/runnable, interruptible sleep, signal stop,
  and zombie; [Linux `wait(2)`](https://man7.org/linux/man-pages/man2/waitpid.2.html)
  confirms that waiting collects child state and releases termination
  resources. These are exactly the four visible diagnosis contracts.
- [Linux `signal(7)`](https://man7.org/linux/man-pages/man7/signal.7.html)
  distinguishes signal disposition, blocking/pending state, STOP/CONT behavior,
  and blocking I/O interruption. The beginner model deliberately omits signal
  masks, handlers, real-time signals, process groups, and EINTR/SA_RESTART;
  adding those here would weaken the state-observation checkpoint.
- [Second Edition UNIX Programmer's Manual (1972), TUHS archive](https://www.tuhs.org/Archive/Distributions/Research/1972_stuff/unix_2nd_edition_manual.pdf)
  already indexed `fork(II)`, `exec(II)`, and `wait(II)`. That continuity is why
  the chapter keeps create→replace→collect as its causal spine, while avoiding
  historical implementation details that do not transfer to current Linux.

### IMP-017 — Permission decision and least-privilege learning pass

- Exercised all four broken policy presets, every actor, operation, prediction,
  and chmod target. An incorrect ALLOW prediction exposed the first denial at
  `/srv/release` group x; a correct DENY recorded that boundary. Invalid `888`
  and `g+z`, a no-op `u+r`, and file `777` each produced a distinct visible next
  action before `g+rx` and exact `640` completed the 0750/0640 policy.
- Audited all 16 repair candidates across four incidents. Twelve incomplete or
  overgranting changes failed before directory g+x, parent g-w, file chgrp to
  reviewers, and private group execute produced the four intended contracts.
  Individual and global resets returned deterministic state. Five intentionally
  wrong concepts recovered to 5/5 with Enter and Space.
- Reproduced one mobile accessibility gap: the prerequisite handoff to the
  process chapter measured 17px high. Its chapter-scoped target is now 44px. At
  390×844 the page stayed 390px wide with zero native selects and zero enabled
  targets below 44×44; the complete policy, incident, concept, KO/EN, focus, and
  neighbor-navigation flows remained usable.

Research basis:

- [POSIX.1-2024 file access permissions](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap04.html)
  defines owner, group, and other permission classes and requires the requested
  read, write, or execute/search bit in the selected class. The chapter's
  one-class decision and explicit required denials match that contract.
- [Linux `path_resolution(7)`](https://man7.org/linux/man-pages/man7/path_resolution.7.html)
  returns EACCES when a nonfinal component lacks search permission, selects the
  group class using effective or supplementary groups, and distinguishes file
  execute from directory search. This directly validates the first-failure
  trace and the deliberate fsuid/fsgid caveat already present in the chapter.
- [Linux kernel credentials documentation](https://docs.kernel.org/security/credentials.html)
  stores task UID, GID, groups, keys, capabilities, and LSM state in credentials
  and compares task context with filesystem UID/GID/mode plus ACL/LSM markings.
  Capabilities, ACLs, LSMs, set-ID/sticky bits, and keyrings remain explicitly
  out of scope so the executable fixture stays a basic rwx checkpoint.
- [Second Edition UNIX `chmod` manual (1972), TUHS archive](https://www.tuhs.org/Archive/Distributions/Research/1972_stuff/unix_2nd_edition_manual.pdf)
  documents octal chmod as an early Unix interface. The chapter preserves that
  historically stable octal model while adding current symbolic chmod and
  least-privilege outcome checks rather than copying historical command prose.

### IMP-018 — Virtual-address translation and memory-fault learning pass

- Exercised every process, operation, prediction, and scenario preset. Invalid
  address, missing prediction, out-of-range byte, an incorrect mapped-access
  prediction, protection fault, and unmapped SIGSEGV each produced a distinct
  immediate explanation. The required path then preserved offset 0x018 through
  translation, split the child's COW page while keeping parent value 41, and
  allocated a demand-zero page before completing all five causal evidence rows.
- Entered incorrect numeric/state evidence in all four debugger incidents before
  repairing VPN 0x2 + offset 0xabc → PA 0x9abc, a present-PTE TLB miss, distinct
  parent/child COW frames and values, and six mapped versus three resident pages.
  Global reset returned 0/4 and the same inputs returned 4/4. All 15 concept
  choices were clicked; five wrong answers recovered to 5/5 with Enter and Space.
- Reproduced a cross-viewport accessibility gap: the prerequisite handoff link
  measured 20px high on desktop and mobile. A chapter-scoped rule now makes it
  44px. At 390×844 the page stayed 390px wide with zero native selects and zero
  enabled targets below 44×44; the full prediction, incident, concept, bilingual,
  focus, disclosure, and navigation flows remained usable.

Research basis:

- [POSIX.1-2024 `mmap`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/mmap.html)
  defines process-address-space mappings, page-granular protections, and
  MAP_PRIVATE versus MAP_SHARED write disposition. The chapter correctly treats
  p/s as a mapping contract and does not promise a particular private-mapping
  implementation beyond the Linux COW observation.
- [Linux kernel process-address documentation](https://docs.kernel.org/6.15/mm/process_addrs.html)
  gives each VMA one address space, separates VMA metadata from page-table state,
  and says page-table leaves provide physical pages or special markers while the
  virtual address supplies page offsets. This validates the chapter's explicit
  VMA/PTE separation and preserved-offset calculation.
- [Linux page-table documentation](https://docs.kernel.org/next/mm/page_tables.html)
  distinguishes TLB lookup, page walk, permissions, expected lazy-allocation/COW
  faults, and invalid-access SIGSEGV. The executable model keeps those boundaries
  separate rather than presenting every TLB miss or page fault as fatal.
- [`proc_pid_maps(5)`](https://man7.org/linux/man-pages/man5/proc_pid_maps.5.html)
  exposes mapped regions and permissions, while [`mincore(2)`](https://man7.org/linux/man-pages/man2/mincore.2.html)
  reports a transient per-page residency snapshot. Kernel
  [`pagemap` documentation](https://docs.kernel.org/admin-guide/mm/pagemap.html)
  also confirms PFNs are restricted without CAP_SYS_ADMIN. These sources support
  keeping residency and PFNs out of `maps` and making privileged PFN inspection
  optional rather than a completion requirement.
- Kilburn, Edwards, Lanigan, and Sumner's 1962
  [“One-Level Storage System”](https://www.chilton-computing.org.uk/acl/pdfs/atlas-1-level.pdf)
  describes the Atlas automatic core/drum address-space mechanism that preceded
  modern paged virtual memory. The chapter retains its transferable automatic
  address-translation insight but omits Atlas-specific drum, learning-program,
  and scheduling machinery from this beginner Linux checkpoint.

### IMP-019 — Path, inode, lifetime, and durability learning pass

- Exercised the mounted and unmounted namespace presets, incomplete and wrong
  path predictions, the exact 0x1340 → logical block 1 + 0x340 → device block
  44 → 0x2c340 calculation, hard-link creation, unlink survival, missing and
  wrong crash predictions, dirty loss, and a new fsynced write that survived.
  The lab rejected replaying the old durable value and required another write.
- Entered wrong state in every incident before repairing mount shadowing, zero
  free inodes with 128 free blocks, link-count zero with one open reference,
  and write temp → fsync temp → rename → fsync parent. Global reset returned
  4/4 to 0/4 and deterministic re-entry restored 4/4. All 15 concept choices
  were clicked; five wrong answers recovered to 5/5 with Enter and Space.
- Reproduced a completion defect where all five lab evidence rows and the local
  mastery banner were complete but the parent checklist stayed unchecked. The
  parent now derives its signal from the same mastery predicate. A chapter-scoped
  rule also raises the prerequisite handoff from 20px to at least 44px. Desktop
  and 390×844 now show all three completion rows checked, no horizontal overflow,
  no native select, no console error, and no undersized enabled mobile target.

Research basis:

- [Linux `path_resolution(7)`](https://man7.org/linux/man-pages/man7/path_resolution.7.html)
  describes component-by-component lookup from the process root, matching the
  fixture's explicit directory-entry and mount-crossing trace.
- [Linux VFS documentation](https://docs.kernel.org/filesystems/vfs.html)
  separates dentries, inodes, file objects, open-file lifetime, and page-cache
  dirty state. This validates keeping pathname identity, inode identity, open
  references, and persisted bytes as independently visible state.
- Linux [`link(2)`](https://man7.org/linux/man-pages/man2/link.2.html) and
  [`unlink(2)`](https://man7.org/linux/man-pages/man2/unlink.2.html) confirm that
  hard-link names have equal status and that the last unlink does not reclaim an
  object while a descriptor remains open.
- Linux [`rename(2)`](https://man7.org/linux/man-pages/man2/rename.2.html) gives
  atomic destination replacement, while [`fsync(2)`](https://man7.org/linux/man-pages/man2/fsync.2.html)
  explicitly requires a separate directory fsync to persist its entry. The
  activity therefore makes atomic visibility and crash durability separate
  predictions instead of teaching rename as a durability guarantee.
- Ritchie and Thompson's 1974
  [“The UNIX Time-Sharing System”](https://www.bell-labs.com/usr/dmr/www/cacm.pdf)
  describes directories as name-to-file mappings, root-to-component pathname
  traversal, and equal-status links. The chapter preserves that durable mental
  model while omitting filesystem-specific journal modes, delayed allocation,
  RAID/SSD internals, cross-filesystem rename, and mount-namespace isolation
  from this smallest deterministic checkpoint.

### IMP-020 — Packet, socket, route, and delivery-boundary learning pass

- Exercised missing, incorrect, and correct five-part predictions, causal-order
  guidance, an intentionally wrong first-segment loss, deterministic reset,
  deliver/drop/deliver, RTO recovery, all four layer tabs, and accepted-fd
  `recv`. The resulting trace kept fd 4 process-local, selected the direct /24
  and remote /0 paths, preserved the remote IP behind the gateway MAC, held the
  cumulative ACK at 2461 across the gap, then advanced to 4001 after replay.
- Entered incomplete and wrong state before repairing longest-prefix routing,
  next-hop frame addressing and TTL, the ACK gap, and listener-versus-service
  delivery. Individual and global resets preserved focus and returned 4/4 to
  3/4 and 0/4 before deterministic replay restored 4/4. Five wrong concepts
  recovered to the completed chapter gate with Enter and Space.
- Reproduced the prerequisite handoff at 19.5px on both viewports. A
  chapter-scoped inline-flex rule now guarantees 44px, backed by a source
  regression. Desktop and 390×844 show all three completion rows checked, no
  horizontal overflow, no native select, no console error, and no undersized
  enabled mobile target.

Research basis:

- [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html) defines TCP as a
  sequenced byte stream, makes ACK X cumulative through X-1, and gives SYN one
  sequence number. This validates the fixture's 1001 start, 2461 gap ACK, and
  4001 cumulative recovery without teaching packet-count ACKs.
- [RFC 791](https://www.rfc-editor.org/rfc/rfc791.html) keeps the destination in
  the IP header and decrements TTL as gateways process a datagram, while
  [RFC 826](https://www.rfc-editor.org/rfc/rfc826.html) resolves a local next
  hop's protocol address to a link address. These support preserving the remote
  IP while rebuilding the first-hop frame for the gateway.
- Linux [`socket(2)`](https://man7.org/linux/man-pages/man2/socket.2.html),
  [`accept(2)`](https://man7.org/linux/man-pages/man2/accept.2.html),
  [`send(2)`](https://man7.org/linux/man-pages/man2/sendto.2.html), and
  [`recv(2)`](https://man7.org/linux/man-pages/man2/recvmsg.2.html) separate the
  process fd, accepted connected fd, local send success, and application
  receive. [`ip-route(8)`](https://man7.org/linux/man-pages/man8/ip-route.8.html)
  confirms longest-prefix selection and lower-metric preference.
- DNS wire exchange, IPv6, NAT, firewalls, TLS, congestion control, PMTUD, TCP
  options, and general nonblocking/partial-I/O behavior remain out of this
  smallest deterministic IPv4 checkpoint. The chapter names those omissions
  and retains only a brief real-world nonblocking/partial-send caveat.

### IMP-021 — Tiny Linux cross-layer assembly learning pass

- Exercised the required fixture from an intentionally wrong `served`
  prediction through `/init` execute, default-route, and report-group-read
  failures. Each one-value repair was predicted before rerun, and rootfs, PID 1,
  listener, report-read, and remote-recv probes were recorded separately.
- Replayed missing-kernel, missing-initramfs, and healthy observations; entered
  incomplete and wrong incident state before repairing init handoff, zombie
  collection and restart, least-privilege report access, and listener versus
  accepted-fd delivery. Global reset returned 4/4 to 0/4 before deterministic
  replay. Five wrong concepts recovered to 5/5 with Enter and Space.
- Booted the optional fixed Buildroot guest in v86, ran `uname`, CPU, mount,
  process, and root-directory commands plus manual `/proc/cmdline`, then tested
  reboot. This remained optional and made no host-filesystem or external-network
  claim. The prerequisite and source links grew from 19.5px and 18.1px to 44px;
  desktop and 390×844 then had no overflow, native select, console error, or
  undersized enabled target.

Research basis:

- Linux kernel [initramfs buffer documentation](https://docs.kernel.org/next/driver-api/early-userspace/buffer-format.html)
  defines the CPIO archive expanded into ramfs and preserves file type and mode
  in `c_mode`. The [init failure guide](https://docs.kernel.org/6.12/admin-guide/init.html)
  separates absent init, unavailable dependencies, and root/filesystem support.
  These validate the chapter's artifact manifest, executable-mode, and first
  failed-boundary model rather than treating a visible shell as full readiness.
- Linux [`execve(2)`](https://man7.org/linux/man-pages/man2/execve.2.html),
  [`wait(2)`](https://man7.org/linux/man-pages/man2/waitpid.2.html), and
  [`credentials(7)`](https://man7.org/linux/man-pages/man7/credentials.7.html)
  support the PID-preserving exec, zombie collection, and effective identity
  contracts. [`open(2)`](https://man7.org/linux/man-pages/man2/open.2.html) and
  [`accept(2)`](https://man7.org/linux/man-pages/man2/accept.2.html) support
  keeping report-file, listener, and accepted connection descriptors distinct.
- The [Buildroot manual](https://buildroot.org/downloads/manual/manual.html)
  treats toolchain, kernel, bootloader, and root filesystem as independently
  generated artifacts. The [v86 repository](https://github.com/copy/v86)
  documents a browser x86-to-WebAssembly JIT and externally loaded images. The
  chapter therefore labels its fixed image as an observation aid, not an
  in-browser Buildroot pipeline or proof of an external network path.
- Ritchie and Thompson's 1974
  [“The UNIX Time-Sharing System”](https://www.bell-labs.com/usr/dmr/www/cacm.pdf)
  supplies the durable fork/exec, process, file, and descriptor ancestry behind
  the activity. Full cross-compilation, firmware and bootloader authoring,
  dynamic-linker repair, systemd, DHCP/DNS, VM snapshots, and network relays
  remain outside this smallest deterministic assembly checkpoint.

### IMP-022 — Interfaces, addresses, and loopback boundary pass

- Exercised two incorrect and one correct delivery-boundary predictions before
  unlocking the state model, then advanced through observe, Ethernet admin-up,
  address assignment, loopback-up, successful localhost delivery, and the
  loopback-down counterfactual. Home and End moved focus with the selected
  phase, and every state transition displayed the nearby command result.
- Clicked every repair in all four incidents, preserving three visible failures
  before each correct repair, reset 4/4 to 0/4, and replayed the four correct
  boundaries. Five intentionally wrong concept answers recovered to 5/5 with
  Enter and Space and checked all three completion outputs on desktop and
  mobile.
- Reproduced reset focus falling to the document body when the command list was
  removed. Reset now waits for the replacement prediction group and focuses its
  first direct choice; a source regression and both browser viewports confirm
  the repair. At 390×844 the chapter has no horizontal overflow, native select,
  or enabled target below 44px.

Research basis:

- The Linux kernel [operational-state documentation](https://docs.kernel.org/networking/operstates.html)
  distinguishes administrator intent from operational readiness and carrier.
  This validates showing `ip link set ... up` while Ethernet remains unable to
  carry user data.
- Linux [`ip-link(8)`](https://man7.org/linux/man-pages/man8/ip-link.8.html),
  [`ip-address(8)`](https://man7.org/linux/man-pages/man8/ip-address.8.html), and
  [`ip-route(8)`](https://man7.org/linux/man-pages/man8/ip-route.8.html) keep
  device state, protocol addresses/prefix lengths, and routing entries as
  separately inspectable objects, matching the activity's one-boundary-at-a-time
  evidence.
- [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122.html) defines 127/8 as
  internal host loopback that must not appear outside the host, while
  [RFC 6761](https://www.rfc-editor.org/rfc/rfc6761.html) specifies localhost
  name handling. Their separation supports the counterfactual where the name
  resolves but the down loopback device prevents delivery.
- Historical [RFC 950](https://www.rfc-editor.org/rfc/rfc950.html) supplies the
  subnet-mask lineage, but subnet arithmetic, neighbor discovery, and gateway
  selection remain in the next chapter. IPv6 `::1`, multiple addresses and
  scopes, DAD/tentative state, network managers, namespaces, VRFs, and policy
  routing also remain outside this smallest deterministic checkpoint.

### IMP-023 — Subnets, neighbors, and gateways boundary pass

- Exercised both incorrect next-hop predictions before choosing the reachable
  on-link gateway, then advanced through prefix inspection, direct peer ARP,
  peer frame delivery, default-gateway selection, remote frame delivery, and
  the missing-default counterfactual. Every command result stayed beside the
  affected next-hop, Ethernet-destination, and IP-destination evidence.
- Clicked every repair for all four incidents so each kept three visible wrong
  boundaries before the exact prefix, neighbor, default-route, or gateway
  repair. Reset and deterministic replay restored the six-phase lab. Five
  deliberately wrong concepts recovered to 5/5 with Enter and Space on desktop
  and mobile, and all three completion outputs became checked.
- Reproduced the only chapter-local small target: reset was 42×68px on desktop
  and 310×40px at 390×844. It now has a scoped 44px minimum width and 44px
  mobile height with a source regression. Both viewports have no horizontal
  overflow, native select, console error, or enabled target below 44px after
  repair.

Research basis:

- Historical [RFC 950](https://www.rfc-editor.org/rfc/rfc950.html) supplies the
  address-mask/subnet lineage. [RFC 4632](https://www.rfc-editor.org/rfc/rfc4632.html)
  requires explicit classless prefix lengths and identifies `0.0.0.0/0` as the
  default route. These support the chapter's explicit `/24` boundary and
  missing-default counterfactual without reintroducing classful inference.
- [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122.html) separates destination
  from selected first hop: a connected destination is sent directly, otherwise
  a gateway on a connected network is chosen. [RFC 826](https://www.rfc-editor.org/rfc/rfc826.html)
  maps the chosen local protocol address to an Ethernet address. Together they
  validate keeping remote IP `203.0.113.20` while ARPing `10.20.0.1` and using
  the gateway MAC for the frame.
- Linux [`ip-route(8)`](https://man7.org/linux/man-pages/man8/ip-route.8.html)
  confirms that `ip route get` resolves the path as the kernel sees it and that
  a default route's gateway must be reachable on its device. Linux
  [`ip-neighbour(8)`](https://man7.org/linux/man-pages/man8/ip-neighbour.8.html)
  defines the neighbor table as protocol-to-link-address bindings for the same
  link, matching the chapter's separate route and neighbor probes.
- The existing deterministic checkpoint already covers the smallest useful
  prediction → route → ARP → frame → failure → repair loop, so no extra prose
  was added. Arbitrary/overlapping prefixes and longest match continue in the
  next chapter; IPv6 NDP, proxy ARP, point-to-point links, full NUD transitions,
  policy routing, multiple interfaces, and VRFs remain deliberately deferred.

### IMP-024 — Routes and packet paths boundary pass

- Exercised both incorrect route-decision predictions before selecting the
  longest prefix, then advanced through route listing, longest-prefix choice,
  equal-prefix metric tie-break, first-link frame, router forwarding, and TTL
  expiry. Each phase kept the selected prefix, next hop, link destination,
  final IP destination, and command output together.
- Clicked all three choices in each of three incidents and left the minimal
  route, metric, or forwarding repair selected last. The shared incident lab
  had no reset, so a bilingual 44px control now clears only repair state. It
  remains enabled at 0/3 because disabling the focused control moved focus to
  the document body; reset now stays focused at both viewports.
- Five deliberately wrong concepts exposed their answers and recovered to 5/5
  with Enter and Space. All three completion outputs, KO/EN, seven section
  anchors, transfer, previous/next, catalog, and draft/public boundaries passed.
  Desktop measured 1280/1280 and mobile 390/390 with no native select or console
  error; mobile had no enabled target below 44px.

Research basis:

- Historical [RFC 1812](https://www.rfc-editor.org/rfc/rfc1812.html) orders
  forwarding lookup as basic match, longest match, then best metric, and
  requires a router to decrement TTL and return ICMP Time Exceeded when it
  reaches zero. This supports the chapter's prefix-before-metric model and
  deterministic TTL-1 failure.
- [RFC 4632](https://www.rfc-editor.org/rfc/rfc4632.html) preserves longest-match
  forwarding and defines `0.0.0.0/0` as the default route. Linux
  [`ip-route(8)`](https://man7.org/linux/man-pages/man8/ip-route.8.html) confirms
  lower metric values are preferred and `ip route get` resolves one destination
  exactly as the kernel sees it without sending a packet.
- The current interaction already supplies the smallest useful prediction →
  lookup → frame → TTL → repair loop, so no explanatory prose was added. Policy
  routing and RPDB rules, ECMP/nexthop groups, VRFs, IPv6 hop limit, PMTUD,
  redirects, dynamic routing protocols, and ICMP filtering remain deliberately
  deferred to later infrastructure or advanced-networking work.

### IMP-025 — Sockets, ports, and TCP boundary pass

- Corrected the shared executable figure so locked evidence reports `0 / 6`
  executed states rather than exposing the internally selected first phase as
  learner progress. The first visible state now counts only after the correct
  prediction unlocks its path, verdict, and terminal output.
- Exercised both incorrect application-delivery predictions before confirming
  `recv`, then ran all six listener → connect → accept → send → ACK → recv
  states. The visible evidence kept listener fd 3 distinct from accepted fd 4,
  identified the connection by its 4-tuple, and separated peer-kernel ACK from
  application delivery.
- Clicked all three choices in each of three incidents, verified immediate
  evidence-bound failure, selected the minimal listener, recv-loop, and port
  conflict repairs, then reset and replayed them. All fifteen concept choices
  were exercised before an incorrect submission recovered to 5/5.
- KO/EN through Enter and Space, all seven section anchors, Infrastructure
  transfer, previous/next, audit catalog, and draft/public boundaries passed.
  Desktop measured 1280/1280 and mobile 390/390 with no native selects,
  horizontal overflow, console errors, or enabled targets below 44px.

### IMP-026 — Infrastructure prerequisite touch-target repair

- Expanded the Network Namespaces prerequisite link from a 20px text target to
  a 44px-minimum inline action without adding a card, dropdown, or extra copy.
- At 390×844 the link now measures 236×53px; the page has no horizontal
  overflow, native selects, enabled targets below 44px, or console errors.
- Added a focused source regression. The chapter remains in the audit queue
  because this repair does not substitute for its full interaction pass.

### IMP-027 — DNS and service-reachability boundary pass

- Exercised both incorrect post-DNS predictions before selecting route/TCP,
  then ran cache miss → DNS answer → cache hit → route → TCP connect → response.
  The final command now keeps the response body and appends the HTTP code, so
  `status=ok` and `HTTP 200` visibly support the end-to-end claim.
- Clicked all three choices in each of the three incidents, observed failure
  feedback, applied the minimal authoritative-record, cache-entry, and listener
  repairs, reset with retained focus, and replayed the correct path. All
  fifteen concept choices were exercised before five errors recovered to 5/5.
- Reclassified the chapter compass from compare-and-tune to
  predict-and-repair, matching the actual completion path. KO/EN through Enter
  and Space, all seven anchors, Infrastructure transfer, previous/next, audit
  catalog, and draft/public boundaries passed at 1280 and 390×844 with no
  console errors, horizontal overflow, native selects, or enabled mobile
  targets below 44px.

Research basis:

- [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034/) defines the resolver as
  the interface between user programs and name servers and describes answering
  from cached prior results before querying servers. The chapter preserves this
  resolver/cache boundary without adding recursive-query internals.
- [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035/) defines TTL as the
  interval before the source should be consulted again. [RFC 8767](https://www.rfc-editor.org/rfc/rfc8767.html)
  permits an explicit serve-stale exception when authoritative refresh fails,
  so the concept check now asks when the resolver must reconsult the source
  rather than calling TTL an unconditional maximum reuse time.
- The official [curl man page](https://curl.se/docs/manpage.html#-w) states that
  `--write-out` emits transfer metadata such as the response code after the
  transfer. Keeping the body on stdout and adding the code makes the learner's
  response proof match the visible command output.
- Negative-cache TTL policy, CNAME chains, DNSSEC validation, EDNS, transport
  fallback, and resolver-specific cache eviction were not added. They would
  obscure this chapter's required name → route → TCP → application diagnostic
  output and belong in a later DNS operations extension.

### IMP-028 — Linux network diagnosis boundary pass

- Exercised both wrong observation-point predictions before fixing symptom
  scope, then ran link/address → route/neighbor → packet location → listener →
  name → response. The final command now prints `{"status":"ok"}` beside
  `HTTP 200`, keeping the observable terminal evidence aligned with its fact
  card and end-to-end verdict.
- Clicked all three repair choices in each of four incidents, observed the
  evidence-bound failure guidance, applied the minimal address/listener,
  return-route, application-health, and capture-interface repairs, reset, and
  replayed the correct path. All fifteen concept choices were exercised before
  five deliberate errors recovered to 5/5.
- KO/EN, all seven anchors, Infrastructure transfer, previous/next, audit
  catalog, and draft/public boundaries passed at 1280 and 390×844. Both
  viewports had no horizontal overflow or native selects; mobile had no enabled
  target below 44px, and the browser console had no errors.

Research basis:

- Linux [`ip-route(8)`](https://man7.org/linux/man-pages/man8/ip-route.8.html)
  defines `ip route get` as resolving one route exactly as the kernel sees it
  without sending a packet. That supports selecting the actual egress before
  interpreting capture silence.
- The upstream [`tcpdump(1)` manual](https://man7.org/linux/man-pages/man1/tcpdump.1.html)
  makes both capture interface and filter expression part of the observation
  contract. The chapter therefore keeps “no packet” bounded until both match
  the selected path.
- The official [curl man page](https://curl.se/docs/manpage.html#-w) documents
  `--write-out` and its response-code variable. Appending that field is the
  smallest repair for the unobserved-status gap.
- Full BPF syntax, pcap persistence, policy routing, VRFs, conntrack, TLS
  validation, retransmission timing, and production telemetry were not added.
  They would blur this foundation chapter's first-failed-boundary loop and
  belong in later infrastructure and operations work.

### IMP-029 — Network-namespace ownership and placement pass

- Exercised the prediction disclosure, all four ownership-story phases, three
  topology presets, every editable process/probe/listener across host, app, and
  data views, both loopback switches, missing/wrong/correct predictions,
  failure/retry paths, all eight incident choices with reset/replay, and all
  fifteen concept choices before five deliberate errors recovered to 5/5.
- Corrected a contradiction between the ownership story and the required lab.
  The story and socket incident correctly kept an existing socket in its
  creation namespace after `setns()`, but the topology editor called design
  placement “moving.” Process and probe controls now say “Place”; listener
  controls say “Create or recreate”; map buttons expose “Select placement.”
- KO/EN through Enter and Space, all nine anchors, transfer, previous/next,
  audit catalog, and draft/public boundaries passed at 1280 and 390×844.
  Both viewports had no horizontal overflow or native selects; mobile had no
  enabled target below 44px, and the browser console had no errors.

Research basis:

- Linux [`network_namespaces(7)`](https://man7.org/linux/man-pages/man7/network_namespaces.7.html)
  defines network namespaces as isolation for devices, protocol stacks, route
  tables, port numbers, and sockets; a physical network device belongs to
  exactly one network namespace. This supports drawing independent loopback
  and socket-table boundaries rather than a shared localhost.
- Linux [`setns(2)`](https://man7.org/linux/man-pages/man2/setns.2.html)
  describes reassociating the calling thread with a target namespace. Kernel
  [networking API documentation](https://docs.kernel.org/networking/kapi.html)
  separately models socket creation with an applicable `struct net` and
  describes a socket as a member of a network namespace. Together these
  support listener recreation in the destination view, not a claim that an
  existing socket follows the thread.
- Socket descriptor passing across namespaces, NSID, per-namespace sysctls,
  netlink monitoring, user-namespace capability details, and persistent
  namespace bind mounts remain deferred. They do not improve this chapter's
  required predict → place → execute → inspect → repair learning output.

### IMP-030 — veth, bridge, and routed-return-path pass

- Exercised bridge and router mode at desktop and 390×844, including every
  peer target, address, route, forwarding/link/listener switch transition,
  missing and incorrect prediction, first-failure result, correct round trip,
  mode reset with focus retention, and replay. Both modes reached the required
  2/2 completion state.
- Clicked both repairs in all four incidents, observed failure feedback before
  each minimal repair, reset with retained focus, and replayed 4/4. All fifteen
  concept options were exercised before five deliberate errors recovered to
  5/5. KO/EN preserved all four completion outputs.
- Replaced answer-shaped connected-route constants with prefixes derived from
  the current client and app interface addresses. The scaffold now truthfully
  shows app `10.30.0.2/24` with `10.30.0.0/24 dev eth0`, then updates to
  `10.20.0.0/24` when the learner chooses `10.20.0.3/24`.
- All nine anchors, home, previous/next, audit catalog, and draft/public
  boundaries passed. Both viewports had no horizontal overflow, native
  selects, or console errors; mobile had no enabled target below 44px.

Research basis:

- Linux [`veth(4)`](https://man7.org/linux/man-pages/man4/veth.4.html)
  defines a pair as two devices where packets transmitted on one are received
  by the other, supports placing the ends in separate network namespaces, and
  states that either endpoint being down makes the pair link down. This matches
  the lab's two-owner and paired-link-state model.
- Linux [`ip-address(8)`](https://man7.org/linux/man-pages/man8/ip-address.8.html)
  defines an address prefix and documents the automatically associated prefix
  route, with `noprefixroute` as the explicit exception. This is the basis for
  deriving each displayed connected route from the current address rather
  than from the mode's target answer.
- Linux [`ip-route(8)`](https://man7.org/linux/man-pages/man8/ip-route.8.html)
  distinguishes route prefixes and link scope and documents `onlink` as an
  explicit override that pretends a nexthop is directly attached. The chapter
  therefore keeps the ordinary gateway on the selected interface prefix and
  treats `10.99.0.1` as off-link.
- STP tuning, VLAN filtering, bridge FDB aging, multicast snooping, policy
  routing, ECMP, IPv6 neighbor discovery, MTU/PMTUD, and NAT remain deferred.
  They do not improve this chapter's required veth → transit → forward →
  return-path learning output.

### IMP-031 — Egress NAT and conntrack-state pass

- Exercised all three packet predictions and every client, router, NAT,
  listener, upstream-route, conntrack, and reply-router control at desktop and
  390×844. Reproduced all forward, translation, and return failure boundaries,
  completed fixed SNAT and dynamic MASQUERADE, reset/replayed the dynamic mode,
  and preserved both outputs through KO/EN.
- Clicked both repairs in all four incidents, observed the wrong repair fail,
  selected each minimal repair, reset, and replayed 4/4. All fifteen concept
  options were exercised before five deliberate errors recovered to 5/5.
- Corrected the live conntrack entry from `ESTABLISHED` to `NEW` when only the
  translated request direction reached the original NAT router. A completed
  reply through that same router still promotes the entry to `ESTABLISHED`, so
  the command evidence, router node, and stage timeline now agree.
- All nine anchors, home, previous/next, audit catalog, and draft/public
  boundaries passed. Both viewports had no horizontal overflow, native
  selects, or console errors; mobile had no enabled target below 44px.

Research basis:

- The official nftables
  [NAT documentation](https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29)
  states that the first packet selects a NAT rule and establishes a binding,
  while later packets reuse that binding. This supports creating the entry on
  the original direction without calling it bidirectionally established.
- The nftables
  [conntrack metadata documentation](https://wiki.nftables.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation)
  defines `new` as valid traffic seen in one direction and `established` as
  valid traffic seen in both directions; `seen-reply` likewise records both
  directions. The current nftables
  [man page](https://netfilter.org/projects/nftables/manpage.html)
  preserves the distinct `new`, `established`, original/reply direction, and
  `seen-reply` metadata.
- The historical Netfilter
  [Linux 2.4 packet-filtering HOWTO](https://netfilter.org/documentation/HOWTO/packet-filtering-HOWTO-7.html)
  already separated a connection-creating `NEW` packet from a reply packet or
  an outgoing packet on a connection that has seen replies. The chapter keeps
  that long-standing distinction while using current nftables terminology.
- NAT pools, port-randomization flags, conntrack zones, helpers, timeout
  tuning, state replication, IPv6 NAT, and stateless NAT remain deferred. They
  do not improve this chapter's required route → translate → reply → restore
  output.

### IMP-032 — Network policy and firewall pass

- Exercised forward/input modes, every policy choice, all failures and retries,
  incidents, concepts, resets, anchors, bilingual state, and navigation at both
  viewports. Both modes reached 2/2; incidents reached 4/4; concepts reached
  5/5, with no select, horizontal overflow, or undersized mobile target.
- Replaced learner-visible `established,related` rules with `established`
  because the deterministic probes contain no related flow. The official
  nftables [conntrack-state reference](https://wiki.nftables.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation)
  distinguishes an established bidirectional connection from a related
  connection such as an expected FTP data channel.

### IMP-033 — Service discovery and load-balancing pass

- Exercised exact TTL expiry, old-VIP retirement, health membership, algorithms,
  affinity, both modes, all failure/retry paths, and all shared interactions.
- Scoped the deterministic TTL refresh to a reachable authority with
  serve-stale disabled. [RFC 8767](https://www.rfc-editor.org/rfc/rfc8767.html)
  permits limited stale reuse when refresh fails; historical
  [RFC 1794](https://datatracker.ietf.org/doc/html/rfc1794) remains useful
  context for DNS-based load distribution without changing this chapter's
  smaller name → cache → VIP → backend output.

### IMP-034 — Availability and failure-domain pass

- Exercised all placements, failover extremes, frontend/dependency recovery,
  incidents, concepts, and navigation. The 20-second failover now immediately
  updates request loss and availability, and the mobile range target is 44px.
- Kept the lab focused on correlated failure and surviving capacity, consistent
  with the Google SRE discussion of
  [cascading failures](https://sre.google/sre-book/addressing-cascading-failures/);
  quorum protocols, multi-region data consistency, and probabilistic reliability
  modelling remain deferred.

### IMP-035 — Network observability and capacity pass

- Aligned route, counter, capture, and socket evidence with their namespaces
  and claims, then exercised every bandwidth, queue, and connection plan,
  including wrong prediction/plan feedback and 4/4 recovery.
- Corrected “70% headroom” to the actual 30% headroom implied by a 70%
  utilization ceiling. Brendan Gregg's
  [USE method](https://www.brendangregg.com/usemethod.html) supports keeping
  utilization, saturation, and errors distinct rather than treating one
  average percentage as sufficient evidence.

### IMP-036 — Namespace platform assembly pass

- Exercised the blocked pre-evidence state, all seven evidence evaluators,
  deterministic reset, every blueprint option, 12/12 completion, four platform
  scenarios, incidents, concepts, and all navigation boundaries at both sizes.
- Clarified that FNV-1a is only a deterministic drift checksum. The IETF
  [FNV draft](https://datatracker.ietf.org/doc/draft-eastlake-fnv/32/)
  calls FNV non-cryptographic and unsuitable against an active adversary;
  origin authentication therefore remains a signature/provenance concern, not
  a property of this fingerprint.

## Candidates

### IMP-003 — Shared exhaustive-interaction harness

Derive each implemented chapter route and declared interaction contract from the
registry, then record button/input/toggle coverage, immediate-result evidence,
native controls, console errors, mobile overflow, and final learning output.
