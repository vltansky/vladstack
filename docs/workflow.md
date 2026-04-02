# vladstack Workflow

## The Pipeline

```
/vs-brainstorm ──→ /vs-grill-me ──→ built-in plan mode ──→ /vs-autopilot ──→ /vs-ship-it ──→ /vs-fix-pr
      │                  │                  │                  │                 │                │
  explore idea       challenge          refine into        build it          create PR       address
  RFC + plan         the idea           impl plan        autonomously                        feedback
      ↕
/vs-octocode-research
  (deep-dive code search)
```

Each skill's handoff suggests the next step. The chain is natural.

## Full Flow

### 0. /vs-brainstorm — Explore, design, and document

**Input:** A rough idea or feature request
**Output:** RFC (human artifact: what/why) + Plan (agent artifact: how)

Collaborative design session: explores project context, asks clarifying questions
one at a time, researches prior art, proposes approaches with trade-offs. For
medium/large scope, writes an RFC for human review — once approved, generates
an implementation plan for the agent to follow.

**Handoff:** `/vs-grill-me` (stress-test the RFC) | `/vs-octocode-research` (dig deeper)

### 1. /vs-octocode-research — Explore code

**Input:** A question about code ("how does X work", "where is Y defined")
**Output:** Data-driven findings with exact file references

Discovers relevant repos via octocode MCP, clones them locally for fast
interactive research. User drives the exploration with instant local
Grep/Read/Glob responses.

**Handoff:** `/vs-brainstorm` (design based on findings) | `/vs-grill-me` (stress-test a design) | `/vs-autopilot` (implement)

### 3. /vs-grill-me — Challenge the idea

**Input:** A plan, idea, or proposal
**Output:** Stress-test report with score and verdict

Adversarial review across 7 dimensions (premise, assumptions, feasibility,
edge cases, security, maintainability, scope). Scores readiness 0-100.

Uses vs-octocode-research for pre-scan: searches GitHub for existing solutions,
patterns that contradict the plan, and simpler alternatives.

**Handoff:** `/vs-autopilot` (execute the grilled plan) | fix the plan and `/vs-grill-me` again

### 4. /vs-autopilot — Build it

**Input:** A reviewed plan
**Output:** A shippable branch with commits, tests, and passing guardrails

See [Autopilot Flow](#autopilot-flow) below.

**Handoff:** All green → `/vs-ship-it`. Failures → fix first.

### 5. /vs-ship-it — Create PR

**Input:** A branch with commits
**Output:** GitHub PR with conventional format + AI session context

Runs `/vs-roast-my-code` first if it hasn't been run in the session.

**Handoff:** When reviewers comment → `/vs-fix-pr`.

### 6. /vs-fix — Fix a bug autonomously

**Input:** Bug description, GitHub issue, error/stack trace, or failing test
**Output:** Clean branch with fix, regression test, and passing guardrails

Autonomous bug fix pipeline. Loads vs-debug-mode, vs-tdd, vs-qa, vs-octocode-research,
and vs-roast-my-code on demand. Four circuit breakers halt the run when the
fix can't proceed safely.

**Handoff:** `/vs-ship-it` (create PR) | `/vs-roast-my-code` (manual review)

### 7. /vs-fix-pr — Address feedback

**Input:** PR with review comments
**Output:** Fixes applied, replies posted, threads resolved

**Handoff:** `/vs-ship-it` (re-push) | `/vs-roast-my-code` (self-review before re-push) | done

---

## Autopilot Flow

Autopilot is a controller that dispatches workers (subagents) through 7 phases.
Zero human interaction except the circuit breaker.

```
Phase 0: Setup
  ├── Read CLAUDE.md (test/build/lint commands)
  ├── Validate guardrail commands work
  ├── Read plan file
  ├── Create feature branch
  └── Extract plan steps + dependency graph

Phase 1: Roast (loads /vs-grill-me as worker)
  ├── Load vs-grill-me SKILL.md from disk
  ├── Follow full methodology — auto-decide all questions
  ├── Decision principles handle every interactive point
  └── Circuit breaker: NOT_READY (score < 60) → stop, ask user

Phase 2: Fix Plan
  ├── Apply high-severity findings to plan
  ├── Note medium/low in decision log
  └── Re-extract steps if plan structure changed

Phase 3: Execute (SDD — subagent workers)
  ├── Add debug instrumentation (existing code only, #region autopilot-debug)
  ├── Group steps into dependency layers
  ├── For each layer:
  │     ├── Dispatch parallel workers (one per independent step)
  │     ├── Each worker follows TDD:
  │     │     ├── Write failing test
  │     │     ├── Implement to make it pass
  │     │     ├── Run guardrails (tsc, test, lint)
  │     │     └── Report: DONE / DONE_WITH_CONCERNS / BLOCKED
  │     ├── BLOCKED workers → controller handles directly
  │     └── Pipeline: review worker on completed layer (background)
  └── Final validation (full suite + build)

Phase 4: Review (loads /vs-roast-my-code as worker)
  ├── Pass 1 (Simplify): 3 parallel agents — auto-fix
  │     ├── Code reuse
  │     ├── Code quality
  │     └── Efficiency
  ├── Pass 2 (Roast + Codex): cross-model review
  │     ├── Roast agent (correctness, security, architecture, error handling)
  │     └── Codex review (second opinion from different LLM)
  ├── Auto-select option b (critical + serious) — no user interaction
  ├── Apply fixes, re-run guardrails
  └── Revert any fix that breaks execution code

Phase 5: QA (loads /vs-qa as worker, web apps only)
  ├── Detect web app
  ├── Diff-aware mode (only pages affected by branch)
  ├── Debug logs provide runtime evidence
  └── Fix bugs atomically, revert on regression

Phase 6: Cleanup
  ├── Remove all #region autopilot-debug instrumentation (if added)
  ├── Run full guardrails
  └── Commit: "chore: remove autopilot debug instrumentation"

Phase 7: Handoff
  ├── Pipeline summary table
  ├── Decision log (every auto-resolved decision)
  ├── Guardrail results
  ├── Flagged items for human review
  └── Suggest: /vs-ship-it
```

### Worker Status Protocol

| Status | Meaning | Controller action |
|--------|---------|-------------------|
| **DONE** | Complete, guardrails pass | Next layer |
| **DONE_WITH_CONCERNS** | Complete but something smells off | Log, continue |
| **BLOCKED** | Can't proceed | Controller handles directly |
| **NEEDS_CONTEXT** | Missing information | Provide context, re-dispatch |

### Decision Principles

1. **Completeness** — ship the whole thing
2. **Pragmatic** — simpler option wins ties
3. **DRY** — reuse what exists
4. **Explicit over clever** — 10-line fix > 200-line abstraction
5. **Bias toward action** — flag concerns, don't block
6. **Match the codebase** — follow existing patterns

### Circuit Breaker

One stop point: NOT_READY (score < 60) with unresolved high-severity issues.

---

## Helper Skills

| Skill | Used by | Standalone use |
|-------|---------|----------------|
| /vs-fix | standalone | Autonomous end-to-end bug fix pipeline |
| /vs-tdd | vs-autopilot workers, /vs-fix | Bug fixes, test-first features |
| /vs-debug-mode | vs-autopilot (guardrail failures + instrumentation), /vs-fix | Any root-cause investigation + frontend log server |
| /vs-roast-my-code | vs-autopilot (review phase), vs-ship-it (gate) | Two-pass code review with cross-model Codex review |
| /vs-qa | vs-autopilot (QA phase) | Test any running web app |
| /vs-octocode-research | vs-brainstorm, vs-grill-me | Local-first code research |

## Skill Composition

Skills discover each other by filesystem path. Every dependency is optional
with graceful fallback:

| Missing | Fallback |
|---------|----------|
| vs-grill-me | Built-in lightweight review |
| vs-tdd | Tests after implementation |
| vs-debug-mode | Basic debugging |
| vs-roast-my-code | Lightweight self-review |
| vs-qa | Skipped |
| octocode | Web search |
| codex | Roast-only review (no cross-model) |
