# vladstack

Plan-to-ship skill kit for AI coding agents. One pipeline, zero babysitting.

```
/brainstorm → /grill-me → /rfc-research → /autopilot → /ship-it → /fix-pr
```

## Why

Most AI coding workflows are one-shot: you prompt, the agent writes code, you review. vladstack chains that into a full pipeline where each stage feeds the next -- stress-test the idea, research and plan, build with TDD, review, QA, ship a PR, and handle reviewer feedback. The agent drives the whole thing; you step in only when it flags something.

The idea combines three influences:
- **gstack's** plan-to-ship pipeline -- a structured chain from idea to merged PR
- **superpowers'** composable skills -- each skill is self-contained, discovers others by filesystem path, and degrades gracefully when a dependency is missing
- **octocode MCP's** code forensics -- real GitHub evidence backing research and review instead of the agent guessing

The result: skills that work standalone (`/tdd`, `/debug-mode`, `/roast-my-code`) but also snap together into an autonomous pipeline (`/autopilot`) that dispatches parallel subagent workers, runs TDD, reviews its own output, and QA-tests the result before handing off.

## Install

### vladstack plugin

```bash
/plugin marketplace add vltansky/vladstack
/plugin install vladstack@vladstack
/reload-plugins
```

### Codex plugin (recommended, enables cross-model review in `/roast-my-code`)

Requires [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`) and a ChatGPT subscription or OpenAI API key.

```bash
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

## Commands

### Pipeline

| Command | What it does |
|---------|-------------|
| `/brainstorm` | Collaborative design session — explore intent, refine idea into spec |
| `/grill-me` | Adversarial stress-test — challenges premises, scores readiness |
| `/autopilot` | Autonomous build: roast → fix → TDD execute → review → QA → handoff |
| `/ship-it` | Create PR (runs `/roast-my-code` first if not already run) |
| `/fix-pr` | Address reviewer feedback — fix, reply, resolve threads |

### Review

| Command | What it does |
|---------|-------------|
| `/roast-my-code` | Two-pass review: simplify (auto-fix) → roast + Codex cross-model review |

### Standalone

| Command | What it does |
|---------|-------------|
| `/tdd` | Red/green/refactor — write failing test first |
| `/debug-mode` | Hypothesis-driven debugging + runtime log server for frontend |
| `/qa` | Browser-based QA testing with atomic fix commits |
| `/octocode-research` | Deep GitHub code search and exploration |
| `/rfc-research` | Evidence-backed RFC / technical proposal |

## Workflow

```
brainstorm → octocode-research → rfc-research → grill-me → autopilot → ship-it ⇄ fix-pr
                                                    ↕
                          debug-mode → tdd → roast-my-code → ship-it
                                               ↑
                                               qa
```

Every skill has a `## Workflow` section with **Prev/Next** links.

See [docs/workflow.md](docs/workflow.md) for the full pipeline and autopilot internals.

## How it works

**Autopilot dispatches subagent workers via SDD:**
- Each worker gets isolated context + specific task
- Workers report: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
- Independent steps run in parallel (dependency layers)
- Review runs in background while next layer executes

**`/roast-my-code` is a two-pass review:**
- Pass 1 (Simplify): 3 parallel agents (reuse, quality, efficiency) — auto-apply fixes
- Pass 2 (Roast + Codex): cross-model review from a different LLM — present sins interactively

**`/ship-it` gates on review:** if `/roast-my-code` hasn't run in the session, it runs automatically before creating the PR.

**Skills compose by loading each other from disk.** Every dependency is optional.

## External dependencies

- [dev-browser](https://github.com/anthropics/dev-browser) — headless browser (used by /qa)
- [octocode MCP](https://github.com/bgauryy/octocode-mcp) — GitHub code search (used by /rfc-research, /grill-me)
- [Codex CLI](https://github.com/openai/codex) — cross-model review (used by /roast-my-code)
- `gh` CLI — GitHub operations (used by /ship-it, /fix-pr)

## Credits

vladstack is inspired by and builds on ideas from:

- [gstack](https://github.com/garrytan/gstack) — plan-to-ship pipeline architecture
- [superpowers](https://github.com/obra/superpowers) — composable skill patterns
- [octocode MCP](https://github.com/bgauryy/octocode-mcp) — GitHub code forensics

## License

MIT
