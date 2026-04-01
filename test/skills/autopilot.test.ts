import { describe, test, expect, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { runSkillTest, type SkillTestResult } from '../helpers/session-runner';
import { EvalCollector } from '../helpers/eval-store';

/**
 * LLM judge via `claude -p` — reuses the user's Claude subscription auth
 * instead of requiring ANTHROPIC_API_KEY.
 */
async function callJudgeViaClaude<T>(prompt: string): Promise<T> {
  const promptFile = path.join(
    os.tmpdir(),
    `.judge-${process.pid}-${Date.now()}.txt`,
  );
  fs.writeFileSync(promptFile, prompt);

  const proc = Bun.spawn(
    ['sh', '-c', `cat "${promptFile}" | claude -p --model claude-sonnet-4-6 --max-turns 1 --output-format text`],
    { stdout: 'pipe', stderr: 'pipe' },
  );

  const text = await new Response(proc.stdout).text();
  await proc.exited;
  try { fs.unlinkSync(promptFile); } catch {}

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Judge returned non-JSON: ${text.slice(0, 300)}`);
  return JSON.parse(jsonMatch[0]) as T;
}

const EVALS_ENABLED = process.env.EVALS === '1';

interface EvalCase {
  id: number;
  name: string;
  prompt: string;
  expected_output: string;
  scaffold: string;
  max_turns: number;
  timeout_ms: number;
}

interface EvalJudgeResult {
  pass: boolean;
  score: number;
  phases_detected: string[];
  has_handoff: boolean;
  has_decision_log: boolean;
  reasoning: string;
}

const evalsPath = path.resolve(
  __dirname,
  '../../skills/vs-autopilot/evals/evals.json',
);
const evals: EvalCase[] = JSON.parse(fs.readFileSync(evalsPath, 'utf-8')).evals;

const skillPath = path.resolve(
  __dirname,
  '../../skills/vs-autopilot/SKILL.md',
);
const skillContent = fs.readFileSync(skillPath, 'utf-8');

const collector = new EvalCollector('e2e');
const tempDirs: string[] = [];

function scaffoldTsProject(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'autopilot-eval-project',
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: {
          test: 'bun test',
          typecheck: 'tsc --noEmit',
        },
        devDependencies: {
          typescript: '^5.5.0',
          'bun-types': '^1.2.0',
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          outDir: 'dist',
          rootDir: 'src',
          types: ['bun-types'],
        },
        include: ['src'],
      },
      null,
      2,
    ),
  );

  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'src', 'index.ts'),
    'export const VERSION = "1.0.0";\n',
  );

  spawnSync('bun', ['install'], { cwd: dir, stdio: 'pipe', timeout: 30_000 });
  spawnSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  spawnSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' });
  spawnSync('git', ['commit', '-m', 'initial commit'], {
    cwd: dir,
    stdio: 'pipe',
  });
}

function scaffoldTsProjectWithBug(dir: string): void {
  scaffoldTsProject(dir);

  fs.writeFileSync(
    path.join(dir, 'src', 'slugify.ts'),
    `export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
`,
  );

  fs.writeFileSync(
    path.join(dir, 'src', 'slugify.test.ts'),
    `import { expect, test } from 'bun:test';
import { slugify } from './slugify';

test('slugifies normal text', () => {
  expect(slugify('Hello World')).toBe('hello-world');
});

test('handles multiple spaces', () => {
  expect(slugify('  too   many  spaces  ')).toBe('too-many-spaces');
});
`,
  );

  spawnSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' });
  spawnSync('git', ['commit', '-m', 'add slugify with bug'], {
    cwd: dir,
    stdio: 'pipe',
  });
}

const scaffolds: Record<string, (dir: string) => void> = {
  'ts-project': scaffoldTsProject,
  'ts-project-with-bug': scaffoldTsProjectWithBug,
};

describe.skipIf(!EVALS_ENABLED)('autopilot', () => {
  afterAll(async () => {
    await collector.finalize();
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
    }
  });

  for (const evalCase of evals) {
    test(
      `eval #${evalCase.id}: ${evalCase.name}`,
      async () => {
        const workDir = fs.mkdtempSync(
          path.join(os.tmpdir(), `autopilot-eval-${evalCase.id}-`),
        );
        tempDirs.push(workDir);

        const scaffold = scaffolds[evalCase.scaffold];
        if (!scaffold) throw new Error(`Unknown scaffold: ${evalCase.scaffold}`);
        scaffold(workDir);

        const isCircuitBreaker = evalCase.name.includes('circuit-breaker');
        const isNoPlan = evalCase.name.includes('no-plan');

        const promptParts = [
          'You are an autonomous coding agent. Follow the skill instructions below exactly.',
          '',
          '<skill>',
          skillContent,
          '</skill>',
          '',
        ];

        if (isNoPlan) {
          promptParts.push(
            '<user-request>',
            evalCase.prompt,
            '</user-request>',
            '',
            'IMPORTANT: No implementation plan is provided — just a feature request.',
            'Follow Phase 0 Step 1a to auto-generate a plan before proceeding.',
          );
        } else {
          promptParts.push(
            '<plan>',
            evalCase.prompt,
            '</plan>',
          );
        }

        promptParts.push(
          '',
          'IMPORTANT: This is a non-interactive eval run.',
          'Do NOT ask questions or wait for user input at any point.',
          'Auto-resolve all decisions using the decision principles.',
          'Sub-skills (grill-me, tdd, roast-my-code, qa) are NOT available on disk — use built-in fallbacks as described in the skill.',
          isCircuitBreaker
            ? 'If the plan is NOT_READY, output the roast findings and stop. Do NOT proceed to execution.'
            : 'Run all phases to completion and produce the full handoff summary.',
          'Do not start a dev server.',
        );

        const prompt = promptParts.join('\n');

        const result: SkillTestResult = await runSkillTest({
          prompt,
          workingDirectory: workDir,
          maxTurns: evalCase.max_turns,
          allowedTools: [
            'Bash',
            'Read',
            'Write',
            'Edit',
            'Glob',
            'Grep',
          ],
          timeout: evalCase.timeout_ms,
          testName: `autopilot-${evalCase.name}`,
        });

        const exitOk =
          result.exitReason === 'success' ||
          result.exitReason === 'error_max_turns';
        expect(exitOk).toBe(true);

        const judgePrompt = buildJudgePrompt(evalCase, result, workDir);
        const judgeResult = await callJudgeViaClaude<EvalJudgeResult>(judgePrompt);

        const gitLog = spawnSync(
          'git',
          ['log', '--oneline', '--all'],
          { cwd: workDir, stdio: 'pipe' },
        );
        const commits = gitLog.stdout?.toString().trim() || '';

        collector.addTest({
          name: `autopilot-${evalCase.name}`,
          suite: 'autopilot',
          tier: 'e2e',
          passed: judgeResult.pass && judgeResult.score >= 3,
          duration_ms: result.duration,
          cost_usd: result.costEstimate.estimatedCost,
          turns_used: result.costEstimate.turnsUsed,
          model: result.model,
          first_response_ms: result.firstResponseMs,
          max_inter_turn_ms: result.maxInterTurnMs,
          prompt: evalCase.prompt,
          output: truncateForStorage(result.output, commits),
          transcript: result.transcript,
          browse_errors: result.browseErrors,
          exit_reason: result.exitReason,
          judge_scores: {
            quality: judgeResult.score,
            has_handoff: judgeResult.has_handoff ? 1 : 0,
            has_decision_log: judgeResult.has_decision_log ? 1 : 0,
            phases: judgeResult.phases_detected.length,
          },
          judge_reasoning: judgeResult.reasoning,
        });

        expect(judgeResult.score).toBeGreaterThanOrEqual(3);
      },
      evalCase.timeout_ms + 60_000,
    );
  }
});

function buildJudgePrompt(
  evalCase: EvalCase,
  result: SkillTestResult,
  workDir: string,
): string {
  const gitLog = spawnSync('git', ['log', '--oneline', '--all'], {
    cwd: workDir,
    stdio: 'pipe',
  });
  const commits = gitLog.stdout?.toString().trim() || '(no commits beyond initial)';

  const gitDiff = spawnSync('git', ['diff', 'HEAD~1..HEAD', '--stat'], {
    cwd: workDir,
    stdio: 'pipe',
  });
  const diffStat = gitDiff.stdout?.toString().trim() || '';

  const isCircuitBreaker = evalCase.name.includes('circuit-breaker');
  const isNoPlan = evalCase.name.includes('no-plan');

  return `You are evaluating whether an AI agent's autopilot skill correctly executed a plan.

${isNoPlan ? 'FEATURE REQUEST (no plan provided)' : 'PLAN given to autopilot'}:
${evalCase.prompt}

EXPECTED BEHAVIOR:
${evalCase.expected_output}

ACTUAL OUTPUT (final text from the agent):
${result.output.slice(0, 8000)}

GIT COMMITS in the project after autopilot ran:
${commits}

FILE CHANGES (last commit diff stat):
${diffStat}

EXIT REASON: ${result.exitReason}
TURNS USED: ${result.costEstimate.turnsUsed}
TOOL CALLS: ${result.toolCalls.length}

${isCircuitBreaker ? `This is a CIRCUIT BREAKER test. The plan is deliberately terrible. The expected behavior is that autopilot STOPS early with a NOT_READY verdict and does NOT proceed to implementation.

Score 5 if: autopilot stopped early, identified the plan as not ready, and did not create implementation code.
Score 3 if: autopilot showed concerns but still tried to implement.
Score 1 if: autopilot proceeded with implementation as if the plan were reasonable.` : isNoPlan ? `This is a NO-PLAN AUTO-GENERATE test. The user provided only a feature request, not a structured plan. Evaluate:
1. Did autopilot detect the missing plan and auto-generate one? (Check decision log or output for mention of auto-generating/creating a plan)
2. Did it then proceed through normal phases (roast, execute, review, handoff)?
3. Was the feature actually implemented with tests?
4. Does the handoff summary exist with pipeline table, decision log, and guardrail results?

Score 5 = detected missing plan, auto-generated it, full pipeline execution with proper handoff.
Score 4 = auto-generated plan and implemented, minor handoff gaps.
Score 3 = implemented the feature but didn't clearly auto-generate a plan or handoff is incomplete.
Score 2 = some work done but major gaps in plan generation or execution.
Score 1 = did not detect missing plan or failed to implement.` : `This is a HAPPY PATH test. Evaluate:
1. Did autopilot produce a handoff summary with pipeline table, decision log, and guardrail results?
2. Were commits made (not just one giant commit)?
3. Were tests written?
4. Did the implementation match the plan?

Score 5 = fully meets expectations (all phases visible, proper handoff).
Score 4 = mostly meets (minor gaps in handoff format or missing one section).
Score 3 = partially meets (implementation done but handoff incomplete or phases unclear).
Score 2 = barely meets (some work done but major gaps).
Score 1 = does not meet expectations.`}

Respond with ONLY valid JSON:
{
  "pass": true,
  "score": 4,
  "phases_detected": ["roast", "execute", "review", "handoff"],
  "has_handoff": true,
  "has_decision_log": true,
  "reasoning": "brief explanation"
}`;
}

function truncateForStorage(output: string, commits: string): string {
  const maxOutput = 4000;
  const truncated = output.length > maxOutput
    ? output.slice(0, maxOutput) + '\n... (truncated)'
    : output;
  return `${truncated}\n\n--- GIT LOG ---\n${commits}`;
}
