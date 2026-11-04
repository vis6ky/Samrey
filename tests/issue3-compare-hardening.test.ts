import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Item 3: --compare Hardening & Worktree Lifecycle', () => {
  const scriptPath = path.resolve(process.cwd(), 'benchmarks', 'check-regression.ts');

  it('a ref containing $(...) does not execute anything, does not create marker file, and exits non-zero', () => {
    const markerFile = path.join(os.tmpdir(), `samrey-injection-marker-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    if (fs.existsSync(markerFile)) fs.unlinkSync(markerFile);

    const maliciousRef = `$(touch ${markerFile})`;

    const result = spawnSync(process.execPath, ['--import', 'tsx', scriptPath, '--compare', maliciousRef], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // 1. Must exit non-zero
    assert.notEqual(result.status, 0, 'Must exit non-zero on invalid/injected ref');

    // 2. Marker file MUST NOT exist (no command substitution execution)
    assert.equal(fs.existsSync(markerFile), false, 'Command injection must not have executed');

    // 3. Clear error message without silent fallback to results.json
    const combinedOutput = (result.stdout || '') + (result.stderr || '');
    assert.match(combinedOutput, /could not be resolved/i, 'Must output clear ref resolution error message');
    assert.doesNotMatch(combinedOutput, /falling back to baseline results\.json/i, 'Must NOT silently fall back to results.json');

    if (fs.existsSync(markerFile)) {
      try { fs.unlinkSync(markerFile); } catch {}
    }
  });

  it('a ref containing backticks, quotes, or spaces does not execute and exits non-zero', () => {
    const markerFile = path.join(os.tmpdir(), `samrey-backtick-marker-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    if (fs.existsSync(markerFile)) fs.unlinkSync(markerFile);

    const backtickRef = `\`touch ${markerFile}\``;

    const result = spawnSync(process.execPath, ['--import', 'tsx', scriptPath, '--compare', backtickRef], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    assert.notEqual(result.status, 0, 'Must exit non-zero on backtick ref');
    assert.equal(fs.existsSync(markerFile), false, 'Backtick execution must not occur');

    const quoteSpaceRef = 'HEAD " && echo hacked';
    const result2 = spawnSync(process.execPath, ['--import', 'tsx', scriptPath, '--compare', quoteSpaceRef], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    assert.notEqual(result2.status, 0, 'Must exit non-zero on quote/space injection ref');
  });

  it('a nonexistent ref exits non-zero with a clear error message and no fallback', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', scriptPath, '--compare', 'nonexistent-ref-abc-12345'],
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    assert.notEqual(result.status, 0, 'Must exit non-zero on nonexistent ref');
    const combinedOutput = (result.stdout || '') + (result.stderr || '');
    assert.match(combinedOutput, /could not be resolved/i);
    assert.doesNotMatch(combinedOutput, /falling back to baseline results\.json/i);
  });

  it('cleans up temporary git worktree when aborted with SIGINT / SIGTERM', async () => {
    // Launch check-regression with 50 runs so child is actively in execution loop when signal arrives
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', scriptPath, '--compare', 'HEAD', '--runs', '50', 'compiler'],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let output = '';
    let worktreeCreated = false;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Timed out waiting for worktree creation'));
      }, 15000);

      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        // Once base runs have started executing
        if (output.includes('Executing base ref') && !worktreeCreated) {
          worktreeCreated = true;
          clearTimeout(timeout);
          // Send SIGINT while active
          child.kill('SIGINT');
          resolve();
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Wait for child process to terminate
    await new Promise<void>((resolve) => {
      child.on('close', () => resolve());
    });

    assert.equal(worktreeCreated, true, 'Worktree setup should have commenced');

    // Extract the specific worktree path created by this child process
    const match = output.match(/Setting up git worktree at "([^"]+)"/);
    const childWorktree = match ? match[1] : null;
    assert.ok(childWorktree, `Must have logged child worktree path, output was:\n${output}`);

    // Verify the specific child worktree was removed from filesystem
    assert.equal(fs.existsSync(childWorktree), false, 'Child worktree folder must be deleted');

    // Verify the specific child worktree is no longer registered in git
    const worktreeList = spawnSync('git', ['worktree', 'list'], { encoding: 'utf-8' }).stdout || '';
    assert.ok(
      !worktreeList.includes(childWorktree),
      `Child worktree ${childWorktree} must be completely removed from git worktree list:\n${worktreeList}`
    );
  });
});
