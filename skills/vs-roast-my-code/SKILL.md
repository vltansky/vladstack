---
name: vs-roast-my-code
description: "Code review: auto-fix (reuse, quality, efficiency), then roast + Codex cross-model review. Use when the user says 'review', 'review this', 'code review', 'simplify', 'clean up my code', 'roast my code', 'roast this', 'tear this apart', 'be brutal', 'savage review', 'how bad is this', 'rate my code', or wants post-change quality feedback."
---

# Roast My Code

Two-pass review. First pass cleans. Second pass roasts what's left.

## Critical Rules

1. **Respect chat context** — review ONLY files in scope. Never expand uninvited.
2. **Verify before roasting** — only flag what you've confirmed. Being wrong kills comedy.
3. **Security first** — secrets, keys, credentials = escalate at the top, before anything else.
4. **Punch up not down** — mock patterns, not people.
5. **Be specific** — cite `file:line`, quote actual code. Generic roasts are lazy.

**Tone:** Senior dev who's seen too much + Gordon Ramsay energy. Not mean, not personal. "I'm roasting because I care."

## Phase 0: Scope

**Priority:**
1. Chat context (specific files under discussion)
2. User-specified files/dirs
3. Staged: `git diff --cached --name-only`
4. Branch diff: `git diff main...HEAD --name-only`
5. If none: ask

**If empty:** "Nothing to roast. Either your code is perfect (unlikely) or you forgot to stage."

---

## Pass 1: Simplify (auto-fix)

Clean the code first. Run 3 agents in parallel, auto-apply fixes, no user interaction.

Get the full diff: `git diff` (or `git diff HEAD` for staged changes).

### Agent 1: Code Reuse

1. Search for existing utilities that could replace new code
2. Flag functions duplicating existing functionality — suggest the existing one
3. Flag inline logic where an existing utility applies

### Agent 2: Code Quality

1. Redundant state / derived values that should be computed
2. Parameter sprawl instead of restructuring
3. Copy-paste with variation that should be unified
4. Leaky abstractions breaking encapsulation
5. Stringly-typed code where constants/enums exist
6. Unnecessary JSX nesting adding no layout value
7. Comments explaining WHAT (delete; keep only non-obvious WHY)
8. AI slop: hallucinated imports, verbose boilerplate, defensive nulls on non-null types, wrappers adding zero logic

### Agent 3: Efficiency

1. Redundant computations, repeated reads, duplicate API calls, N+1
2. Independent operations that could run in parallel
3. Blocking work on hot paths (startup, per-request, per-render)
4. No-op state updates in loops/intervals — add change-detection guards
5. TOCTOU existence checks — operate directly, handle error
6. Unbounded data structures, missing cleanup, listener leaks
7. Reading entire files when only a portion is needed

### Auto-apply

Aggregate findings from all 3 agents. Fix each issue directly. Skip false positives — don't argue, just move on. Briefly summarize what was fixed.

---

## Pass 2: Roast + Codex Review

Run on the cleaned code. Two agents in parallel: Roast (local) + Codex (cross-model).

### Agent 4: Roast

Gather intel first: imports/exports, callers, tests. Then sweep all scan lenses — find what Pass 1 missed:
- **Correctness** — runtime breakage, logic errors, null access, off-by-one
- **Security** — injection, unsafe input, missing auth
- **Architecture** — god objects, circular deps, mixed concerns
- **Error handling** — swallowed exceptions, silent failures, empty catches

Rate each finding with confidence (0-100). Only report 80+.

Deliver 2-4 opening zingers based on worst patterns. Reference actual names, line counts. See [comedy-techniques.md](references/comedy-techniques.md).

### Agent 5: Codex Review

Cross-model second opinion from a different LLM.

**In Claude Code:** run the codex plugin's review command:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" review --wait
```
If `CLAUDE_PLUGIN_ROOT` is not set or the script doesn't exist, fall back to:
```bash
codex review 2>/dev/null
```
If neither works, skip — log "Codex review unavailable" and continue with roast only.

**In Codex:** use the built-in `/review` slash command on the same diff scope.

Parse the JSON output (findings array with title, body, priority, code_location). Map Codex priorities to roast severity: P0/P1 = Critical, P2 = Serious, P3 = Minor.

---

## Sin Inventory

Aggregate findings from Roast + Codex. Deduplicate — if both flag the same line, keep the more specific finding. Tag Codex-only findings so the user sees the cross-model signal.

Group by severity — invent fresh tier labels each time. Each sin: `N. **[Sin Name]** — file:line` + one-liner roast.

If 15+ sins, show top 10 by severity. Mention overflow count.

For tiers and categories, see [sin-categories.md](references/sin-categories.md).

**Worst offender spotlight:** deep dive on the biggest sin — what it does, what it should be, blast radius.

Present fix options:
- a) Critical only
- b) Critical + serious **[recommended]**
- c) Everything
- d) Custom

**Wait for user choice.**

## Fix

Process selected fixes. Show before/after for major changes. Run linter if available.

```
Pass 1: [N] issues auto-fixed
Pass 2: [N] sins found, [M] absolved
Files modified: N | Lines: -N / +N
Remaining: [count by tier]
```

## Edge Cases

**Good code:** "I came here to roast, but... would merge without passive-aggressive comments."

**Beyond saving:** "This isn't technical debt, it's technical bankruptcy." Shift to triage plan.

**Inherited code:** "The original author is long gone. You're not on trial — the code is."

## References

- [references/sin-categories.md](references/sin-categories.md)
- [references/comedy-techniques.md](references/comedy-techniques.md)

## Workflow

**Prev:** `/vs-autopilot` (runs review internally) | `/vs-tdd` | `/vs-qa` | any implementation work
**Next:** `/vs-ship-it` (create PR — runs review automatically if skipped)
