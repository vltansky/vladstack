---
name: vs-debug-mode
description: "Systematic root-cause debugging with optional runtime log server for frontend/UI bugs. Hypothesis-driven investigation. Use when the user says 'debug', 'debug this', 'investigate', 'why is this broken', 'root cause', 'trace this bug', 'figure out why', 'this doesn't work', 'unexpected behavior', 'UI not updating', 'state is wrong', 'value is null/undefined', 'click doesn't work'. Also use instead of adding console.log — this skill collects logs automatically."
---

# Debug

Find the root cause. Don't guess, don't patch symptoms.

```
Reproduce → Hypothesize → Investigate → Isolate → Fix → Verify → Prevent
```

## Phase 1: Reproduce

1. **Get the exact error.** Full stack trace, exit code, failing assertion. Not a summary.
2. **Reproduce it.** If it passes now, it's intermittent — note that.
3. **Minimize the reproduction.** Smaller repro = faster investigation.

## Phase 1b: Start Log Server (frontend/UI bugs only)

**Trigger:** the bug is in a browser, needs runtime evidence, or you'd normally say "add console.log and check DevTools."

If the bug is backend/logic/CI, skip to Phase 2.

```bash
node <skill-dir>/scripts/debug_server.js /path/to/project &
```

Create session:
```bash
curl -s -X POST http://localhost:8787/session -d '{"name":"fix-null-userid"}'
```
Returns `{"session_id":"fix-null-userid-a1b2c3","log_file":"..."}`. Save the `session_id`.

**If port 8787 busy:** `lsof -ti :8787 | xargs kill -9` then restart.

## Phase 2: Hypothesize

Generate 3-5 specific, testable hypotheses. Order by likelihood.

```
H1: userId is null because caller doesn't check return value
    Test: add assertion at function entry / log at entry

H2: Config file missing in CI but present locally
    Test: check if file exists in test context

H3: Race condition — async op completes before setup
    Test: add ordering / log timestamps at both points
```

**Common root causes:** state (wrong/missing/stale/mutated), timing (race/async/timeout), environment (missing file/wrong path/config), types (boundary coercion/null), logic (off-by-one/wrong condition), integration (contract mismatch/schema drift).

## Phase 3: Investigate

For each hypothesis (most likely first):

### Without log server (backend/logic/CI)

- **Code path tracing:** find where the value comes from, trace callers, check data flow
- **Test isolation:** run just the failing test with verbose output
- **State inspection:** trace data backward from failure to origin
- **Diff analysis:** `git log --oneline -20 -- <files>` / `git diff <last-good>..HEAD`
- **Environment comparison:** versions, env vars, file existence

### With log server (frontend/UI)

Instrument code to test all hypotheses. Wrap in `// #region debug` ... `// #endregion`.

**JavaScript/TypeScript:**
```javascript
// #region debug
const SESSION_ID = 'REPLACE_WITH_SESSION_ID';
const DEBUG_LOG_URL = 'http://localhost:8787/log';
const debugLog = (msg, data = {}, hypothesisId = null) => {
  const payload = JSON.stringify({
    sessionId: SESSION_ID, msg, data, hypothesisId,
    loc: new Error().stack?.split('\n')[2],
  });
  if (navigator.sendBeacon?.(DEBUG_LOG_URL, payload)) return;
  fetch(DEBUG_LOG_URL, { method: 'POST', body: payload }).catch(() => {});
};
// #endregion
```

**Python:**
```python
# #region debug
import requests, traceback
SESSION_ID = 'REPLACE_WITH_SESSION_ID'
def debug_log(msg, data=None, hypothesis_id=None):
    try:
        requests.post('http://localhost:8787/log', json={
            'sessionId': SESSION_ID, 'msg': msg, 'data': data,
            'hypothesisId': hypothesis_id, 'loc': traceback.format_stack()[-2].strip()
        }, timeout=0.5)
    except: pass
# #endregion
```

**Guidelines:** 3-8 instrumentation points. Cover entry/exit, before/after critical ops, branch paths. Tag each log with `hypothesisId`. High-frequency events: log only on state change.

Clear logs before reproducing:
```bash
: > /path/to/project/.debug/debug-$SESSION_ID.log
```

Read logs after reproduction:
```bash
cat /path/to/project/.debug/debug-$SESSION_ID.log
```

### Classify each hypothesis

- **CONFIRMED** — evidence proves this is the cause
- **REJECTED** — evidence rules it out. Note what you learned.
- **INCONCLUSIVE** — need more evidence. Add specific next steps.

If all rejected/inconclusive: generate new hypotheses informed by what you now know. Max 3 rounds. If still stuck, escalate with everything learned.

## Phase 4: Isolate

1. Find the exact line/condition where behavior diverges.
2. Verify it's the root cause, not a symptom. "If I fix this, does the original bug go away?"
3. Check for siblings — search for the same pattern elsewhere.

## Phase 5: Fix

TDD when possible:
1. Write a test that reproduces the bug.
2. Verify it fails.
3. Apply the minimal fix.
4. Verify it passes.
5. Run full test suite — no regressions.

If using log server: keep instrumentation active, tag verification logs with `runId: "post-fix"`.

## Phase 6: Verify

- Specific failing command now passes
- Full test suite passes
- Build passes
- If log server: compare before/after logs, confirm with evidence
- If intermittent: run reproduction multiple times

## Phase 7: Clean Up

If log server was used:
1. Confirm fix with post-fix logs
2. Remove all `#region debug` instrumentation
3. Stop log server or leave for next session

Prevention (60 seconds):
1. Test missing? Add one (already done if TDD).
2. Pattern? Search for siblings. Fix now.
3. Missing guard? Add validation at the boundary.

## Reporting

```
## Debug Report
Bug: [one-line]
Root Cause: [what and why]
Evidence: [specific evidence that confirmed it]
Fix: [files and lines changed]
Prevention: [test/pattern/guard added]
Ruled Out: [rejected hypotheses — saves time if bug recurs]
```

## CORS / Mixed Content (log server)

If logs aren't arriving:
- **Mixed content**: HTTPS app → http://localhost blocked. Use dev-server proxy.
- **CSP**: `connect-src` blocks log URL. Use dev-server proxy or update CSP.
- **CORS preflight**: use `sendBeacon` (avoids preflight) or `text/plain`.

**Dev server proxy (Vite):**
```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/__log': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__log/, '/log'),
      },
    },
  },
};
```

**Chrome extension:** content scripts can't fetch localhost. Relay through background script via `chrome.runtime.sendMessage`. Background scripts have relaxed CSP.

## Rules

- **Never fix without understanding.** A fix you can't explain is a timebomb.
- **Never patch symptoms.** If a value is null, find out why — don't add a null check.
- **Evidence over intuition.** "I think it's X" is a hypothesis, not a conclusion.
- **Minimize the blast radius.** Fix the bug. Don't refactor the neighborhood.
- **Time-box investigation.** 3 rounds max. If still stuck, escalate.

## Scripts

- `scripts/debug_server.js` — log collection server (port 8787)
- `scripts/debug_cleanup.js` — clear or remove log files

## Workflow

**Prev:** test failure | user report | `/vs-autopilot` (guardrail failures)
**Next:** `/vs-tdd` (write regression test for the fix) | `/vs-roast-my-code` (review the fix)
