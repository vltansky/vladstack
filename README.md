# vladstack

Plan-to-ship skill kit for AI coding agents. One pipeline, zero babysitting.

```
/grill-me → /rfc → /autopilot → /ship-it → /fix-pr
```

## Install

Claude Code plugin:

```bash
/plugin marketplace add vltansky/vladstack
/plugin install vladstack@vladstack
/reload-plugins
```

## Commands

### Pipeline

| Command | What it does |
|---------|-------------|
| `/grill-me` | Adversarial stress-test — challenges premises, scores readiness |
| `/autopilot` | Autonomous build: roast → fix → TDD execute → review → QA → handoff |
| `/ship-it` | Create PR with conventional format + AI session context |
| `/fix-pr` | Address reviewer feedback — fix, reply, resolve threads |

### Standalone

| Command | What it does |
|---------|-------------|
| `/tdd` | Red/green/refactor — write failing test first |
| `/debug` | Hypothesis-driven root-cause investigation |
| `/qa` | Browser-based QA testing with atomic fix commits |
| `/simplify` | 3 parallel review agents + auto-fix |
| `/roast-my-code` | Brutally honest code review with comedic flair |

## How it works

See [docs/workflow.md](docs/workflow.md) for the full pipeline and autopilot internals.

**Autopilot dispatches subagent workers via SDD:**
- Each worker gets isolated context + specific task
- Workers report: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
- Independent steps run in parallel (dependency layers)
- Review runs in background while next layer executes

**Skills compose by loading each other from disk.** Every dependency is optional.

## External dependencies

- [dev-browser](https://github.com/anthropics/dev-browser) — headless browser (used by /qa)
- [octocode MCP](https://github.com/nicepkg/octocode) — GitHub code search (used by /rfc-research, /grill-me)
- `gh` CLI — GitHub operations (used by /ship-it, /fix-pr)

## License

MIT
