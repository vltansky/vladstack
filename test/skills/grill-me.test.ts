import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runSkillTest, type SkillTestResult } from '../helpers/session-runner';
import { callJudge } from '../helpers/llm-judge';
import { EvalCollector } from '../helpers/eval-store';

const EVALS_ENABLED = process.env.EVALS === '1';

interface EvalCase {
  id: number;
  prompt: string;
  expected_output: string;
  files: string[];
}

interface EvalJudgeResult {
  pass: boolean;
  score: number;
  reasoning: string;
}

const evalsPath = path.resolve(__dirname, '../../plugins/vladstack/skills/grill-me/evals/evals.json');
const evals: EvalCase[] = JSON.parse(fs.readFileSync(evalsPath, 'utf-8')).evals;

const collector = new EvalCollector('e2e');
let workDir: string;

describe.skipIf(!EVALS_ENABLED)('grill-me', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grill-me-eval-'));
  });

  afterAll(async () => {
    await collector.finalize();
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  });

  for (const evalCase of evals) {
    test(`eval #${evalCase.id}: ${evalCase.prompt.slice(0, 60)}...`, async () => {
      const result: SkillTestResult = await runSkillTest({
        prompt: `/grill-me ${evalCase.prompt}\n\nIMPORTANT: Do not ask me any questions. Produce the full stress-test report non-interactively as if I answered "skip" to every question. Output the final report only.`,
        workingDirectory: workDir,
        maxTurns: 10,
        allowedTools: ['Bash', 'Read', 'Write', 'Glob', 'Grep'],
        timeout: 180_000,
        testName: `grill-me-${evalCase.id}`,
      });

      expect(result.exitReason).toBe('success');
      expect(result.browseErrors).toHaveLength(0);

      const judgeResult = await callJudge<EvalJudgeResult>(`You are evaluating whether an AI agent's output meets the expected behavior for a "grill-me" stress-test skill.

PROMPT given to the agent:
${evalCase.prompt}

EXPECTED BEHAVIOR:
${evalCase.expected_output}

ACTUAL OUTPUT:
${result.output}

Evaluate whether the actual output satisfies the expected behavior. Be strict but fair:
- The output does not need to match word-for-word, but must demonstrate the same capabilities described.
- Score 1-5 where 5 = fully meets expectations, 3 = partially meets, 1 = does not meet.
- Pass threshold: score >= 3.

Respond with ONLY valid JSON:
{"pass": true, "score": 4, "reasoning": "brief explanation"}`);

      collector.addTest({
        name: `grill-me-${evalCase.id}`,
        suite: 'grill-me',
        tier: 'e2e',
        passed: judgeResult.pass && judgeResult.score >= 3,
        duration_ms: result.duration,
        cost_usd: result.costEstimate.estimatedCost,
        turns_used: result.costEstimate.turnsUsed,
        model: result.model,
        first_response_ms: result.firstResponseMs,
        max_inter_turn_ms: result.maxInterTurnMs,
        prompt: evalCase.prompt,
        output: result.output,
        transcript: result.transcript,
        browse_errors: result.browseErrors,
        exit_reason: result.exitReason,
        judge_scores: { quality: judgeResult.score },
        judge_reasoning: judgeResult.reasoning,
      });

      expect(judgeResult.score).toBeGreaterThanOrEqual(3);
    }, 200_000);
  }
});
