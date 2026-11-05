import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseSanityFailures, evaluateSanityCriterion } from '../scripts/benchmark-sanity.js';

describe('Item 3: CI Cost, Scheduled Sanity Workflow & Benchmark Documentation', () => {
  const rootDir = process.cwd();

  it('ci.yml does not run benchmark:sanity, only runs --compare for PRs and push', () => {
    const ciContent = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf-8');
    assert.doesNotMatch(ciContent, /benchmark:sanity/, 'ci.yml must not run benchmark:sanity');
    assert.match(ciContent, /--compare \${{ github\.event\.pull_request\.base\.sha }}/, 'ci.yml must compare base sha on PR');
  });

  it('benchmark-sanity.yml exists with nightly schedule, workflow_dispatch, and job timeout', () => {
    const sanityWorkflowPath = path.join(rootDir, '.github/workflows/benchmark-sanity.yml');
    assert.ok(fs.existsSync(sanityWorkflowPath), 'benchmark-sanity.yml must exist');

    const content = fs.readFileSync(sanityWorkflowPath, 'utf-8');
    assert.match(content, /schedule:/, 'Must have schedule trigger');
    assert.match(content, /workflow_dispatch:/, 'Must have workflow_dispatch trigger');
    assert.match(content, /timeout-minutes:\s*\d+/, 'Must configure a job timeout');
    assert.match(content, /benchmark:sanity/, 'Must run benchmark:sanity');
  });

  it('sanity criterion: passes if at most 1 of 20 fails, fails if > 1 fails, and reports failing rows', () => {
    // 0 failures -> passes
    const res0 = evaluateSanityCriterion(20, 0, []);
    assert.equal(res0.passed, true);

    // 1 failure -> passes (criterion: at most 1 of 20 self-compares fails)
    const mockOutput1 = `
| ❌ FAIL | SSR & Serialization | SSR: Secret Scrubbing (500 items deep scan) | 0.360ms | 0.520ms | +44.4% | +40% | 1,900 | 450 |
`;
    const failures1 = parseSanityFailures(1, mockOutput1);
    assert.equal(failures1.length, 1);
    assert.equal(failures1[0].name, 'SSR: Secret Scrubbing (500 items deep scan)');
    assert.equal(failures1[0].category, 'SSR & Serialization');
    assert.equal(failures1[0].delta, '+44.4%');

    const res1 = evaluateSanityCriterion(20, 1, failures1);
    assert.equal(res1.passed, true, 'At most 1 of 20 failures must pass sanity criterion');
    assert.equal(res1.failingRows.length, 1);

    // 2 failures -> fails
    const res2 = evaluateSanityCriterion(20, 2, failures1);
    assert.equal(res2.passed, false, 'More than 1 failure must fail sanity criterion');
  });

  it('benchmarks/README.md documents gate mechanics, statistic, and single-row re-run instructions', () => {
    const readmeContent = fs.readFileSync(path.join(rootDir, 'benchmarks/README.md'), 'utf-8');

    // How the gate works
    assert.match(readmeContent, /comparative/i, 'Must document comparative gate execution');
    assert.match(readmeContent, /interleaved/i, 'Must document interleaved runs on the same machine');

    // Statistic used
    assert.match(readmeContent, /trimmed median/i, 'Must document trimmed median statistic');
    assert.match(readmeContent, /both (the )?median and (the )?min/i, 'Must document compound rule requiring both median and min');

    // Single-row re-run
    assert.match(readmeContent, /--benchmark/i, 'Must document single-row re-run using --benchmark');
    assert.match(readmeContent, /npm run benchmark:gate -- --compare/i, 'Must document command to re-run');
  });
});
