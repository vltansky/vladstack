# fix

Autonomous bug fix pipeline. Investigates root cause, reproduces with a failing test, fixes, verifies, reviews, and hands back a clean branch.

## Install

```bash
npx skills add vltansky/vladstack/skills/fix -g -y
```

## Prerequisites

- A test runner (auto-detected from CLAUDE.md or package.json)
- `gh` CLI (for GitHub issue input)
- Optional: agent-browser (for browser-based reproduction of web bugs)

## Usage

Trigger phrases:
- "fix", "fix this bug", "fix this"
- "something is broken", "this doesn't work"
- Any bug description

Accepts multiple input types:
- Bug description in words (default)
- GitHub issue URL or `#123`
- Error message or stack trace
- Failing test output

## How it works

1. **Classify** — detect input type, set up branch and guardrails
2. **Understand** — identify affected area, trace code paths
3. **Hypothesize** — generate testable hypotheses, investigate each
4. **Reproduce** — write a failing test proving the bug (TDD red phase)
5. **Fix** — minimal implementation to make the test pass (TDD green phase)
6. **Verify** — full guardrails (tests, typecheck, build)
7. **Review** — roast-my-code two-pass review on the diff
8. **Handoff** — present results, suggest `/ship-it`

## Circuit breakers

Four conditions halt the autonomous run:
1. Can't identify root cause after 3 investigation rounds
2. Can't reproduce the bug after 3 attempts
3. Fix causes more test failures than it solves
4. Bug is in an external dependency or infrastructure

## License

MIT
