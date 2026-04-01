# vladstack Workflow

## The Pipeline

```
/grill-me ──→ /rfc (or plan mode) ──→ /autopilot ──→ /ship-it ──→ /fix-pr
    │               │                      │              │               │
 challenge       research +            build it        create PR      address
 the idea        write plan          autonomously                    feedback
```

Each skill's handoff suggests the next step. The chain is natural.

## Full Flow

### 1. /grill-me — Challenge the idea

**Input:** A plan, idea, or proposal
**Output:** Stress-test report with score and verdict

Adversarial review across 7 dimensions (premise, assumptions, feasibility,
edge cases, security, maintainability, scope). Scores readiness 0-100.

Uses octocode-research for pre-scan: searches GitHub for existing solutions,
patterns that contradict the plan, and simpler alternatives.

**Handoff:** "Next: write an RFC with /rfc-research or refine the plan."

### 2. /rfc-research — Write the plan

**Input:** Topic or problem statement
**Output:** Evidence-backed RFC document

Researches the topic using octocode MCP, produces an RFC with prior art
analysis, alternatives, and risks.

Alternative: use Claude's native plan mode for simpler plans.

**Handoff:** "Next: /autopilot to implement."

### 3. /autopilot — Build it

**Input:** A reviewed plan
**Output:** A shippable branch with commits, tests, and passing guardrails

See [Autopilot Flow](#autopilot-flow) below.

**Handoff:** "All green → /ship-it. Failures → fix first."

### 4. /ship-it — Create PR

**Input:** A branch with commits
**Output:** GitHub PR with conventional format + AI session context

**Handoff:** "When reviewers comment → /fix-pr."

### 5. /fix-pr — Address feedback

**Input:** PR with review comments
**Output:** Fixes applied, replies posted, threads resolved

**Handoff:** "All addressed. Push and wait for approval."

---

## Autopilot Flow

Autopilot is a controller that dispatches workers (subagents) through 7 phases.
Zero human interaction except the circuit breaker.

```
Phase 0: Setup
  ├── Read CLAUDE.md (test/build/lint commands)
  ├── Read plan file
  ├── Create feature branch
  └── Extract plan steps + dependency graph

Phase 1: Roast (loads /grill-me as worker)
  ├── Load grill-me SKILL.md from disk
  ├── Follow full methodology — auto-decide all questions
  ├── Decision principles handle every interactive point
  └── Circuit breaker: NOT_READY (score < 60) → stop, ask user

Phase 2: Fix Plan
  ├── Apply high-severity findings to plan
  ├── Note medium/low in decision log
  └── Re-extract steps if plan structure changed

Phase 3: Execute (SDD — subagent workers)
  ├── Add debug instrumentation (#region autopilot-debug)
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

Phase 4: Review (loads /simplify as worker)
  ├── Collect pipelined review findings
  ├── 3 parallel review agents: reuse, quality, efficiency
  ├── Apply fixes, re-run guardrails
  └── Revert any fix that breaks execution code

Phase 5: QA (loads /qa as worker, web apps only)
  ├── Detect web app
  ├── Diff-aware mode (only pages affected by branch)
  ├── Debug logs provide runtime evidence
  └── Fix bugs atomically, revert on regression

Phase 6: Cleanup
  ├── Remove all #region autopilot-debug instrumentation
  ├── Run full guardrails
  └── Commit: "chore: remove autopilot debug instrumentation"

Phase 7: Handoff
  ├── Pipeline summary table
  ├── Decision log
  ├── Guardrail results
  ├── Flagged items for human review
  └── Suggest: /ship-it
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
| /tdd | autopilot workers | Bug fixes, test-first features |
| /debug | autopilot (guardrail failures) | Any root-cause investigation |
| /debug-mode | autopilot (instrumentation) | Frontend runtime debugging |
| /simplify | autopilot (review phase) | Post-change quality sweep |
| /qa | autopilot (QA phase) | Test any running web app |
| /octocode-research | grill-me, rfc-research | Deep GitHub code research |
| /roast-my-code | standalone | Comedic code review |

## Skill Composition

Skills discover each other by filesystem path. Every dependency is optional
with graceful fallback:

| Missing | Fallback |
|---------|----------|
| grill-me | Built-in lightweight review |
| tdd | Tests after implementation |
| debug | Basic debugging |
| simplify | Lightweight self-review |
| qa | Skipped |
| octocode | Web search |
