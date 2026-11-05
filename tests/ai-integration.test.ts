/**
 * @license Apache-2.0
 * @samrey/monorepo - Universal AI Development Integration & MCP Server Verification Gate
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';

import {
  discoverSamreyProject,
  ALL_OFFICIAL_PACKAGES,
  searchDocs,
  getApiReference,
  getDocumentation,
  getBestPractices,
  SAMREY_DOC_SECTIONS,
  SAMREY_API_REGISTRY,
  getExamples,
  getExampleById,
  SAMREY_EXAMPLES,
  analyzeProject,
  validateSamreyCode,
  diagnoseError,
  runCompatibilitySuite,
  COMPATIBILITY_TASKS,
  generateAgentsMd,
  generateGeminiMd,
  generateClaudeMd,
  generateCopilotInstructions,
  generateCursorMdc,
  writeAllInstructions,
  SAMREY_SKILLS,
  installSkills
} from '../packages/ai/src/index.js';

import {
  SamreyMcpServer,
  MCP_TOOLS,
  MCP_RESOURCES,
  MCP_PROMPTS,
  resolveSafePath,
  redactSecrets,
  executeSafeCommand
} from '../packages/mcp-server/src/index.js';

import { runCLI } from '../packages/cli/src/runner.js';

const rootDir = process.cwd();

describe('Samrey AI Integration Suite (@samrey/ai)', () => {
  it('1. Framework Discovery correctly scans the monorepo root', () => {
    const discovery = discoverSamreyProject(rootDir);
    assert.strictEqual(discovery.isSamreyProject, true);
    assert.strictEqual(discovery.frameworkVersion, '2.0.0');
    assert.ok(discovery.installedPackages.length >= 11, `Expected >= 11 packages, got ${discovery.installedPackages.length}`);
    const pkgNames = discovery.installedPackages.map(p => p.name);
    assert.ok(pkgNames.includes('@samrey/reactivity'));
    assert.ok(pkgNames.includes('@samrey/compiler'));
    assert.ok(pkgNames.includes('@samrey/runtime'));
    assert.ok(pkgNames.includes('@samrey/ai'));
    assert.ok(pkgNames.includes('@samrey/mcp-server'));
    assert.strictEqual(discovery.features.ssr, true);
    assert.strictEqual(discovery.features.routing, true);
    assert.strictEqual(discovery.features.forms, true);
    assert.strictEqual(discovery.features.http, true);
  });

  it('2. Documentation Engine searches and retrieves native API references', () => {
    // Search query
    const results = searchDocs('signal');
    assert.ok(results.length > 0);
    assert.ok(results.some(r => r.title.includes('Reactivity') || r.snippet.includes('signal')));

    // Exact API lookup
    const apiRef = getApiReference('signal');
    assert.ok(apiRef, 'Expected API reference for signal');
    assert.strictEqual(apiRef?.name, 'signal');
    assert.strictEqual(apiRef?.package, '@samrey/reactivity');
    assert.ok(apiRef?.signature.includes('Signal<T>'));
    assert.ok(apiRef?.example && apiRef.example.length > 0);

    // Documentation by topic
    const topic = getDocumentation('reactivity');
    assert.ok(topic);
    assert.ok(topic?.content.includes('signal') || topic?.content.includes('Reactivity'));

    // Best practices
    const bp = getBestPractices();
    assert.ok(bp);
    assert.ok(bp?.content.includes('Samrey Best Practices') || bp?.content.includes('Anti-Patterns'));

    // Registry length
    assert.ok(SAMREY_API_REGISTRY.length >= 10);
    assert.ok(SAMREY_DOC_SECTIONS.length >= 10);
  });

  it('3. Example Engine provides 25+ verified native code examples', () => {
    const examples = getExamples();
    assert.ok(examples.length >= 25, `Expected >= 25 examples, got ${examples.length}`);

    // Check domains
    const domains = new Set(examples.map(e => e.domain));
    assert.ok(domains.has('reactivity'));
    assert.ok(domains.has('components'));
    assert.ok(domains.has('control-flow'));
    assert.ok(domains.has('routing'));
    assert.ok(domains.has('forms'));
    assert.ok(domains.has('http'));
    assert.ok(domains.has('ssr'));
    assert.ok(domains.has('testing'));

    // Every example has required properties and non-empty code
    for (const ex of examples) {
      assert.ok(ex.id, 'Example must have id');
      assert.ok(ex.title, 'Example must have title');
      assert.ok(ex.summary, 'Example must have summary');
      assert.ok(ex.files && ex.files.length > 0, `Example ${ex.id} must have files`);
      for (const f of ex.files) {
        assert.ok(f.code && f.code.length > 20, `File in ${ex.id} must have code body`);
        assert.ok(!f.code.includes('useState('), `Example ${ex.id} must not contain React useState`);
        assert.ok(!f.code.includes('useEffect('), `Example ${ex.id} must not contain React useEffect`);
      }
    }

    // Lookup by id
    const counterEx = getExampleById('reactive-counter');
    assert.ok(counterEx);
    assert.strictEqual(counterEx?.id, 'reactive-counter');
  });

  it('4. Project Analyzer evaluates project health and detects anti-patterns', () => {
    const report = analyzeProject(rootDir);
    assert.ok(typeof report.healthScore === 'number');
    assert.ok(report.issues.length > 0);
    assert.ok(report.discoveredComponents.length > 0);
    assert.ok(report.project.isSamreyProject);
  });

  it('5. Code Validator compiles native templates and rejects foreign anti-patterns', () => {
    // Valid Samrey reactive logic
    const validCode = `
      import { signal, computed, effect } from '@samrey/reactivity';
      const count = signal(0);
      const double = computed(() => count.value * 2);
      count.set((c) => c + 1);
    `;
    const res1 = validateSamreyCode(validCode);
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.errors.length, 0);

    // Valid Samrey template
    const validTemplate = `<div class="counter"><span class="val">{{ count }}</span><button @click="increment">+</button></div>`;
    const res2 = validateSamreyCode(validTemplate, { isTemplateOnly: true });
    assert.strictEqual(res2.compiles, true);
    assert.strictEqual(res2.valid, true);

    // React hook anti-pattern
    const reactHookCode = `
      import { useState } from 'react';
      function MyComponent() {
        const [count, setCount] = useState(0);
        return <div>{count}</div>;
      }
    `;
    const res3 = validateSamreyCode(reactHookCode);
    assert.strictEqual(res3.valid, false);
    assert.ok(res3.errors.some(e => e.message.includes('useState') || e.message.includes('React')));

    // Vue directive anti-pattern
    const vueCode = `<div v-if="visible" v-for="item in items">{{ item }}</div>`;
    const res4 = validateSamreyCode(vueCode, { isTemplateOnly: true });
    assert.strictEqual(res4.valid, false);
    assert.ok(res4.errors.some(e => e.message.includes('Vue') || e.message.includes('v-if')));
  });

  it('6. Diagnostics Engine diagnoses errors and suggests quick-fixes', () => {
    const diag = diagnoseError('SAMREY-108: Direct assignment to signal.value detected');
    assert.ok(diag);
    assert.strictEqual(diag.code, 'SAMREY-108');
    assert.ok(diag.explanation.length > 0);
    assert.ok(diag.suggestion.length > 0);
  });

  it('7. Automated Compatibility Suite passes 13/13 tasks with 100% score', async () => {
    const report = await runCompatibilitySuite();
    assert.strictEqual(report.totalTasks, 13);
    assert.strictEqual(report.passedTasks, 13);
    assert.strictEqual(report.overallScore, 100);
    assert.strictEqual(report.isFullyCompatible, true);
    assert.strictEqual(COMPATIBILITY_TASKS.length, 13);
  });

  it('8. Universal Instructions are complete and authoritative', () => {
    const agents = generateAgentsMd();
    const gemini = generateGeminiMd();
    const claude = generateClaudeMd();
    const copilot = generateCopilotInstructions();
    const cursor = generateCursorMdc();

    assert.ok(agents.includes('Universal AI Development Instructions'));
    assert.ok(agents.includes('Zero Virtual DOM') || agents.includes('Fine-grained'));
    assert.ok(agents.includes('signal'));

    assert.ok(gemini.includes('GEMINI INSTRUCTIONS'));
    assert.ok(claude.includes('CLAUDE PROJECT INSTRUCTIONS'));
    assert.ok(copilot.includes('GitHub Copilot Repository Instructions'));
    assert.ok(cursor.includes('Samrey'));
  });

  it('9. Portable Skills conform to the Agent Skills specification', () => {
    assert.strictEqual(SAMREY_SKILLS.length, 10);

    const expectedNames = [
      'samrey-overview',
      'samrey-project-creation',
      'samrey-components',
      'samrey-reactivity',
      'samrey-routing',
      'samrey-http',
      'samrey-forms',
      'samrey-ssr',
      'samrey-testing',
      'samrey-debugging'
    ];

    for (const name of expectedNames) {
      const skill = SAMREY_SKILLS.find(s => s.name === name);
      assert.ok(skill, `Expected skill "${name}"`);
      assert.ok(skill.content.startsWith('---'));
      assert.ok(skill.content.includes(`name: ${name}`));
      assert.ok(skill.content.includes('description:'));
      assert.ok(skill.content.includes('## '));
    }
  });
});

describe('Samrey MCP Server Suite (@samrey/mcp-server)', () => {
  const mcpServer = new SamreyMcpServer({ projectRoot: rootDir });

  it('1. Security sandbox enforces path boundaries, redaction, and command whitelisting', async () => {
    // Safe path resolution
    const safe = resolveSafePath(rootDir, 'package.json');
    assert.strictEqual(safe, path.join(rootDir, 'package.json'));

    // Path traversal rejection
    assert.throws(() => {
      resolveSafePath(rootDir, '../../../../etc/passwd');
    }, /directory traversal|escapes project root/);

    // Secret redaction
    const secretOutput = 'Key: AIzaSyB1234567890abcdef and token: sk-ant-api03-abcdef123456';
    const redacted = redactSecrets(secretOutput);
    assert.ok(!redacted.includes('AIzaSyB1234567890abcdef'));
    assert.ok(redacted.includes('[REDACTED_SECRET]'));

    // Dangerous command execution rejection
    await assert.rejects(async () => {
      await executeSafeCommand('rm -rf /', rootDir);
    }, /not in the allowed binaries whitelist/);
  });

  it('2. JSON-RPC Protocol handles "initialize" request', async () => {
    const res = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    });

    assert.ok(res);
    assert.strictEqual(res.id, 1);
    const result = res.result as any;
    assert.strictEqual(result.protocolVersion, '2024-11-05');
    assert.strictEqual(result.serverInfo.name, '@samrey/mcp-server');
    assert.ok(result.capabilities.tools);
    assert.ok(result.capabilities.resources);
    assert.ok(result.capabilities.prompts);
  });

  it('3. JSON-RPC Protocol lists all 18 tools with valid schemas', async () => {
    const res = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    assert.ok(res);
    const result = res.result as any;
    assert.strictEqual(result.tools.length, 18);
    assert.strictEqual(MCP_TOOLS.length, 18);

    const toolNames = result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes('samrey_search_docs'));
    assert.ok(toolNames.includes('samrey_get_documentation'));
    assert.ok(toolNames.includes('samrey_get_api_reference'));
    assert.ok(toolNames.includes('samrey_get_examples'));
    assert.ok(toolNames.includes('samrey_get_best_practices'));
    assert.ok(toolNames.includes('samrey_analyze_project'));
    assert.ok(toolNames.includes('samrey_detect_version'));
    assert.ok(toolNames.includes('samrey_detect_packages'));
    assert.ok(toolNames.includes('samrey_inspect_structure'));
    assert.ok(toolNames.includes('samrey_init_project'));
    assert.ok(toolNames.includes('samrey_generate_component'));
    assert.ok(toolNames.includes('samrey_generate_page'));
    assert.ok(toolNames.includes('samrey_generate_route'));
    assert.ok(toolNames.includes('samrey_validate_code'));
    assert.ok(toolNames.includes('samrey_check_compatibility'));
    assert.ok(toolNames.includes('samrey_run_tests'));
    assert.ok(toolNames.includes('samrey_build_project'));
    assert.ok(toolNames.includes('samrey_diagnose_errors'));
  });

  it('4. JSON-RPC Protocol executes documentation and analysis tools', async () => {
    // Tool: samrey_detect_version
    const versionRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'samrey_detect_version',
        arguments: {}
      }
    });
    const versionOutput = JSON.parse((versionRes?.result as any).content[0].text);
    assert.strictEqual(versionOutput.frameworkVersion, '2.0.0');

    // Tool: samrey_search_docs
    const searchRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'samrey_search_docs',
        arguments: { query: 'computed' }
      }
    });
    const searchOutput = JSON.parse((searchRes?.result as any).content[0].text);
    assert.ok(Array.isArray(searchOutput) && searchOutput.length > 0);

    // Tool: samrey_get_api_reference
    const apiRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'samrey_get_api_reference',
        arguments: { apiName: 'signal' }
      }
    });
    const apiOutput = JSON.parse((apiRes?.result as any).content[0].text);
    assert.strictEqual(apiOutput.name, 'signal');
  });

  it('5. JSON-RPC Protocol executes validation and compatibility tools', async () => {
    // Tool: samrey_validate_code (valid)
    const valRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'samrey_validate_code',
        arguments: {
          code: 'import { signal } from "@samrey/reactivity"; const s = signal(1);'
        }
      }
    });
    const valOutput = JSON.parse((valRes?.result as any).content[0].text);
    assert.strictEqual(valOutput.valid, true);

    // Tool: samrey_validate_code (React hook anti-pattern)
    const invalidValRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'samrey_validate_code',
        arguments: {
          code: 'const [val, setVal] = useState(0);'
        }
      }
    });
    const invalidValOutput = JSON.parse((invalidValRes?.result as any).content[0].text);
    assert.strictEqual(invalidValOutput.valid, false);

    // Tool: samrey_check_compatibility
    const compatRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'samrey_check_compatibility',
        arguments: {}
      }
    });
    const compatOutput = JSON.parse((compatRes?.result as any).content[0].text);
    assert.strictEqual(compatOutput.passedTasks, 13);
    assert.strictEqual(compatOutput.overallScore, 100);
  });

  it('6. JSON-RPC Protocol lists and reads all 8 resources', async () => {
    const listRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 9,
      method: 'resources/list'
    });
    const resources = (listRes?.result as any).resources;
    assert.strictEqual(resources.length, 8);
    assert.strictEqual(MCP_RESOURCES.length, 8);

    // Read samrey://docs/overview
    const readOverview = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 10,
      method: 'resources/read',
      params: { uri: 'samrey://docs/overview' }
    });
    const overviewContent = (readOverview?.result as any).contents[0];
    assert.strictEqual(overviewContent.uri, 'samrey://docs/overview');
    assert.ok(overviewContent.text.includes('Samrey Core Architectural Philosophy') || overviewContent.text.includes('Samrey'));

    // Read samrey://examples
    const readEx = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 11,
      method: 'resources/read',
      params: { uri: 'samrey://examples' }
    });
    const exContent = (readEx?.result as any).contents[0];
    assert.strictEqual(exContent.uri, 'samrey://examples');
    assert.ok(exContent.text.includes('reactive-counter'));
  });

  it('7. JSON-RPC Protocol lists and gets all 7 prompts', async () => {
    const listRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 12,
      method: 'prompts/list'
    });
    const prompts = (listRes?.result as any).prompts;
    assert.strictEqual(prompts.length, 7);
    assert.strictEqual(MCP_PROMPTS.length, 7);

    // Get prompt: build-samrey-component
    const getRes = await mcpServer.handleMessage({
      jsonrpc: '2.0',
      id: 13,
      method: 'prompts/get',
      params: {
        name: 'build-samrey-component',
        arguments: { componentName: 'UserProfile', purpose: 'Shows user avatar and name' }
      }
    });
    const messages = (getRes?.result as any).messages;
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].role, 'user');
    assert.ok(messages[0].content.text.includes('UserProfile'));
  });
});

describe('Samrey CLI AI Commands Integration', () => {
  it('1. Executes "samrey ai doctor" without error', async () => {
    const res = await runCLI(['ai', 'doctor']);
    assert.ok(res.message?.includes('Samrey AI Doctor'));
    assert.ok(res.message?.includes('Features Detected:'));
  });

  it('2. Executes "samrey ai docs signal" without error', async () => {
    const res = await runCLI(['ai', 'docs', 'signal']);
    assert.ok(res.message?.includes('match(es) for "signal"'));
    assert.ok(res.message?.includes('@samrey/reactivity'));
  });

  it('3. Executes "samrey ai validate" on valid code string', async () => {
    const res = await runCLI(['ai', 'validate', '--code', 'import { signal } from "@samrey/reactivity"; const s = signal(0);']);
    assert.strictEqual(res.success, true);
    assert.ok(res.message?.includes('valid'));
  });
});
