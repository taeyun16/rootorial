# Curriculum audit issues

## Open

No open issue currently blocks the implemented-chapter audit.

## Resolved

### CURR-036 — Platform fingerprint copy could imply cryptographic authenticity

Resolved 2026-07-27. The evidence chapter used a deterministic FNV-1a
fingerprint near tamper-oriented language without saying that it is a
non-cryptographic checksum. The chapter now limits it to accidental change and
drift detection and explicitly excludes signature, origin-authentication, and
active-adversary security claims. Desktop and mobile browser checks preserved
the seven-evidence gate, 12/12 blueprint, and all four scenario outputs.

### CURR-035 — Capacity feedback inverted utilization and headroom

Resolved 2026-07-27. A rejected bandwidth plan correctly enforced utilization
at or below 70%, but its feedback called that a “70% headroom contract.” The
copy now names the corresponding 30% headroom contract. The failing state and
correct 4/4 recovery were re-exercised at both viewports.

### CURR-034 — Availability slider did not update the model and was undersized

Resolved 2026-07-27. Moving the failover range control changed its DOM value
from 90s to 20s without updating React state or the adjacent loss/availability
result in the in-app browser, and its mobile hit area was 38px high. The range
now updates on input and has a 44px minimum height. Revalidation showed the
20-second result immediately beside the control and no enabled undersized
mobile targets.

### CURR-033 — Deterministic DNS TTL lab omitted the serve-stale boundary

Resolved 2026-07-27. The TTL exercise implied that expiry unconditionally
forces replacement even though RFC 8767 permits bounded stale reuse when
refresh fails. The model now explicitly states that its authority is reachable
and serve-stale is disabled, while preserving the exception in the explanation.
Both discovery modes and their reset/replay paths passed at both viewports.

### CURR-032 — Network-policy reply rule claimed an unmodelled RELATED state

Resolved 2026-07-27. The policy lab displayed
`ct state established,related accept`, but its probes modelled only NEW,
ESTABLISHED, and untracked packets; none represented a related flow such as an
FTP data connection. Learner-facing rules and explanations now say
`ct state established accept`, matching the actual reply evidence. Both policy
modes, all incidents, and all concepts passed again on desktop and mobile.

### CURR-003 — All 32 implemented chapters now have exhaustive browser evidence

Resolved 2026-07-27. The final five Infrastructure chapters completed fresh
in-app-browser checks at 1280×900 and 390×844, including every direct choice,
prediction failure/retry, reset/replay, incident, concept check, language
switch, section anchor, and preview/public navigation boundary. The audit
matrix now records 32/32 implemented chapters as passed; planned chapters remain
planned rather than being counted as implemented.

### CURR-031 — One-way NAT flow falsely reported ESTABLISHED conntrack state

Resolved 2026-07-27. When a translated request reached the external service but
the reply route was missing or bypassed the original NAT router, the stage
timeline correctly stopped before conntrack lookup while the adjacent live
command and router node still reported `ESTABLISHED`. A failing regression
captured the contradiction. The evaluator now keeps the first-direction entry
`NEW` and promotes it to `ESTABLISHED` only after the reply traverses the same
stateful router. The post-fix desktop and 390×844 browser checks showed `NEW`
beside the blocked reply path and `ESTABLISHED` beside the completed round trip,
with no console error, horizontal overflow, native select, or undersized
enabled mobile target.

### CURR-030 — Bridge scaffold displayed a connected route from the answer state

Resolved 2026-07-27. The bridge scaffold correctly exposed the app's current
address as `10.30.0.2/24`, but its live map hard-coded the app connected route
as `10.20.0.0/24`, the subnet required by the repaired answer. That made the
pre-run observation contradict the selected interface state and leaked part of
the intended solution. Connected routes are now derived from each current
address and prefix, including non-/24 prefixes. A failing regression captured
the mismatch before the repair. Post-fix desktop and 390×844 browser checks
showed the route changing immediately with the address, with no console error,
horizontal overflow, native select, or undersized enabled mobile target.

### CURR-029 — Topology editor implied that an existing listener socket could migrate

Resolved 2026-07-26. The chapter correctly taught that `setns()` changes the
calling thread's network view while an already-created socket stays associated
with its original network namespace, but the required topology editor labeled
every placement change as “move.” The editor now describes process/probe
changes as design placement and listener changes as creation or recreation in
the chosen view. Map buttons say “Select placement,” and focused regression
coverage rejects the old migration wording. The complete desktop and 390×844
flow passed after repair with no console error, horizontal overflow, native
select, or undersized enabled mobile target.

### CURR-028 — Diagnostic response proof asserted an unobserved HTTP status

Resolved 2026-07-26. The evidence ladder's last result card claimed `HTTP 200`,
but its `curl` command and terminal output showed only `{"status":"ok"}`. The
command now uses curl's write-out field and displays the response body and
`HTTP 200` together, so the visible output directly supports both facts.
Focused regression coverage preserves that contract. The complete desktop and
390×844 flow passed after repair with no console error, horizontal overflow,
native select, or undersized enabled mobile target.

### CURR-027 — DNS completion guidance and response proof exceeded the actual contract

Resolved 2026-07-26. The chapter compass told learners to predict two states
and tune a variable even though the required flow is one boundary prediction,
ordered evidence, and minimal incident repair. Its experience contract now
selects the matching predict-and-repair guidance. The last `curl` step also
discarded the response body while claiming `expected body`; it now prints
`{"status":"ok"}` and `HTTP 200` together and labels only the evidence actually
shown. RFC 1034/1035 TTL language was reconciled with RFC 8767 by describing
TTL as the point at which a resolver reconsults the source and naming
serve-stale as an explicit refresh-failure exception. Focused regressions cover
all three corrections.

### CURR-026 — Namespace prerequisite handoff was a 20px mobile target

Resolved 2026-07-26. The link returning an Infrastructure learner to the Linux
Networking prerequisite measured only 20px high at 390×844. It now uses the
same restrained inline-flex treatment as other prerequisite handoffs and
measures 236×53px without changing its copy or surrounding callout. A source
regression protects the 44px minimum. The repaired page has no horizontal
overflow, native selects, enabled targets below 44px, or console errors. The
Infrastructure chapter remains unverified until its complete interaction flow
passes separately.

### CURR-025 — Advanced journey figures reported one executed state while locked

Resolved 2026-07-26. Before the learner selected a correct prediction, the
shared advanced-network figure hid every path, verdict, and command output but
reported `1 / 6` states executed because its internal first phase was already
selected. The footer now reports `0 / 6` until the prediction unlocks visible
evidence, then advances from the first visible state through mastery. The
Sockets, Ports, and TCP chapter passed all predictions, six states, nine
incident choices, reset/replay, fifteen concept choices, keyboard activation,
KO/EN, seven section anchors, transfer, previous/next, catalog, and draft/public
boundaries at 1280 and 390×844. Both viewports had no horizontal overflow,
native selects, undersized enabled targets, or console errors.

### CURR-024 — Advanced network incidents had no deterministic reset

Resolved 2026-07-23. The shared incident lab used by the four advanced Linux
networking chapters retained every repair but exposed no way to clear the state
for a fresh attempt. A bilingual 44px reset now clears only incident repairs.
An initially disabled empty-state button was rejected after browser evidence
showed focus falling to the document body; the enabled no-op instead preserves
focus on the visible reset control. In `routes-and-packet-paths`, both incorrect
route predictions, all six forwarding states, all nine incident choices,
reset/replay, five concept failures and retries, KO/EN, section, transfer,
neighbor, catalog, and draft/public-boundary links passed at 1280px and 390×844.
Both viewports had zero page overflow, native selects, or console errors;
mobile had zero enabled targets below 44px.

### CURR-023 — Subnet-lab reset missed the mobile touch target contract

Resolved 2026-07-23. The reset control in the required subnet-path lab measured
310×40px at 390×844 and 42×68px at the desktop viewport, making it the only
chapter-local enabled target below 44px. The scoped reset control now has a
44px minimum width and a 44px mobile minimum height, protected by a source
regression. All prediction failures and recovery, six path phases, sixteen
incident repair choices, deterministic reset/replay, five concept failures and
retries, KO/EN, section, transfer, neighbor, catalog, and draft/public-boundary
links passed in the actual in-app browser. Both viewports now have zero native
selects, horizontal overflow, console errors, or chapter-local undersized
enabled targets.

### CURR-022 — Network-view reset discarded keyboard focus

Resolved 2026-07-23. Resetting the required interface-state lab removed the
focused command list and attempted to focus a button inside that removed list,
so focus fell back to the document body. The reset now waits for the prediction
group to replace the command list and focuses its first direct choice. The full
six-phase lab, all sixteen incident repair choices, five concept failures and
retries, deterministic resets, KO/EN, keyboard operation, draft/public and
neighbor navigation passed at 1280px and 390×844. Both viewports had zero
horizontal overflow, native selects, or console errors; mobile had zero enabled
targets below 44px, and reset focus returned to the first visible prediction.

### CURR-021 — Tiny-system prerequisite and v86 source links missed the touch contract

Resolved 2026-07-23. The prerequisite handoff and optional official-v86-source
links measured 19.5px and 18.1px high at 390×844. Both now expose a 44px target.
The required three-layer recovery, all five evidence probes, four independent
incidents, five concept failures and retries, deterministic resets, KO/EN,
disclosure, support, keyboard submission, previous/next navigation, and the
optional real-kernel boot plus five preset commands and a manual command passed
in the actual in-app browser. After repair both viewports had zero horizontal
overflow, native selects, console errors, or undersized enabled targets.

### CURR-020 — Network prerequisite handoff was a 19.5px target

Resolved 2026-07-23. The link returning learners to the storage prerequisite
measured only 19.5px high at both desktop and 390×844. It now exposes a 44px
target. Packet-path prediction, ordered socket/route/ARP/handshake/accept/send
transitions, deliberate loss and RTO recovery, all four network incidents,
five concepts, deterministic resets, disclosures, support, KO/EN, keyboard
submission, and previous/next navigation passed in the actual in-app browser.
After repair both viewports had zero horizontal overflow, native selects,
console errors, or undersized enabled mobile targets.

### CURR-019 — Storage mastery did not reach the chapter gate

Resolved 2026-07-23. The required lab visibly checked all five path, link,
unlink, dirty-crash, and synced-crash evidence rows and rendered its local
mastery message, but the parent chapter checklist remained unchecked, making
completion impossible. The parent signal is now derived from the same mastery
predicate as the visible result. The prerequisite handoff also grew from 20px
to at least 44px. Desktop and 390×844 replay now check all three chapter outputs
with zero native selects, horizontal overflow, console errors, or undersized
enabled mobile targets.

### CURR-018 — Memory prerequisite handoff was a 20px mobile target

Resolved 2026-07-23. The link returning learners to the prerequisite permission
chapter measured only 20px high at both desktop and 390×844. It now exposes a
44px target. Address validation, prediction failure/recovery, mapped, COW,
demand-zero, protection and unmapped outcomes, all four diagnostics, five
concepts, deterministic resets, KO/EN, disclosures, navigation, and the full
mobile completion flow passed in the actual in-app browser after repair, with no
native select, undersized enabled mobile target, or horizontal overflow.

### CURR-017 — Permission prerequisite handoff was a 17px mobile target

Resolved 2026-07-23. The link that lets a learner return to the prerequisite
process chapter measured only 17px high at 390×844. It now exposes a 44px target
without changing the adjacent prerequisite note. The permission policy, chmod
error/recovery, all four incidents, five concepts, language, focus, neighbor
navigation, and mobile completion flow passed in the actual in-app browser after
repair, with no native select, undersized enabled target, or horizontal overflow.

### CURR-016 — Process incident retry controls missed the mobile touch contract

Resolved 2026-07-23. The four per-incident reset buttons were only 28px high at
both 1280px and 390×844, even though they are the primary recovery control after
an unproductive signal or scheduler action. They now expose 44px targets without
changing the compact link treatment. The full lifecycle, all four incidents,
intentional failure/retry, five concepts, bilingual state, navigation, and
mobile flow passed in the actual in-app browser after repair, with no native
select or horizontal overflow.

### CURR-015 — Boot completion guidance understated the five-question gate

Resolved 2026-07-22. The actual concept check and locked completion message both
required five answers, but the adjacent visible checklist said four in Korean
and English. Enter on the shared concept submit control also only focused the
button in the in-app browser, and the prerequisite and v86 source links measured
20px and 18px high at 390×844. The checklist now states five, Enter and Space
request form submission explicitly, and both links expose 44px targets. The
required labs, incorrect/retry paths, all five concepts, optional real-kernel
boot and commands, lifecycle controls, bilingual copy, navigation, and mobile
flow passed in the actual in-app browser after repair.

### CURR-014 — Mini Transformer completion guidance and mobile prerequisite contradicted the real gate

Resolved 2026-07-22. The English concept check asked for “both required
activities” even though completion requires three core workbench challenges plus
five questions, and its optional debugger marker rendered the Korean word
`선택`. At 390×844, the prerequisite link measured only 17px high. The guidance
now names the three core challenges, `Optional` follows locale, and the link is
44px high. The generation repair also exposed that entering the instructed
`prefix.append(next_token_id)` line removed its four-space loop indentation and
raised `IndentationError`; the guided one-line editor now preserves the original
line indentation automatically. The complete lab, NumPy, debugger, concept,
keyboard, navigation, reset, and mobile flows passed in the actual in-app
browser after repair.

### CURR-013 — Transformer Block completion guidance and mobile prerequisite contradicted the real gate

Resolved 2026-07-22. The English concept check asked for “both required
activities” even though completion requires three core workbench challenges plus
five questions, and its optional debugger marker rendered the Korean word
`선택`. At 390×844, the prerequisite link measured only 17px high. The guidance
now names the three core challenges, `Optional` follows locale, and the link is
44px high. All block presets, matrix inspections, NumPy, debugger, concept,
keyboard, navigation, reset, and mobile flows passed in the actual in-app
browser after repair.

### CURR-012 — Self-Attention completion guidance and mobile prerequisite contradicted the real gate

Resolved 2026-07-22. The English concept check asked for “both required
activities” even though completion requires three core workbench challenges plus
five questions, and its optional debugger marker rendered the Korean word
`선택`. At 390×844, the prerequisite link measured only 17px high. The guidance
now names the three core challenges, `Optional` follows locale, and the link is
44px high. All challenge, NumPy, debugger, concept, keyboard, navigation, and
mobile flows passed in the actual in-app browser after repair.

### CURR-011 — Attention hid an invalid query and contradicted its completion contract

Resolved 2026-07-22. The English concept check asked learners to finish “both
required activities” even though one routing lab plus five questions gate
completion; its optional debugger marker rendered the Korean word `선택`. An
empty query component silently became zero and produced plausible routing
instead of the promised validation error, while the mobile prerequisite link
measured 17px high. The copy now names the one required lab, `Optional` follows
locale, blank components reach the visible local-runtime failure and safe preset
recovery path, and the prerequisite link is 44px high. Actual failure/recovery,
keyboard, navigation, and 390×844 measurements passed after repair.

### CURR-010 — Sequence completion guidance and mobile navigation contradicted the chapter contract

Resolved 2026-07-22. The English concept check asked learners to finish “both
required activities” even though only the sequence-memory lab and five questions
gate completion; the optional debugger marker rendered the Korean word `선택`.
At 390×844, the prerequisite and bottom previous/next links measured 20px, 22px,
and 22px high. The copy now names the one required lab, `Optional` follows locale,
and the three links expose a 44px target. Browser-visible completion, keyboard,
neighbor navigation, and mobile measurements passed after repair.

### CURR-009 — Embeddings completion guidance made optional remediation look required

Resolved 2026-07-22. The English concept check asked for “both required
activities” and told learners to confirm “both activity states,” although the
real gate requires one lookup-and-gradient lab plus five questions and keeps the
four-incident debugger optional. Its unfinished English checklist also rendered
the Korean word `선택`. The guidance now names the one required lab and the
optional marker follows locale. Browser-visible copy, completion behavior, and
keyboard retry passed after repair.

### CURR-008 — Training completion guidance contradicted its real gate

Resolved 2026-07-22. The English concept check asked for “both required
activities” although the chapter gate requires one mini-batch lab plus five
questions, its optional debugger marker rendered the Korean word `선택`, and the
mobile prerequisite link measured only 17px high. The guidance now names the one
required lab, the optional marker follows locale, and the prerequisite link is
44px high. Browser-visible copy and 390×844 measurements passed after repair.

### CURR-007 — Neural-network completion controls lost keyboard and preview continuity

Resolved 2026-07-22. The in-app browser focused concept-answer buttons on Enter
without changing their pressed state, the implemented training chapter still
appeared as `Coming soon` in local preview, and the prerequisite link measured
28px high on a 390×844 viewport. Concept options now explicitly handle Enter and
Space, preview navigation links both implemented neighbors, and the prerequisite
link is 44px high. Actual keyboard presses, mobile measurements, and both preview
destinations passed after repair.

### CURR-006 — Keyboard activation and preview chapter navigation were incomplete

Resolved 2026-07-22. In the in-app browser, Enter focused language and direct-
choice buttons without activating them, and the optimization previous link left
the local preview for the public route. Shared language and direct-choice buttons
now handle Enter and Space explicitly while retaining click behavior. Vectors and
optimization preview navigation now stays on `/admin/preview`, exposes available
next draft chapters instead of a misleading `Coming soon`, and preserves the
active locale. Actual keyboard presses and the full vectors → optimization →
neural-networks preview path passed after the repair.

### CURR-005 — Optimization completion copy contradicted its optional debugger

Resolved 2026-07-22. The concept check said two required activities remained
even though the chapter gate requires one learning-rate repair lab plus the
questions, while the four-incident debugger is optional. Its unfinished English
checklist also rendered the Korean word `선택`. The gate now names the one
required lab, and the optional marker follows the active locale. The chapter's
preceding-chapter link also grew from a 20px to a 44px mobile target; the
post-fix 390×844 audit found no undersized enabled controls.

### CURR-004 — Vectors chapter exposed undersized mobile controls

Resolved 2026-07-22. At 390×844, the header wordmark and language buttons were
34px and 28px high, vector number inputs were 28px high, reshape radio labels
were 42px high, and dot-product slider rows were 20px high. Shared wordmark and
language controls plus the chapter-specific input, radio-label, and slider rows
now provide at least a 44×44 target. The post-fix browser audit found 0
undersized targets across 95 enabled links, buttons, inputs, and text areas.

### CURR-002 — Local draft curricula were not discoverable from one index

Resolved 2026-07-22. `/admin/preview/curricula/` now lists all 5 curricula,
links all 32 preview-ready chapters, and renders the 8 planned chapters as
non-interactive scope. Curriculum and chapter previews include a localized link
back to the audit index. The index remains unavailable outside the explicit
loopback `content-preview` mode.

### CURR-001 — Draft preview required live Clerk admin and D1 state on localhost

Resolved 2026-07-22. `npm run dev:content` now provides read-only preview access
only in a Vite development build on a loopback host. It uses the deterministic
default publication catalog when local D1 is absent. Normal development and
production builds remain closed, and no mutation, discussion, analytics, or
progress-saving permission is granted.
