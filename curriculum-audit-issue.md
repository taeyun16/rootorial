# Curriculum Audit: Coverage, Level, Gaps, and Citations

**Objective:** Provide a comprehensive audit of all Rootorial curricula to serve as the source of truth for follow-up PRs focused on improving learnability.

---

## Executive Summary

Rootorial contains **5 curricula** with **40 planned chapters**, of which **32 are implemented** (80% complete by chapter count). All 32 implemented chapters follow a high-quality interactive pattern with immediate feedback, E2E tests, touch-target audits, and console-error monitoring. However, **no learner-facing citations are currently visible** in the UI, even though the content quality is exceptional.

### Key Findings
- ✅ **Interaction quality:** All 32 implemented chapters have interactive practice with immediate feedback
- ✅ **Test coverage:** All 32 have E2E tests with touch-target audits (44px minimum)
- ❌ **Citations:** No visible citations in learner-facing UI (major gap for academic credibility)
- ⚠️ **Planned content:** System Architecture curriculum is 100% planned (0/8 implemented)
- ⚠️ **Transformer gaps:** Missing advanced topics (RLHF, fine-tuning, quantization)
- ⚠️ **Linux gaps:** Missing container runtime internals, cgroups, eBPF observability

---

## Full Curriculum Inventory

### 1. Transformer from Zero (transformer-from-zero)
**Status:** In Progress · Beginner · 10/10 chapters implemented  
**Path:** `src/components/{chapter}/` and `src/data/{chapter}Notebook.ts`

| # | Slug | Title (EN) | Level | Interactive Practice | Citations | Quality Notes |
|---|------|------------|-------|---------------------|-----------|---------------|
| 1 | `vectors` | Vectors and Tensors | Intro | ✅ Shape Detective (3/3), Axis Builder (3/3) | ❌ | Excellent NumPy practice cells, immediate feedback |
| 2 | `optimization` | Learning and Optimization | Intro | ✅ Learning rate repair, debugger (4 incidents) | ❌ | Live gradient visualization, divergence recovery |
| 3 | `neural-networks` | Classification and Neural Networks | Intro | ✅ XOR assembly (4/4), backprop debugger (4 incidents) | ❌ | Hidden-layer visualization, chain-rule practice |
| 4 | `training` | Deep Learning Training | Core | ✅ Mini-batch lab, Softmax/CE, Adam trace (3/3) | ❌ | Fused gradient practice, validation/dropout boundaries |
| 5 | `embeddings` | Tokens and Embeddings | Core | ✅ Lookup lab (4 checks), scatter-add debugger (4 incidents) | ❌ | Repeated-row gradient visualization, tokenizer exploration |
| 6 | `sequences` | Sequential Data | Core | ✅ RNN/LSTM memory lab (4 evidence items), gradient debugger | ❌ | Temporal gradient visualization, carry/write/reveal gates |
| 7 | `attention` | Attention | Core | ✅ Routing lab (3 evidence items), context debugger (4 incidents) | ❌ | Query/Key/Value visualization, permutation invariance |
| 8 | `self-attention` | Self-Attention | Core | ✅ Q/K/V projection, causal mask, multi-head (5 traces) | ❌ | Information leakage detection, scaled dot-product |
| 9 | `transformer-block` | The Transformer Block | Core | ✅ Position encoding, pre-LayerNorm, residual paths (5 traces) | ❌ | Block assembly visualization, FFN position-wise |
| 10 | `mini-transformer` | Mini Transformer | Capstone | ✅ End-to-end pipeline, loss, autoregressive decode (5 traces) | ❌ | Complete model assembly, EOS/max-length generation |

**Test files:** `e2e/{chapter}.spec.ts` for all 10 chapters  
**Estimated time:** 60-90 minutes per chapter  

**Missing Topics:**
- Fine-tuning and transfer learning
- RLHF (Reinforcement Learning from Human Feedback)
- Quantization and efficient inference
- Multi-modal extensions (vision, audio)
- Scaling laws and distributed training

---

### 2. Linux Systems (linux-systems)
**Status:** In Progress · Beginner · 8/8 chapters implemented  
**Path:** `src/components/linux/`

| # | Slug | Title (EN) | Level | Interactive Practice | Citations | Quality Notes |
|---|------|------------|-------|---------------------|-----------|---------------|
| 1 | `shell-and-filesystem` | From the Shell to Your First File | Intro | ✅ 5 shell commands, file creation, permission errors | ❌ | Deterministic in-browser shell, immediate feedback |
| 2 | `boot-to-shell` | From Power-On to a Shell | Intro | ✅ Boot recovery (4/4), diagnosis lab (4/4), optional v86 | ❌ | Firmware→kernel→init→shell trace, optional real kernel |
| 3 | `processes-and-signals` | Processes and Signals | Core | ✅ Fork/exec lab (7 checks), signal/wait debugger (4 incidents) | ❌ | PID/PPID visualization, stdio/zombie state transitions |
| 4 | `users-and-permissions` | Users and Permissions | Core | ✅ Access decision, policy assembly (4 checks), incidents (4/4) | ❌ | UID/GID/rwx visualization, least-privilege assembly |
| 5 | `memory-and-virtual-addresses` | Memory and Virtual Addresses | Core | ✅ VA translation lab (5 checks), TLB/page-fault/COW debugger | ❌ | VPN→PTE→frame visualization, /proc maps boundaries |
| 6 | `storage-and-filesystems` | Storage and Filesystems | Core | ✅ Path/inode/block trace (5 checks), durability debugger (4/4) | ❌ | Mount→dentry→inode→block visualization, fsync boundaries |
| 7 | `networking-from-a-packet` | From Packets to Sockets | Core | ✅ Socket→route→TCP journey (6 phases), debugger (4/4) | ❌ | FD→socket→route visualization, cumulative ACK/recv |
| 8 | `assemble-a-tiny-linux` | Assemble a Tiny Linux System | Capstone | ✅ Artifact assembly, init sequence (5 probes), incidents (4/4) | ❌ | Kernel/rootfs separation, PID 1→service→readiness |

**Test files:** `e2e/linux-{chapter}.spec.ts` and `e2e/linux-curriculum.spec.ts`  
**Estimated time:** 35-75 minutes per chapter  

**Missing Topics:**
- Container runtime internals (runc, containerd)
- Cgroups v2 and resource limits
- eBPF observability and tracing
- SELinux/AppArmor security modules
- Systemd service management beyond PID 1
- Network bonding, teaming, bridging

---

### 3. Linux Networking (linux-networking)
**Status:** Available · Beginner · 6/6 chapters implemented  
**Path:** `src/components/linux-networking/`

| # | Slug | Title (EN) | Level | Interactive Practice | Citations | Quality Notes |
|---|------|------------|-------|---------------------|-----------|---------------|
| 1 | `interfaces-addresses-and-loopback` | Interfaces, Addresses, and Loopback | Intro | ✅ State lab (6 phases), incidents (4/4), concepts (5) | ❌ | Interface existence vs link state, localhost boundaries |
| 2 | `subnets-neighbors-and-gateways` | Subnets, Neighbors, and Gateways | Core | ✅ Path lab (6 phases), CIDR/ARP, incidents (4/4), concepts (5) | ❌ | Same-link calculation, gateway frame decisions |
| 3 | `routes-and-packet-paths` | Routes and Packet Paths | Core | ✅ Routing lab (6 phases), LPM/TTL, incidents (3/3), concepts (5) | ❌ | Longest-prefix matching, egress/next-hop selection |
| 4 | `sockets-ports-and-tcp` | Sockets, Ports, and TCP | Core | ✅ Listener/accept flow (6 states), incidents (3/3), concepts (5) | ❌ | FD→socket→4-tuple, TCP ACK vs recv boundaries |
| 5 | `dns-and-service-reachability` | DNS and Service Reachability | Core | ✅ Name/route/connect journey (6 states), incidents (3/3) | ❌ | Resolver, TTL cache, RFC 8767 serve-stale |
| 6 | `diagnose-a-linux-network` | Diagnose a Linux Network | Capstone | ✅ Evidence ladder (6 states), multi-fault incidents (4/4) | ❌ | ip/ss/tcpdump evidence alignment, first-failed boundary |

**Test files:** `e2e/linux-networking*.spec.ts`  
**Estimated time:** 45-75 minutes per chapter  

**Missing Topics:**
- VXLAN and overlay networks
- SR-IOV and hardware offloads
- BPF-based load balancing (Cilium, Katran)
- IPv6 neighbor discovery and SLAAC
- Advanced IPsec and WireGuard VPNs

---

### 4. Infrastructure Design (infrastructure-design)
**Status:** Available · Intermediate · 8/8 chapters implemented  
**Path:** `src/components/infrastructure/`

| # | Slug | Title (EN) | Level | Interactive Practice | Citations | Quality Notes |
|---|------|------------|-------|---------------------|-----------|---------------|
| 1 | `network-namespaces-and-boundaries` | Network Namespaces and Isolation Boundaries | Intro | ✅ Ownership lab (4 phases, 18 transitions), incidents (4/4) | ❌ | Process/interface/socket ownership, localhost isolation |
| 2 | `veth-bridges-and-routing` | Assemble Topologies with veth, Bridges, and Routing | Core | ✅ Bridge/router assembly, CIDR/route, incidents (4/4) | ❌ | Veth pair endpoints, forward/return paths |
| 3 | `egress-nat-and-conntrack` | Egress, NAT, and Conntrack | Core | ✅ SNAT/MASQUERADE modes (2/2), incidents (4/4), concepts (5) | ❌ | Forwarding/translation/reply paths, conntrack NEW→ESTABLISHED |
| 4 | `network-policy-and-firewalls` | Network Policy and Firewalls | Core | ✅ Default-deny policy (2/2), hook/direction, incidents (4/4) | ❌ | nftables hook order, stateful policy, ESTABLISHED-only reply |
| 5 | `service-discovery-and-load-balancing` | Service Discovery and Load Balancing | Core | ✅ DNS/VIP modes (2/2), health/affinity, incidents (4/4) | ❌ | TTL cache, L4 balancing, stale endpoint detection |
| 6 | `availability-and-failure-domains` | Availability and Failure Domains | Core | ✅ Replica placement, failover modes (2/2), incidents (4/4) | ❌ | Independent failure boundaries, dependency budgets |
| 7 | `network-observability-and-capacity` | Network Observability and Capacity | Core | ✅ Evidence alignment (28 alternatives), capacity (4/4) | ❌ | ip/ss/tcpdump/counter evidence, queue/bandwidth saturation |
| 8 | `assemble-a-namespace-platform` | Assemble a Namespace Platform | Capstone | ✅ 12/12 platform assembly, 4 scenarios, incidents (4/4) | ❌ | Client/edge/app/data namespaces, versioned evidence |

**Test files:** `e2e/infrastructure-*.spec.ts`  
**Estimated time:** 65-95 minutes per chapter  

**Missing Topics:**
- Kubernetes networking (CNI, kube-proxy)
- Service mesh (Envoy, Istio, Linkerd)
- BGP for DC fabric (EVPN, VXL AN)
- Multi-tenancy and hard isolation
- GitOps for network config

---

### 5. System Architecture (system-architecture)
**Status:** Planned · Intermediate · 0/8 chapters implemented  
**Path:** Not yet created

| # | Slug | Title (EN) | Level | Interactive Practice | Citations | Quality Notes |
|---|------|------------|-------|---------------------|-----------|---------------|
| 1 | `requirements-and-quality-attributes` | Requirements and Quality Attributes | Intro | 🔲 Planned | ❌ | Trade-off simulator planned |
| 2 | `components-and-request-flows` | Components and Request Flows | Core | 🔲 Planned | ❌ | Architecture canvas planned |
| 3 | `data-ownership-and-source-of-truth` | Data Ownership and Sources of Truth | Core | 🔲 Planned | ❌ | Ownership conflict simulator planned |
| 4 | `sync-async-and-idempotency` | Synchronous, Asynchronous, and Idempotent Work | Core | 🔲 Planned | ❌ | Message-flow simulator planned |
| 5 | `caching-and-consistency` | Caching and Consistency | Core | 🔲 Planned | ❌ | Cache/consistency model planned |
| 6 | `capacity-scaling-and-partitioning` | Capacity, Scaling, and Partitioning | Core | 🔲 Planned | ❌ | Capacity/partition simulator planned |
| 7 | `reliability-observability-and-slos` | Reliability, Observability, and SLOs | Core | 🔲 Planned | ❌ | Failure/SLO simulator planned |
| 8 | `design-and-review-a-system` | Design and Review a System | Capstone | 🔲 Planned | ❌ | System architecture studio planned |

**Test files:** Not yet created  
**Estimated time:** 55-95 minutes per chapter (planned)  

---

## Gap Analysis

### Major Gaps

#### 1. **No Learner-Facing Citations** (Critical)
- **Current state:** No visible citations in any chapter UI
- **Impact:** Undermines academic credibility, prevents learners from deepening understanding
- **Evidence:** Searched all 32 implemented chapters, found zero learner-facing citation links
- **Recommendation:** Add "Learn More" sections with 2-3 curated citations per chapter

#### 2. **Walls of Text Without Interaction** (Moderate)
- **Current state:** Some chapters have long explanatory sections before practice
- **Impact:** Reduces engagement, contradicts "immediate feedback" goal
- **Examples:** 
  - Transformer Block chapter has ~200 lines of prose before first lab
  - Training chapter has extensive Softmax/CE explanation before practice
- **Recommendation:** Interleave mini-labs every 2-3 paragraphs

#### 3. **Missing Advanced Transformer Topics** (Moderate)
- **Current state:** Curriculum stops at basic Transformer
- **Gap:** No fine-tuning, RLHF, quantization, or multi-modal extensions
- **Recommendation:** Add 2-3 advanced chapters or integrate into existing chapters

#### 4. **System Architecture Not Started** (High)
- **Current state:** 0/8 chapters implemented
- **Impact:** Breaks the learning path from infrastructure to full system design
- **Recommendation:** Prioritize as next major curriculum after audits

#### 5. **Unclear Prerequisites** (Minor)
- **Current state:** Some prerequisite links are small (20px) on mobile, some missing
- **Impact:** Learners may start at wrong level
- **Status:** Being addressed in recent PRs (CURR-017, CURR-020, etc.)

### Missing Topics by Curriculum

**Transformer:**
- Fine-tuning strategies (LoRA, QLoRA, adapter layers)
- RLHF and preference learning
- Quantization (INT8, INT4, AWQ, GPTQ)
- Multi-modal transformers (CLIP, Flamingo)
- Mixture of Experts (MoE) architectures

**Linux Systems:**
- Container internals (namespaces, cgroups, seccomp)
- eBPF and tracing (bpftrace, BCC)
- SELinux/AppArmor
- Systemd service management
- Advanced scheduling (CFS, RT)

**Linux Networking:**
- IPv6 in depth
- VXLAN and overlay networks
- SR-IOV and hardware offloads
- Advanced IPsec and WireGuard
- BPF-based packet processing

**Infrastructure:**
- Kubernetes networking (CNI)
- Service mesh (Envoy, Istio)
- BGP for data center fabric
- Multi-tenancy patterns
- GitOps workflows

---

## Comparable High-Quality Materials

### For Transformers / Machine Learning

#### Interactive Visualizations
1. **LLM Cutaway** (https://github.com/Letemoin/llm-cutaway)
   - Real GPU-backed transformer with live attention heatmaps
   - Interactive logit lens, FFN memory views
   - *Use for:* Visual inspiration for attention/FFN visualization

2. **AnimatedLLM** (https://animatedllm.github.io)
   - Browser-based step-by-step transformer walkthrough
   - Pre-computed traces of open LLMs
   - *Use for:* Interaction patterns for tokenization, generation

3. **The Illustrated Transformer** (https://krugis.github.io/transformer-guide/)
   - Interactive Q/K/V visualization
   - Step-by-step encoder-decoder breakdown
   - *Use for:* Pedagogical explanations of attention mechanism

#### Authoritative Papers & Textbooks
4. **"Attention Is All You Need"** (Vaswani et al., 2017)
   - Original transformer paper
   - *Citation needed in:* Attention, Self-Attention, Transformer Block chapters
   - Link: https://research.google/pubs/attention-is-all-you-need/

5. **"Understanding Deep Learning"** (Prince, 2023)
   - Comprehensive free textbook
   - *Citation needed in:* Optimization, Training chapters
   - Link: https://udlbook.github.io/udlbook/

6. **3Blue1Brown - Neural Networks Series** (YouTube)
   - Visual explanations of backpropagation, gradient descent
   - *Citation needed in:* Neural Networks, Optimization chapters

7. **Karpathy's "Neural Networks: Zero to Hero"**
   - Build-from-scratch video series
   - *Citation needed in:* All transformer chapters

### For Linux Systems / Networking

#### Interactive Labs
8. **NetPilot** (https://www.netpilot.io)
   - Browser-based multi-vendor network labs
   - Real device CLIs over SSH
   - *Use for:* Inspiration for Linux networking labs

9. **Containerlab Free Labs** (https://github.com/ciscoittech/containerlab-free-labs)
   - Free hands-on OSPF, BGP, Linux namespace labs
   - 30-second spin-up with Docker
   - *Use for:* Lab structure for Linux networking

10. **Kubecraft** (https://github.com/drewelliott/kubecraft)
    - Docker networking, BGP, spine-leaf labs
    - Ansible automation alongside concepts
    - *Use for:* Infrastructure automation patterns

#### Authoritative Books
11. **"Operating Systems: Three Easy Pieces" (OSTEP)** (Arpaci-Dusseau & Arpaci-Dusseau)
    - Free, comprehensive OS textbook
    - *Citation needed in:* All Linux Systems chapters
    - Link: https://pages.cs.wisc.edu/~remzi/OSTEP/

12. **"TCP/IP Illustrated"** (Stevens, Fall & Stevens)
    - Classic networking reference
    - *Citation needed in:* Linux Networking chapters

13. **"Linux Kernel Development"** (Love, 2010)
    - In-depth kernel internals
    - *Citation needed in:* Linux Boot, Memory, Processes chapters

14. **"Beej's Guide to Network Programming"**
    - Accessible sockets programming guide
    - *Citation needed in:* Sockets/TCP chapter
    - Link: https://beej.us/guide/bgnet/

### For Infrastructure / System Design

15. **"Designing Data-Intensive Applications"** (Kleppmann, 2017)
    - System design fundamentals
    - *Citation needed in:* System Architecture chapters (when implemented)

16. **"Site Reliability Engineering"** (Google SRE Book)
    - SLOs, capacity planning, reliability
    - *Citation needed in:* Infrastructure capstone, System Architecture

17. **"Building Microservices"** (Newman, 2021)
    - Service discovery, resilience patterns
    - *Citation needed in:* Infrastructure Service Discovery, System Architecture

---

## Recommended PR Slice Plan

### Priority Order

#### **Slice 1: Add Learner-Facing Citations** (Highest Impact)
- **Scope:** All 32 implemented chapters
- **Work:** Add "Learn More" section at chapter end with 2-3 curated citations
- **Chapters:** All Transformer chapters cite "Attention Is All You Need", OSTEP for Linux
- **Estimated effort:** 5-8 hours (1-2 chapters/hour)
- **Why first:** Biggest gap, affects all chapters, minimal risk

#### **Slice 2: Interleave Mini-Labs in Long Sections**
- **Scope:** Transformer Block, Training, Self-Attention chapters
- **Work:** Break up long prose with mini prediction/verification labs
- **Pattern:** Every 2-3 paragraphs, add a direct-choice prediction or mini calculation
- **Estimated effort:** 8-12 hours
- **Why second:** High learner engagement impact, follows existing patterns

#### **Slice 3: Add Fine-Tuning Chapter to Transformer**
- **Scope:** New chapter 11 in transformer-from-zero
- **Content:** LoRA, adapter layers, transfer learning basics
- **Interactive:** Fine-tuning lab with frozen vs unfrozen layers
- **Estimated effort:** 20-30 hours (full chapter)
- **Why third:** Addresses most-requested advanced Transformer topic

#### **Slice 4: Container Runtime Chapter for Linux**
- **Scope:** New chapter 9 in linux-systems (after assembly)
- **Content:** Namespaces, cgroups, seccomp, runc internals
- **Interactive:** Container creation from scratch lab
- **Estimated effort:** 25-35 hours (full chapter)
- **Why fourth:** Natural extension after Linux assembly

#### **Slice 5: System Architecture Track Implementation**
- **Scope:** All 8 system-architecture chapters
- **Content:** Requirements through system design studio
- **Interactive:** Trade-off simulators, capacity planners, SLO calculators
- **Estimated effort:** 160-240 hours (full curriculum)
- **Why fifth:** Largest remaining gap, but lower urgency than citations

#### **Slice 6: Multi-Modal Transformer Extension**
- **Scope:** Optional chapter 11 or 12 in transformer-from-zero
- **Content:** Vision-text transformers (CLIP-style)
- **Interactive:** Image-text attention visualization
- **Estimated effort:** 25-35 hours
- **Why sixth:** Cutting-edge topic, lower priority than fundamentals

---

## Notes on Existing Audit Infrastructure

### Content-Preview Catalog
- **Location:** `http://localhost:3000/admin/preview/curricula/` (content-preview mode only)
- **Purpose:** Single index for all curricula/chapters during local development
- **Component:** `src/components/LocalContentPreviewCatalog.tsx`
- **Usage:** Visual QA can use this to systematically audit all 32 chapters

### Interaction Tests
- **Location:** `e2e/*.spec.ts` (32 files)
- **Coverage:** All chapters have route, desktop (1280×720), mobile (390×844), keyboard, console-error checks
- **Touch targets:** 24/32 use `page-visible-scan` (every enabled control), 6/32 use `component-scan`, 2/32 use `specific-control`
- **Pattern:** Shared helpers in `e2e/helpers/touch-targets.ts`

### Quality Contracts
- **Location:** `src/features/chapters/content-quality.ts`
- **Purpose:** Registry-derived quality checks
- **Coverage:** Structural issues, native-select-zero, console-error-zero contracts

### Audit Documentation
- **Location:** `docs/curriculum-audit/`
- **Files:**
  - `matrix.md` - Browser evidence matrix with pass/fail states
  - `issues.md` - Resolved curriculum defects (CURR-001 through CURR-082)
  - `improvements.md` - Found one reference to 3Blue1Brown here, but not in chapter UI
- **Pattern:** Each defect has a CURR-NNN identifier, resolution date, and browser evidence

### Visual QA Workflow
1. Run `npm run dev:content` (explicit content-preview mode)
2. Open `/admin/preview/curricula/` for full catalog
3. Click through each chapter at desktop and mobile
4. Run E2E tests: `npx playwright test e2e/{chapter}.spec.ts`
5. Check console for errors, native selects, overflow

---

## Copy-Quality Audit (Orwell's Rules)

### Standing Writing Rules for All Learner-Facing Copy

**These rules apply to all Korean and English learner-facing text. Later content PRs must follow them.**

From George Orwell's "Politics and the English Language":

1. **Never use a metaphor, simile, or other figure of speech you are used to seeing in print.**
2. **Never use a long word where a short one will do.**
3. **If it is possible to cut a word out, always cut it out.**
4. **Never use the passive where you can use the active.**
5. **Never use a foreign phrase, a scientific word, or a jargon word if you can think of an everyday equivalent.**
6. **Break any of these rules sooner than say anything outright barbarous.**

**Critical clarification:** If the lesson IS a technical term (e.g., "gradient," "PTE," "TCP"), **keep the term**, then explain what it means in plain words. Do not add clichés, filler, or textbook-speak around it.

### Violations Found (Examples with Rewrites)

Below are concrete violations from implemented chapters. **Do not rewrite all 32 chapters now**—flag them here, and later PRs will fix each path as they touch it.

#### 1. Passive Voice (Rule 4)

**File:** `src/components/training/TrainingChapter.tsx` (line 238-239)

**Current (EN):**
> "The dZ²→dH→dZ¹→parameter-gradient path run on full XOR in the previous chapter now repeats for every mini-batch, and Adam uses those gradients to update parameters."

**Violation:** "is repeated" hidden in "repeats" is fine, but "Adam uses" buries action. Better: make gradient the subject.

**Rewrite:**
> "Each mini-batch repeats the dZ²→dH→dZ¹→parameter-gradient path from XOR. Adam takes those gradients and updates parameters."

---

**File:** `src/components/linux/LinuxMemoryChapter.tsx` (line 120)

**Current (EN):**
> "The CPU and kernel translate each address through the current process's page table into a physical frame."

**Violation:** Passive "are translated" (hidden in active form). Better: CPU does.

**Rewrite:**
> "The CPU and kernel use the current process's page table to translate each address into a physical frame."

---

#### 2. Long Words / Jargon Without Explanation (Rules 2, 5)

**File:** `src/components/VectorsChapter.tsx` (line 189)

**Current (EN):**
> "Vectors are a common language that lets us apply the same computational rules to very different things"

**Violation:** "computational" is jargon. 

**Rewrite:**
> "Vectors are a common language that lets us apply the same math rules to very different things"

---

**File:** `src/components/training/TrainingChapter.tsx` (line 256)

**Current (EN):**
> "Adam guarantees neither an optimum nor generalization, and learning rate still matters."

**Violation:** "guarantees neither...nor" is formal/passive construction.

**Rewrite:**
> "Adam does not find the best point or make the model generalize. Learning rate still matters."

---

#### 3. Unnecessary Words (Rule 3)

**File:** Korean chapters (18 matches across files)

**Current (KO):**
> "...를 제공합니다", "...게 합니다", "...을 보여줍니다", "...만듭니다"

**Violation:** Korean textbook-speak ("-게 합니다" = "makes it so that," passive construction). Cut 18 instances.

**Example from** `src/components/training/TrainingChapter.tsx` (line 127 KO):
> "forward pass가 낸 한 묶음의 logits를 학습 가능한 loop로 바꿉니다."

**Better:**
> "forward pass logits를 학습 loop로 바꿉니다." (remove "한 묶음의" = "one bundle of" — unnecessary filler)

---

**File:** `src/components/VectorsChapter.tsx` (line 186 EN)

**Current:**
> "The vector v = [3, 2] is more than two numbers."

**Violation:** "more than" is filler before the real point.

**Rewrite:**
> "The vector v = [3, 2] is not just two numbers. It is an arrow..."

---

#### 4. Textbook Clichés (Rule 1)

**File:** `src/components/linux/LinuxMemoryChapter.tsx` (line 231-232 EN)

**Current:**
> "You reach the goal by running translation plus COW and demand faults, repairing four misdiagnoses with numeric and state evidence, and connecting all five concepts."

**Violation:** "reach the goal" is textbook-speak. "connecting all five concepts" is vague filler.

**Rewrite:**
> "Run translation, COW, and demand faults. Repair four misdiagnoses. Answer five concept questions."

---

### Copy-Quality by Chapter (Flagged for Later PRs)

| Curriculum | Chapter | Severity | Violation Count | Example Violations |
|------------|---------|----------|-----------------|-------------------|
| transformer-from-zero | vectors | Moderate | ~5 | Long words: "computational," "ultimately"; passive constructions |
| transformer-from-zero | optimization | Moderate | ~4 | Textbook-speak: "reach steady convergence"; passive voice in NumPy cells |
| transformer-from-zero | training | High | ~8 | Korean textbook-speak (4×), passive voice (2×), long constructions (2×) |
| transformer-from-zero | neural-networks | Moderate | ~6 | "causally necessary" (jargon), passive constructions |
| transformer-from-zero | embeddings | Low | ~3 | Minor passive voice |
| transformer-from-zero | sequences | Moderate | ~5 | "temporal gradient" without plain explanation first |
| transformer-from-zero | attention | Low | ~2 | Mostly clean |
| transformer-from-zero | self-attention | Moderate | ~4 | "equivariance" without plain explanation |
| transformer-from-zero | transformer-block | Moderate | ~6 | "position-wise" jargon, passive constructions |
| transformer-from-zero | mini-transformer | Moderate | ~5 | Korean textbook-speak (3×) |
| linux-systems | shell-and-filesystem | Low | ~2 | Mostly clean, direct |
| linux-systems | boot-to-shell | Moderate | ~4 | "deterministic" without explanation first |
| linux-systems | processes-and-signals | Low | ~3 | Mostly clean |
| linux-systems | users-and-permissions | Low | ~2 | Direct prose, good model |
| linux-systems | memory-and-virtual-addresses | High | ~10 | Long academic sentences, passive voice (4×), unnecessary qualifiers (6×) |
| linux-systems | storage-and-filesystems | Moderate | ~5 | "inode·block" needs plain explanation first |
| linux-systems | networking-from-a-packet | Moderate | ~4 | Technical terms front-loaded |
| linux-systems | assemble-a-tiny-linux | Low | ~3 | Mostly clean capstone |
| linux-networking | All 6 chapters | Moderate | ~20 total | Consistent pattern: technical terms first, then explanation |
| infrastructure-design | All 8 chapters | Moderate | ~24 total | Academic prose in longer chapters |

**Recommended PR pattern:**
- When touching a chapter for citations or mini-labs, rewrite flagged violations
- Memory chapter (10 violations) should be prioritized for standalone copy fix
- Korean textbook-speak (18 matches) can be batch-fixed with regex

---

## Conclusion

Rootorial has **exceptional interaction quality** across all 32 implemented chapters, with immediate feedback, E2E tests, and rigorous touch-target audits. The two primary gaps are:

1. **Absence of learner-facing citations** (critical for academic credibility)
2. **Copy-quality violations** of Orwell's rules (moderate, affects engagement)

The recommended approach:
1. **Start with citations** (Slice 1) - lowest risk, highest impact
2. **Fix flagged copy violations** (Slice 1.5) - batch Korean fixes, inline with citation PRs
3. **Improve engagement** (Slice 2) - interleave mini-labs in dense sections
4. **Add advanced content** (Slices 3-6) - fine-tuning, containers, system architecture

This audit provides the foundation for systematic curriculum improvement while preserving the platform's core strength: **interactive, immediate-feedback learning**.

---

**Issue created:** 2026-08-27  
**Audit scope:** All 5 curricula, 40 chapters (32 implemented, 8 planned)  
**Copy-quality rules:** Orwell's 6 rules now apply to all learner-facing copy  
**Related files:**
- `src/data/curriculum.ts` - Curriculum registry
- `src/features/chapters/chapter-registry.ts` - Chapter metadata
- `docs/curriculum-audit/` - Existing audit documentation
- `e2e/` - E2E test coverage
- `src/components/**/*Chapter.tsx` - All learner-facing copy files
