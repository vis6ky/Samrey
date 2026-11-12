/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 Developer Assistant Test Suite
 *
 * Verifies the Samrey Developer Assistant UI, Search Engine, Knowledge Retrieval,
 * Provider Abstraction, and Security Sanitization.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import { AssistantView } from '../../src/components/AssistantView.js';
import {
  KNOWLEDGE_BASE,
  POPULAR_PROMPTS,
  queryKnowledgeBase
} from '../../src/data/assistantKnowledge.js';
import {
  DeterministicKnowledgeProvider,
  SmartAssistantProvider
} from '../../src/lib/assistantProvider.js';
import { renderMarkdown, formatInlineMarkdown } from '../../src/lib/markdown.js';

function isSamreyElement(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return true;
  return (node as any).nodeType === 1 && typeof (node as any).tagName === 'string';
}

describe('Phase 24 — Samrey Developer Assistant', () => {

  it('1. Verifies AssistantView instantiates cleanly using Samrey native el()', () => {
    const view = AssistantView();
    assert.ok(isSamreyElement(view), 'AssistantView must return a native Samrey element');
    const elementId = (view as any).getAttribute ? (view as any).getAttribute('id') : (view as any).id;
    assert.equal(elementId, 'samrey-assistant-view');

    // Verify search input element exists
    const input = (view as HTMLElement).querySelector('input');
    assert.ok(input, 'Search input must exist');

    // Verify submit button element exists
    const buttons = (view as HTMLElement).querySelectorAll('button');
    assert.ok(buttons.length > 0, 'Buttons must exist');

    // Verify layout classes
    assert.ok((view as HTMLElement).classList.contains('space-y-8'), 'Root element has layout styling');
  });

  it('2. Verifies all 10 core developer questions are indexed in knowledge base', () => {
    assert.ok(POPULAR_PROMPTS.length >= 10, 'Must have at least 10 popular prompts');

    for (const prompt of POPULAR_PROMPTS) {
      const answer = queryKnowledgeBase(prompt);
      assert.ok(answer, `Knowledge query must return answer for: "${prompt}"`);
      assert.ok(answer.title, 'Answer must have a title');
      assert.ok(answer.shortAnswer, 'Answer must have section 1 (short answer)');
      assert.ok(answer.concept, 'Answer must have section 2 (concept)');
      assert.ok(answer.recommendedApi, 'Answer must have section 3 (recommended API)');
      assert.ok(answer.whenToUse, 'Answer must have section 4 (when to use)');
      assert.ok(Array.isArray(answer.implementationSteps) && answer.implementationSteps.length > 0, 'Answer must have section 5 (implementation steps)');
      assert.ok(answer.tsCodeExample, 'Answer must have section 6 (TypeScript code example)');
      assert.ok(answer.codeExplanation, 'Answer must have section 8 (code explanation)');
      assert.ok(Array.isArray(answer.commonMistakes) && answer.commonMistakes.length > 0, 'Answer must have section 10 (common mistakes)');
      assert.ok(Array.isArray(answer.relatedApis) && answer.relatedApis.length > 0, 'Answer must have section 11 (related APIs)');
      assert.ok(Array.isArray(answer.docLinks) && answer.docLinks.length > 0, 'Answer must have section 12 (documentation links)');
    }
  });

  it('3. Verifies deterministic knowledge provider answers component data transfer', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I transfer data between components?');

    assert.ok(answer.title.includes('Data Transfer') || answer.title.includes('Component'), 'Title matches topic');
    assert.ok(answer.recommendedApi.includes('createContext') || answer.recommendedApi.includes('Props'), 'Recommends createContext or Props');
    assert.ok(answer.tsCodeExample.includes('@samrey/runtime'), 'Code imports @samrey/runtime');
    assert.ok(answer.tsCodeExample.includes('@samrey/reactivity'), 'Code imports @samrey/reactivity');
  });

  it('4. Verifies deterministic knowledge provider answers reactive store creation', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I create a reactive store?');

    assert.ok(answer.recommendedApi.includes('createStore'), 'Recommends createStore API');
    assert.ok(answer.tsCodeExample.includes('createStore'), 'Code uses createStore');
    assert.ok(answer.tsCodeExample.includes('produce'), 'Code demonstrates produce mutation');
  });

  it('5. Verifies deterministic knowledge provider answers API calls and HTTP fetching', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I call an API?');

    assert.ok(answer.recommendedApi.includes('createHttpClient') || answer.recommendedApi.includes('resource'), 'Recommends createHttpClient or resource');
    assert.ok(answer.tsCodeExample.includes('@samrey/http'), 'Code imports @samrey/http');
  });

  it('6. Verifies deterministic knowledge provider answers form validation', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I validate a form?');

    assert.ok(answer.recommendedApi.includes('createForm'), 'Recommends createForm');
    assert.ok(answer.tsCodeExample.includes('@samrey/forms'), 'Code imports @samrey/forms');
  });

  it('7. Verifies deterministic knowledge provider answers routing questions', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I create a route?');

    assert.ok(answer.recommendedApi.includes('createRouter') || answer.recommendedApi.includes('Router'), 'Recommends router APIs');
    assert.ok(answer.tsCodeExample.includes('@samrey/router'), 'Code imports @samrey/router');
  });

  it('8. Verifies deterministic knowledge provider answers SSR and Hydration', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I implement SSR?');

    assert.ok(answer.recommendedApi.includes('renderToString') || answer.recommendedApi.includes('hydrate'), 'Recommends SSR and hydration APIs');
    assert.ok(answer.tsCodeExample.includes('@samrey/ssr') || answer.tsCodeExample.includes('@samrey/runtime'), 'Code uses ssr/runtime packages');
  });

  it('9. Verifies deterministic knowledge provider answers XSS prevention', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I prevent XSS?');

    assert.ok(answer.recommendedApi.includes('sanitizeHtml') || answer.recommendedApi.includes('sanitizeUri'), 'Recommends security sanitizers');
    assert.ok(answer.tsCodeExample.includes('@samrey/security'), 'Code imports @samrey/security');
  });

  it('10. Verifies deterministic knowledge provider answers SAMREY error diagnostics', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I handle a SAMREY-301 error?');

    assert.ok(answer.title.includes('SAMREY-301'), 'Identifies SAMREY-301 error code');
    assert.ok(answer.category === 'errors', 'Classified under errors category');
    assert.ok(answer.recommendedApi.includes('ErrorBoundary'), 'Recommends ErrorBoundary');

    const legacyAnswer = await provider.askQuestion('How do I handle an AETH-301 error?');
    assert.ok(legacyAnswer.title.includes('SAMREY-301'), 'Normalizes legacy AETH-301 error code to SAMREY-301');
  });

  it('11. Verifies graceful handling of foreign framework questions (useState/useCallback)', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I use useState or useCallback?');

    assert.ok(answer.shortAnswer.includes('does NOT have `useState`'), 'Clarifies Samrey zero-hook paradigm');
    assert.ok(answer.recommendedApi.includes('signal'), 'Directs user to native signal API');
    assert.ok(answer.tsCodeExample.includes('@samrey/reactivity'), 'Provides native Samrey code');
  });

  it('12. Verifies SmartAssistantProvider gracefully falls back when server is offline', async () => {
    const smartProvider = new SmartAssistantProvider();
    const answer = await smartProvider.askQuestion('How do I update DOM elements when a signal changes?');

    assert.ok(answer, 'Smart provider returns valid answer');
    assert.ok(answer.title.includes('DOM') || answer.title.includes('Signal'), 'Title matches signal DOM topic');
    assert.ok(answer.tsCodeExample.includes('@samrey/runtime'), 'Provides Samrey runtime code');
  });

  it('13. Verifies Markdown renderer sanitizes malicious XSS scripts in assistant outputs', () => {
    const maliciousMarkdown = `
# Dangerous Response
<script>alert("XSS")</script>
<img src="x" onerror="alert(1)">
[dangerous link](javascript:stealCookie())

\`\`\`typescript
const safe = true;
\`\`\`
`;
    const rendered = renderMarkdown(maliciousMarkdown, { enableCopyCode: true });
    assert.ok(isSamreyElement(rendered), 'Rendered output is a native Samrey element');

    // Test inline sanitizer
    const safeOutput = renderMarkdown(maliciousMarkdown);
    assert.ok(isSamreyElement(safeOutput));

    const inlineSanitized = formatInlineMarkdown('[click me](javascript:alert(1)) <script>alert("xss")</script>');
    assert.ok(!inlineSanitized.includes('javascript:'), 'Must sanitize javascript: URI scheme');
    assert.ok(!inlineSanitized.includes('<script>'), 'Must escape script tags');

    // Bug 9: attribute breakout, underscore in URLs, and code span preservation
    const attrBreakout = formatInlineMarkdown('[x](https://a.com/"onclick="alert(1))');
    assert.ok(!attrBreakout.includes('"onclick='), 'Must attribute-escape quotes inside href');

    const imgBreakout = formatInlineMarkdown('![x" onerror="alert(1)](https://a.com/pic.png)');
    assert.ok(!imgBreakout.includes('" onerror="alert(1)'), 'Must attribute-escape quotes inside img alt');

    const urlWithUnderscores = formatInlineMarkdown('[doc](https://a.com/my_file_v1)');
    assert.ok(urlWithUnderscores.includes('href="https://a.com/my_file_v1"'), 'Must not corrupt URLs with underscores into <em>');

    const codeWithUnderscores = formatInlineMarkdown('`my_var_name`');
    assert.ok(codeWithUnderscores.includes('>my_var_name</code>'), 'Must preserve underscores inside inline code spans');
  });

  it('14. Verifies copy code button functionality on rendered code blocks', () => {
    const markdown = `
\`\`\`typescript
import { signal } from '@samrey/reactivity';
export const count = signal(0);
\`\`\`
`;
    const rendered = renderMarkdown(markdown, { enableCopyCode: true });
    const copyBtn = (rendered as HTMLElement).querySelector('button');
    assert.ok(copyBtn, 'Copy button must be rendered on fenced code block');
    assert.ok(copyBtn.getAttribute('aria-label')?.includes('Copy') || copyBtn.textContent?.includes('Copy'), 'Button has copy label');
  });

  it('15. Verifies runtimeSandbox executes all playground presets cleanly and blocks sandbox escape attempts (Bug 9)', async () => {
    const { executeSamreyCode, PLAYGROUND_PRESETS } = await import('../../src/lib/runtimeSandbox.js');
    assert.ok(PLAYGROUND_PRESETS.length >= 4);

    for (const preset of PLAYGROUND_PRESETS) {
      const result = executeSamreyCode(preset.code);
      assert.equal(result.success, true, `Preset ${preset.id} failed: ${result.error}`);
    }

    const typedDemo = executeSamreyCode(
      'interface Props { initial?: number }\nexport function Demo(props: Props = { initial: 7 }): unknown {\n  const count: number = props.initial ?? 0;\n  return el("div", { class: "p-6-card" }, String(count));\n}'
    );
    assert.equal(typedDemo.success, true, typedDemo.error);

    const maliciousSnippets = [
      '({}).constructor.constructor("return window")()',
      '(0, eval)("1+1")',
      'eval("1+1")',
      'new Function("return 1")()',
      'window.location = "https://evil.com"',
      'fetch("https://evil.com")',
      'setTimeout("alert(1)", 0)',
      'el("div", null, `${document.cookie}`)',
      'const k = "const" + "ructor"; ({})[k]',
      '[][ "flat" ][ "const" + "ructor" ]("return process")()',
      'const { ["const" + "ructor"]: c } = {}; el("div", null, String(c))',
      'const f = async () => {}; f["const" + "ructor"]',
      'const o = {}; o["__pro" + "to__"] = { polluted: true }; el("div")',
      'while (true) {} el("div", null, "never")'
    ];
    for (const payload of maliciousSnippets) {
      const res = executeSamreyCode(payload);
      assert.equal(res.success, false, `Must reject unsafe sandbox payload: ${payload}`);
    }

    // Verify interactive closures returned by the AST sandbox still execute reactively
    const counterRes = executeSamreyCode(PLAYGROUND_PRESETS[0].code);
    assert.equal(counterRes.success, true);
    const incBtn = ((counterRes.node as any)?.querySelectorAll?.('button') ?? [])
      .find((b: any) => String(b.textContent || '').includes('+'));
    if (incBtn && typeof incBtn.click === 'function') {
      incBtn.click();
    }

    // Top-level loop calling helper closure must not reset step budget
    const nopLoopRes = executeSamreyCode('function nop() {} for (let i = 0; i < 250000; i++) { nop(); } el("div")');
    assert.equal(nopLoopRes.success, false, 'Top-level loop with helper calls must hit execution step limit');

    // Host intrinsics cannot have static properties mutated from inside sandbox
    const intrinsicMutationRes = executeSamreyCode('Error.prepareStackTrace = () => "pwned"; el("div")');
    assert.equal(intrinsicMutationRes.success, false, 'Must block host Error intrinsic mutation');

    // Named async function expression binds its own name cleanly, and benign prototype words in comments/idents work
    const benignAsyncRes = executeSamreyCode(`
      // Safe comment mentioning prototype
      export function SafeDemo() {
        const prototypeLabel = 'ok';
        const fn = async function selfNamed(n) { return typeof selfNamed === 'function' ? n : -1; };
        return el('div', { 'data-fn': typeof fn }, prototypeLabel);
      }
    `);
    assert.equal(benignAsyncRes.success, true, benignAsyncRes.error);
  });

  it('16. Enforces Batch 3 AST sandbox boundaries, async step budget, try/catch non-bypass, async operators, and PlaygroundModal safety', async () => {
    const { executeSamreyCode, sanitizeSandboxErrorMessage } = await import('../../src/lib/runtimeSandbox.js');
    const { evaluateSandboxedProgram } = await import('../../src/lib/sandboxInterpreter.js');
    const { PlaygroundModal } = await import('../../src/components/PlaygroundModal.js');

    // 1. Dangerous tags & attrs via el()/svgEl() must be blocked
    for (const snippet of [
      'el("script", null, "alert(1)")',
      'el("iframe", { srcdoc: "<script>alert(1)</script>" })',
      'el("img", { src: "x", onerror: "alert(1)" })',
      'svgEl("script", null, "alert(1)")',
      'const d = el("div"); d["inner" + "HTML"] = "<b>x</b>"; d',
      'const d = el("div"); d["outer" + "HTML"] = "<b>x</b>"; d',
      'const d = el("div"); const p = d["parent" + "Node"]; el("div")',
      'const d = el("div"); d["getRoot" + "Node"](); el("div")',
      'delete Math.max; el("div")',
      'Map.prototype.pwned = true; el("div")',
      'Array.prototype.pwned = true; el("div")',
      'try { while (true) {} } catch (e) {} el("div")',
      'try { function r() { return r(); } r(); } catch (e) {} finally {} el("div")',
      '(async () => { try { while (true) { await Promise.resolve(); } } catch (e) {} })'
    ]) {
      if (snippet.startsWith('(async')) {
        const asyncFn = evaluateSandboxedProgram(`return ${snippet};`, {}, []) as () => Promise<unknown>;
        await assert.rejects(() => asyncFn(), /step limit|SandboxAbortError/i);
      } else {
        const res = executeSamreyCode(snippet);
        assert.equal(res.success, false, `Sandbox must block payload: ${snippet}`);
      }
    }

    // 2. Async microtask/Promise chain must NOT reset cumulative step budget across await points
    const asyncStepBombFn = evaluateSandboxedProgram(`
      return async function burn() {
        let s = 0;
        for (let j = 0; j < 6; j++) {
          for (let i = 0; i < 40000; i++) {
            s += i;
          }
          await Promise.resolve();
        }
        return s;
      };
    `, {}, []) as () => Promise<number>;
    await assert.rejects(() => asyncStepBombFn(), /Execution step limit exceeded/i);

    // 3. Sandbox exposes validators, bindField, createForm, createHttpClient AND handles circular console args
    const logs: string[] = [];
    const validFeatures = executeSamreyCode(`
      const circ = { a: 1 };
      circ.ref = circ;
      console.log(circ);
      const f = createForm({ initialValues: { email: '' }, validators: { email: [validators.required('Need email')] } });
      const reqErr = validators.required('Req')('');
      const hasBind = typeof bindField === 'function';
      const client = createHttpClient('/');
      let forInKeys = [];
      let loopKey;
      for (loopKey in { a: 1, b: 2 }) { forInKeys.push(loopKey); }
      el("div", {
        "data-req": String(reqErr),
        "data-bind": String(hasBind),
        "data-client": String(typeof client.get === 'function'),
        "data-keys": forInKeys.join(',')
      }, f.fields.email ? "ok" : "no")
    `, (m) => logs.push(m));
    assert.equal(validFeatures.success, true, validFeatures.error);
    assert.ok(logs.some((l) => l.includes('[Circular]')));
    assert.equal((validFeatures.node as any).getAttribute('data-req'), 'Req');
    assert.equal((validFeatures.node as any).getAttribute('data-bind'), 'true');
    assert.equal((validFeatures.node as any).getAttribute('data-client'), 'true');
    assert.equal((validFeatures.node as any).getAttribute('data-keys'), 'a,b');

    // 4. Async Unary (!), Update (++obj[await k]), and Sequence ((await 1, await 2)) work accurately
    const asyncOpsFn = evaluateSandboxedProgram(`
      return async () => {
        let o = { x: 4 };
        const a = !(await Promise.resolve(false));
        const b = ++o[await Promise.resolve('x')];
        const c = (await Promise.resolve(10), await Promise.resolve(20));
        return { a, b, c };
      };
    `, {}, []) as () => Promise<{ a: boolean; b: number; c: number }>;
    const asyncOpsResult = await asyncOpsFn();
    assert.deepEqual(asyncOpsResult, { a: true, b: 5, c: 20 });

    // 5. PlaygroundModal sanitizes host stack paths and error output cleanly
    assert.ok(!sanitizeSandboxErrorMessage('boom at /Users/dev/secret/app.ts:42:9').includes('/Users/dev/secret'));
    const { createRoot } = await import('@samrey/reactivity');
    createRoot((dispose) => {
      const isOpen = { value: true };
      const code = { value: 'throw new Error("boom at /Users/dev/secret/app.ts:42:9");' };
      const modal = PlaygroundModal({ isOpen, code }) as any;
      assert.ok(modal);
      const seen = new WeakSet<object>();
      const collectText = (n: any): string => {
        if (!n || typeof n !== 'object') return String(n ?? '');
        if (seen.has(n)) return '';
        seen.add(n);
        let txt = typeof n.textContent === 'string' ? n.textContent : '';
        if (Array.isArray(n.childNodes)) {
          for (const c of n.childNodes) txt += collectText(c);
        }
        return txt;
      };
      const renderedText = collectText(modal);
      assert.ok(!renderedText.includes('/Users/dev/secret/app.ts'), 'PlaygroundModal must not expose host file paths in rendered error');
      dispose();
    });
  });

  it('17. Item 8 regression: guards Object.freeze intrinsics, mocks createHttpClient, blocks DOM sink mutations, scopes async depth, and cleans up timers', async () => {
    const { executeSamreyCode } = await import('../../src/lib/runtimeSandbox.js');
    const { evaluateSandboxedProgram } = await import('../../src/lib/sandboxInterpreter.js');
    const { validators } = await import('@samrey/forms');

    // 1. Object.freeze cannot freeze host intrinsics or shared namespaces
    for (const freezePayload of [
      'Object.freeze(Error); el("div")',
      'Object.freeze(Array.prototype); el("div")',
      'Object.freeze(Object); el("div")',
      'Object.freeze(validators); el("div")'
    ]) {
      const res = executeSamreyCode(freezePayload);
      assert.equal(res.success, false, `Expected failure for: ${freezePayload}`);
    }
    assert.equal(Object.isFrozen(Error), false, 'Host Error must never be frozen by sandbox');
    assert.equal(Object.isFrozen(Array.prototype), false, 'Host Array.prototype must never be frozen by sandbox');
    assert.equal(Object.isFrozen(validators), false, 'Shared @samrey/forms validators must never be frozen by sandbox');
    // User-created object freeze inside sandbox still works
    const freezeUserObj = executeSamreyCode('const o = Object.freeze({ x: 1 }); el("div", { "data-f": String(Object.isFrozen(o)) })');
    assert.equal(freezeUserObj.success, true, freezeUserObj.error);
    assert.equal((freezeUserObj.node as any).getAttribute('data-f'), 'true');

    // 2. createHttpClient in sandbox is mocked and NEVER hits global fetch
    let realFetchCalls = 0;
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => {
      realFetchCalls++;
      return new Response('{}', { status: 200 });
    };
    try {
      const httpMockFn = evaluateSandboxedProgram(`
        return async (createClient) => {
          const client = createClient('/');
          try {
            await client.get('/api/secret');
            return 'leaked';
          } catch (err) {
            return String(err && err.message || err);
          }
        };
      `, {}, []) as (createClient: unknown) => Promise<string>;
      const sandboxCreateClient = await (async () => {
        // Capture the sandbox's own createHttpClient via executeSamreyCode log side-channel or run full snippet:
        const probe = executeSamreyCode(`
          const c = createHttpClient('/');
          c.get('/api/secret').catch((e) => console.warn(e.message));
          el("div", { "data-has-get": String(typeof c.get === 'function') })
        `);
        assert.equal(probe.success, true, probe.error);
        await new Promise((r) => setTimeout(r, 15));
        assert.equal(realFetchCalls, 0, 'Sandbox createHttpClient must NEVER invoke host fetch()');
        return httpMockFn;
      })();
      assert.ok(sandboxCreateClient);
    } finally {
      (globalThis as any).fetch = origFetch;
    }

    // 3. Post-creation DOM mutations via setAttribute / setAttributeNS / write / blocked sinks are rejected even with real DOM document.createElement
    const origDocument = (globalThis as any).document;
    const makeDomDoc = () => {
      const makeElem = (tag: string): any => {
        const attrs: Record<string, string> = {};
        return {
          nodeType: 1,
          tagName: tag.toUpperCase(),
          style: {},
          attrs,
          setAttribute: (k: string, v: string) => { attrs[k] = String(v); },
          setAttributeNS: (_ns: string | null, k: string, v: string) => { attrs[k] = String(v); },
          getAttribute: (k: string) => attrs[k] ?? null,
          appendChild: () => {},
          addEventListener: () => {}
        };
      };
      return {
        createElement: makeElem,
        createElementNS: (_ns: string, tag: string) => makeElem(tag),
        createTextNode: (t: string) => ({ nodeType: 3, textContent: t }),
        createComment: (t: string) => ({ nodeType: 8, textContent: t }),
        createDocumentFragment: () => ({ nodeType: 11, childNodes: [], appendChild: () => {} })
      };
    };
    (globalThis as any).document = makeDomDoc();
    try {
      for (const domAttack of [
        'const d = el("div"); d.setAttribute("onclick", "alert(1)"); d',
        'const d = el("div"); d.setAttribute("srcdoc", "<script>alert(1)</script>"); d',
        'const d = el("a"); d.setAttribute("href", "javascript:alert(1)"); d',
        'const d = el("div"); d.setAttributeNS(null, "onload", "alert(1)"); d',
        'const d = el("div"); d.setHTMLUnsafe("<b>x</b>"); d',
        'const d = el("div"); d.attachShadow({ mode: "open" }); d'
      ]) {
        const attackRes = executeSamreyCode(domAttack);
        assert.equal(attackRes.success, false, `Must block DOM post-creation attack: ${domAttack}`);
      }
      const safeDomRes = executeSamreyCode('const d = el("a"); d.setAttribute("href", "https://samrey.dev"); d.setAttribute("data-ok", "1"); d');
      assert.equal(safeDomRes.success, true, safeDomRes.error);
      assert.equal((safeDomRes.node as any).getAttribute('data-ok'), '1');
    } finally {
      if (origDocument === undefined) delete (globalThis as any).document;
      else (globalThis as any).document = origDocument;
    }

    // 4. Promise.all of 15 concurrent depth-15 async calls succeeds, while single depth-200 async recursion aborts
    const concurrentAsyncRes = await (evaluateSandboxedProgram(`
      async function dive(n) {
        if (n <= 0) return 1;
        await Promise.resolve();
        return await dive(n - 1);
      }
      return async () => {
        const branchResults = await Promise.all(
          Array.from({ length: 15 }, () => dive(15))
        );
        return branchResults.length;
      };
    `, {}, []) as () => Promise<number>)();
    assert.equal(concurrentAsyncRes, 15, '15 concurrent depth-15 async chains must NOT exhaust MAX_CALL_DEPTH');

    const deepAsyncRecursionFn = evaluateSandboxedProgram(`
      async function inf(n) {
        if (n <= 0) return 0;
        await Promise.resolve();
        return await inf(n - 1);
      }
      return () => inf(200);
    `, {}, []) as () => Promise<number>;
    await assert.rejects(() => deepAsyncRecursionFn(), /Maximum call stack depth exceeded/);

    // 5. Timers: clearTimeout & clearInterval work, and active timers are cleared on owner dispose()
    const timerLogs: string[] = [];
    const timerRes = executeSamreyCode(`
      const to = setTimeout(() => { console.log('timeout-fired'); }, 5);
      clearTimeout(to);
      const iv = setInterval(() => { console.log('cleared-interval-fired'); }, 5);
      clearInterval(iv);
      setInterval(() => { console.log('leaked-interval-tick'); }, 5);
      el("div", null, "timer-test")
    `, (msg) => timerLogs.push(msg));
    assert.equal(timerRes.success, true, timerRes.error);
    assert.equal(typeof timerRes.dispose, 'function', 'executeSamreyCode must expose dispose() for timer cleanup');
    timerRes.dispose!();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(timerLogs.filter((l) => l.includes('-fired') || l.includes('-tick')).length, 0, `Disposed timers must not fire, got: ${JSON.stringify(timerLogs)}`);

    // 6. Batch 3 red-team: sanitize & enforce style, srcset/imagesrcset/ping, style.cssText, Attr.value, and toString TOCTOU
    for (const domAttack of [
      'const d = el("div"); d.setAttribute("style", "color: red; background: url(javascript:alert(1))"); d',
      'const d = el("img"); d.setAttribute("srcset", "javascript:alert(1) 1x"); d',
      'const d = el("link"); d.setAttribute("imagesrcset", "javascript:alert(1) 1x"); d',
      'const d = el("a"); d.setAttribute("ping", "javascript:alert(1)"); d',
      'const d = el("div"); d.style.cssText = "background: url(javascript:alert(1))"; d',
      'const d = el("a", { href: "https://samrey.dev" }); d.attributes[0].value = "javascript:alert(1)"; d',
      'let n = 0; const d = el("a"); d.setAttribute("href", { toString() { return ++n === 1 ? "https://safe.example" : "javascript:alert(1)"; } }); d',
      'const s = el("div", { style: "color: red; background: url(javascript:alert(1))" }); s',
      'const s2 = el("img", { srcset: "javascript:alert(1) 1x" }); s2',
      'const h = rawHtml("<img src=x onerror=alert(1)>"); h'
    ]) {
      if (domAttack.includes('rawHtml')) {
        const res = executeSamreyCode(domAttack);
        assert.equal(res.success, true, res.error);
        const serialized = String((res.node as any)?.outerHTML || (res.node as any)?.innerHTML || '');
        assert.ok(!serialized.includes('onerror'), `Headless rawHtml inside sandbox must sanitize unsafe markup, got: ${serialized}`);
      } else {
        const res = executeSamreyCode(domAttack);
        if (res.success) {
          const d = res.node as any;
          const styleVal = String(d?.getAttribute?.('style') ?? d?.style?.cssText ?? '');
          const hrefVal = String(d?.getAttribute?.('href') ?? d?.attributes?.[0]?.value ?? '');
          const srcsetVal = String(d?.getAttribute?.('srcset') ?? d?.getAttribute?.('imagesrcset') ?? '');
          const pingVal = String(d?.getAttribute?.('ping') ?? '');
          assert.ok(!styleVal.includes('javascript:'), `Mixed unsafe CSS leaked: ${styleVal}`);
          assert.ok(!hrefVal.includes('javascript:'), `Unsafe href/TOCTOU leaked: ${hrefVal}`);
          assert.ok(!srcsetVal.includes('javascript:'), `Unsafe srcset leaked: ${srcsetVal}`);
          assert.ok(!pingVal.includes('javascript:'), `Unsafe ping leaked: ${pingVal}`);
        }
      }
    }

    // 7. PlaygroundModal disposes active sandbox timers when owner disposes
    const { createRoot } = await import('@samrey/reactivity');
    const { PlaygroundModal } = await import('../../src/components/PlaygroundModal.js');
    const origSetInterval = globalThis.setInterval;
    const origClearInterval = globalThis.clearInterval;
    const activeTimers = new Set<any>();
    let firedAfterDispose = 0;
    let isDisposed = false;
    (globalThis as any).setInterval = (fn: (...a: any[]) => void, ms?: number, ...rest: any[]) => {
      const id = origSetInterval(() => {
        if (isDisposed) firedAfterDispose++;
        fn();
      }, ms, ...rest);
      activeTimers.add(id);
      return id;
    };
    (globalThis as any).clearInterval = (id: any) => {
      activeTimers.delete(id);
      return origClearInterval(id);
    };
    try {
      await createRoot(async (dispose) => {
        PlaygroundModal({
          isOpen: { value: true },
          code: { value: 'setInterval(() => {}, 5); el("div", null, "modal")' }
        });
        assert.ok(activeTimers.size > 0, 'PlaygroundModal sandbox must start an active interval');
        isDisposed = true;
        dispose();
        assert.equal(activeTimers.size, 0, 'PlaygroundModal dispose must clear all sandbox intervals');
        await new Promise((r) => setTimeout(r, 25));
        assert.equal(firedAfterDispose, 0, 'Disposed PlaygroundModal interval must not fire');
      });
    } finally {
      globalThis.setInterval = origSetInterval;
      globalThis.clearInterval = origClearInterval;
    }
  });
});
