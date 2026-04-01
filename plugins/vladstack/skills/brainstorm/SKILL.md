---
name: brainstorm
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

## First Response — Be Fast

Your first message MUST be a clarifying question. Do NOT explore files, create tasks, or research anything before asking the first question. Get the conversation moving immediately.

## Triage — Scale Process to Scope

After 1-2 questions, assess scope:

| Scope | Signals | Process |
|-------|---------|---------|
| **Small** | Config change, UI tweak, single-file feature, clear requirements | Questions → Design (verbal) → Approval → Implement |
| **Medium** | Multi-file feature, some unknowns, new component | Questions → Design → Approval → Write spec → Implement |
| **Large** | New system, architecture decision, multiple subsystems, unfamiliar tech | Questions → Research → Design → Write spec → Self-review → Grill-me → Implement |

Default to **small** unless evidence says otherwise. Create tasks only for medium/large scope.

## The Process

### Ask Clarifying Questions

- Ask questions one at a time — don't overwhelm
- Prefer multiple choice when possible
- Focus on: purpose, constraints, success criteria
- Explore context (files, docs, commits) lazily — only when a question requires it, and do it in the background while asking
- If the request describes multiple independent subsystems, flag it immediately and help decompose before diving in

### Research Prior Art (large scope only)

Only fires for large scope: architecture decisions, new systems, greenfield features, library/tool selection, unfamiliar patterns.

Launch one background subagent while continuing questions. Prefer octocode MCP tools (`githubSearchCode`, `githubViewRepoStructure`) when available; fall back to GitHub search. If no external search tools exist, skip silently.

Before proposing approaches, present a short **Prior Art** section:
- 2-4 bullet points max, readable in 30 seconds
- What was found, which projects, what pattern they used

The user reacts before you propose approaches.

### Propose Approaches

- Propose 2-3 different approaches with trade-offs
- Lead with your recommendation and explain why
- Reference prior art when available

### Present the Design

- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify

**Design for isolation and clarity:**
- Break into smaller units with one clear purpose and well-defined interfaces
- Each unit should be understandable and testable independently
- Smaller, well-bounded units are easier to work with — better reasoning, more reliable edits

**Working in existing codebases:**
- Explore the current structure before proposing changes. Follow existing patterns.
- Where existing code has problems that affect the work, include targeted improvements as part of the design
- Don't propose unrelated refactoring

### Write Spec (medium/large only)

- Write to `docs/specs/YYYY-MM-DD-<topic>-design.md` (user preferences override this)
- Commit the design document

**Spec self-review (large only):**
1. Placeholder scan — any TBD, TODO, incomplete sections? Fix them.
2. Internal consistency — do sections contradict each other?
3. Scope check — focused enough for a single implementation plan?
4. Ambiguity check — any requirement interpretable two ways? Pick one.

Fix issues inline and move on.

**User review gate:**
> "Spec written and committed to `<path>`. Review it and let me know if you want changes before implementation."

### Stress-Test (large only)

After user approves the spec:
> "Before we build — I recommend `/grill-me` on this design to find what breaks before code is written. Skip with `no` to go straight to implementation."

### Transition to Implementation

Proceed to plan mode or begin implementation based on the approved design.

## Key Principles

- **Fast first response** — ask, don't explore
- **Scale to scope** — small features get light process
- **One question at a time** — don't overwhelm
- **YAGNI ruthlessly** — remove unnecessary features
- **Explore alternatives** — propose 2-3 approaches before settling
- **Incremental validation** — present design, get approval before moving on
