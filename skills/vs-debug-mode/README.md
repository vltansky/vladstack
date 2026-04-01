# debug-mode

Systematic root-cause debugging with optional runtime log server for frontend/UI bugs. Hypothesis-driven investigation with evidence collection.

## Install

```bash
npx skills add vltansky/vladstack/skills/debug-mode -g -y
```

## Prerequisites

- Access to the codebase and its test runner
- Node.js (for the log server, frontend bugs only)

## Usage

Trigger phrases:
- "debug", "debug this", "debug mode"
- "investigate", "why is this broken"
- "root cause", "trace this bug"
- "figure out why", "this doesn't work"
- "UI not updating", "state is wrong"

## How it works

1. **Reproduce** — confirm the bug, minimize the repro
2. **Log server** (frontend/UI only) — start `scripts/debug_server.js`, create session
3. **Hypothesize** — 3-5 specific, testable hypotheses
4. **Investigate** — gather evidence (code tracing or runtime logs), confirm/reject each
5. **Isolate** — find the exact root cause (not symptoms)
6. **Fix** — TDD when possible (failing test -> fix -> verify)
7. **Verify** — prove it works, run full suite
8. **Clean up** — remove debug instrumentation, stop log server

## Scripts

- `scripts/debug_server.js` — log collection server on port 8787
- `scripts/debug_cleanup.js` — clear or remove log files

## License

MIT
