/**
 * @license Apache-2.0
 * @samrey/monorepo - TypeScript Ambient .samrey Declaration Verification
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

describe('TypeScript Ambient .samrey Module Declarations', () => {
  let tmpDir: string;
  const tscBin = path.resolve(process.cwd(), 'node_modules/.bin/tsc');

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-ts-consumer-'));
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function setupConsumerModules(projectDir: string): void {
    const nodeModulesSamrey = path.join(projectDir, 'node_modules', '@samrey');
    fs.mkdirSync(nodeModulesSamrey, { recursive: true });
    const runtimeTarget = path.resolve(process.cwd(), 'packages/runtime');
    const reactivityTarget = path.resolve(process.cwd(), 'packages/reactivity');
    fs.symlinkSync(runtimeTarget, path.join(nodeModulesSamrey, 'runtime'), 'dir');
    fs.symlinkSync(reactivityTarget, path.join(nodeModulesSamrey, 'reactivity'), 'dir');
  }

  it('typechecks consumer project importing .samrey with triple-slash reference and HTMLElement | DocumentFragment return', () => {
    const projDir = path.join(tmpDir, 'triple-slash');
    fs.mkdirSync(path.join(projDir, 'src'), { recursive: true });
    setupConsumerModules(projDir);

    // 1. Create .samrey template files in consumer project
    fs.writeFileSync(path.join(projDir, 'SingleRoot.samrey'), '<div><span>Single</span></div>');
    fs.writeFileSync(path.join(projDir, 'MultiRoot.samrey'), '<header>Head</header><main>Body</main>');

    // 2. tsconfig.json for consumer project
    fs.writeFileSync(
      path.join(projDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            strict: true,
            skipLibCheck: false
          },
          include: ['src/**/*']
        },
        null,
        2
      )
    );

    // 3. consumer source with documented /// <reference types="@samrey/runtime/ambient" />
    fs.writeFileSync(
      path.join(projDir, 'src', 'index.ts'),
      `/// <reference types="@samrey/runtime/ambient" />

import SingleRoot from '../SingleRoot.samrey';
import MultiRoot from '../MultiRoot.samrey';

// Single-root usage
const single = SingleRoot({ title: 'Test' });

// Multi-root returns HTMLElement | DocumentFragment
const multi = MultiRoot();

// Type assertion: ReturnType of .samrey must be exactly HTMLElement | DocumentFragment
type ReturnT = ReturnType<typeof MultiRoot>;
type IsExact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
const exactCheck: IsExact<ReturnT, HTMLElement | DocumentFragment> = true;

// Multi-root usage with DOM operations
function renderToContainer(container: HTMLElement, root: HTMLElement | DocumentFragment): void {
  container.appendChild(root);
}

function processFragment(frag: DocumentFragment): void {
  console.log(frag.childNodes.length);
}

if (multi instanceof DocumentFragment) {
  processFragment(multi);
}

renderToContainer(document.body, single);
renderToContainer(document.body, multi);

export { single, multi, exactCheck };
`
    );

    // Run tsc on the consumer project using local typescript compiler binary
    let tscOutput = '';
    let tscSucceeded = false;
    try {
      tscOutput = execSync(`"${tscBin}" --noEmit`, { cwd: projDir, encoding: 'utf-8', stdio: 'pipe' });
      tscSucceeded = true;
    } catch (err: any) {
      tscOutput = (err.stdout || '') + (err.stderr || '') + (err.message || '');
    }

    assert.ok(
      tscSucceeded,
      `tsc failed on consumer project with documented ambient reference:\n${tscOutput}`
    );
  });

  it('typechecks consumer project using tsconfig "types" configuration', () => {
    const projDir = path.join(tmpDir, 'types-config');
    fs.mkdirSync(path.join(projDir, 'src'), { recursive: true });
    setupConsumerModules(projDir);

    fs.writeFileSync(path.join(projDir, 'App.samrey'), '<div><span>App</span></div>');
    fs.writeFileSync(path.join(projDir, 'Layout.samrey'), '<nav></nav><main></main>');

    fs.writeFileSync(
      path.join(projDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            strict: true,
            skipLibCheck: false,
            types: ['@samrey/runtime/ambient']
          },
          include: ['src/**/*']
        },
        null,
        2
      )
    );

    fs.writeFileSync(
      path.join(projDir, 'src', 'main.ts'),
      `import App from '../App.samrey';
import Layout from '../Layout.samrey';

type LayoutReturn = ReturnType<typeof Layout>;
type IsExact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
const typeCheck: IsExact<LayoutReturn, HTMLElement | DocumentFragment> = true;

const appEl: HTMLElement | DocumentFragment = App();
const layoutEl: HTMLElement | DocumentFragment = Layout();

export { appEl, layoutEl, typeCheck };
`
    );

    let tscOutput = '';
    let tscSucceeded = false;
    try {
      tscOutput = execSync(`"${tscBin}" --noEmit`, { cwd: projDir, encoding: 'utf-8', stdio: 'pipe' });
      tscSucceeded = true;
    } catch (err: any) {
      tscOutput = (err.stdout || '') + (err.stderr || '') + (err.message || '');
    }

    assert.ok(
      tscSucceeded,
      `tsc failed on consumer project with tsconfig types setup:\n${tscOutput}`
    );
  });
});
