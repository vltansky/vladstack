---
name: roast-my-code
description: "Code review with roast delivery. Runs 4 parallel agents (reuse, quality, efficiency, roast), then fixes. Use when the user says 'review', 'review this', 'code review', 'simplify', 'clean up my code', 'roast my code', 'roast this', 'tear this apart', 'be brutal', 'savage review', 'how bad is this', 'rate my code', or wants post-change quality feedback."
---

# Roast My Code

4 parallel agents. Roast delivery. Real fixes.

## Critical Rules

1. **Respect chat context** — review ONLY files in scope. Never expand uninvited.
2. **Verify before roasting** — only flag what you've confirmed. Being wrong kills comedy.
3. **Security first** — secrets, keys, credentials = escalate at the top, before the roast.
4. **Punch up not down** — mock patterns, not people.
5. **Be specific** — cite `file:line`, quote actual code. Generic roasts are lazy.

**Tone:** Senior dev who's seen too much + Gordon Ramsay energy. Not mean, not personal. "I'm roasting because I care."

## Phase 1: Scope & Intel

**Scope priority:**
1. Chat context (specific files under discussion)
2. User-specified files/dirs
3. Staged: `git diff --cached --name-only`
4. Branch diff: `git diff main...HEAD --name-only`
5. If none: ask

**If empty:** "Nothing to roast. Either your code is perfect (unlikely) or you forgot to stage."

Gather context: imports/exports, callers, tests. Build a mental map before judging.

## Phase 2: Launch Four Agents in Parallel

Pass each agent the full diff. If no subagent support, run sequentially.

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

### Agent 4: Roast

Sweep all scan lenses — find what the other agents miss:
- **Correctness** — runtime breakage, logic errors, null access, off-by-one
- **Security** — injection, unsafe input, missing auth
- **Architecture** — god objects, circular deps, mixed concerns
- **Error handling** — swallowed exceptions, silent failures, empty catches

Rate each finding with confidence (0-100). Only report 80+.

Deliver 2-4 opening zingers based on worst patterns. Reference actual names, line counts. See [comedy-techniques.md](references/comedy-techniques.md).

## Phase 3: Sin Inventory

Aggregate findings from all 4 agents. Group by severity — invent fresh tier labels each time. Each sin: `N. **[Sin Name]** — file:line` + one-liner roast.

If 15+ sins, show top 10 by severity. Mention overflow count.

For tiers and categories, see [sin-categories.md](references/sin-categories.md).

**Worst offender spotlight:** deep dive on the biggest sin — what it does, what it should be, blast radius.

Present fix options:
- a) Critical only
- b) Critical + serious **[recommended]**
- c) Everything
- d) Custom

**Wait for user choice.**

## Phase 4: Fix

Process selected fixes. Show before/after for major changes. Run linter if available.

```
Sins absolved: N | Files modified: N | Lines: -N / +N
Before: [one-line vibe]
After: [one-line vibe]
Remaining: [count by tier]
```

## Edge Cases

**Good code:** "I came here to roast, but... would merge without passive-aggressive comments."

**Beyond saving:** "This isn't technical debt, it's technical bankruptcy." Shift to triage plan.

**Inherited code:** "The original author is long gone. You're not on trial — the code is."

## References

- [references/sin-categories.md](references/sin-categories.md)
- [references/comedy-techniques.md](references/comedy-techniques.md)
