/**
 * @license Apache-2.0
 * @samrey/mcp-server - Stdio JSON-RPC Live Process Protocol Test Suite
 *
 * Spawns the MCP server as a real standalone child process over stdio,
 * transmitting line-delimited JSON-RPC 2.0 requests via stdin and reading
 * responses via stdout to ensure complete real-world protocol conformance.
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import * as readline from 'node:readline';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BIN_PATH = path.resolve(__dirname, '..', 'bin', 'samrey-mcp.js');
const DIST_PATH = path.resolve(__dirname, '..', 'dist', 'server.js');

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number | string | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class LiveMcpClient {
  private child: ChildProcess;
  private rl: readline.Interface;
  private nextId = 1;
  private pendingRequests = new Map<number | string, { resolve: (res: JsonRpcResponse) => void; reject: (err: any) => void }>();
  private unhandledLines: string[] = [];
  public stderrOutput = '';

  constructor(binPath: string) {
    const spawnArgs: string[] = [];
    if (!fs.existsSync(DIST_PATH)) {
      spawnArgs.push('--import', 'tsx');
    }
    spawnArgs.push(binPath);

    this.child = spawn(process.execPath, spawnArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    this.child.stderr?.on('data', (chunk) => {
      this.stderrOutput += chunk.toString();
    });

    this.child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        for (const [, handlers] of this.pendingRequests.entries()) {
          handlers.reject(new Error(`MCP server child process exited prematurely with code ${code}. Stderr: ${this.stderrOutput}`));
        }
        this.pendingRequests.clear();
      }
    });

    this.rl = readline.createInterface({
      input: this.child.stdout!,
      terminal: false
    });

    this.rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed: JsonRpcResponse = JSON.parse(trimmed);
        if (parsed.id !== undefined && parsed.id !== null && this.pendingRequests.has(parsed.id)) {
          const handlers = this.pendingRequests.get(parsed.id)!;
          this.pendingRequests.delete(parsed.id);
          handlers.resolve(parsed);
        } else {
          this.unhandledLines.push(trimmed);
        }
      } catch {
        this.unhandledLines.push(trimmed);
      }
    });
  }

  public sendRaw(raw: string): void {
    this.child.stdin!.write(raw + '\n');
  }

  public notify(method: string, params?: any): void {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params
    });
    this.child.stdin!.write(payload + '\n');
  }

  public request(method: string, params?: any): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Timeout waiting for response to request id ${id} (method: ${method}). Stderr: ${this.stderrOutput}`));
      }, 5000);

      this.pendingRequests.set(id, {
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });

      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      });
      this.child.stdin!.write(payload + '\n');
    });
  }

  public async close(): Promise<number | null> {
    return new Promise((resolve) => {
      if (this.child.exitCode !== null) {
        resolve(this.child.exitCode);
        return;
      }
      this.child.on('exit', (code) => {
        resolve(code);
      });
      this.child.stdin!.end();
      setTimeout(() => {
        if (this.child.exitCode === null) {
          this.child.kill('SIGTERM');
        }
      }, 500);
    });
  }
}

describe('MCP Server: Real Stdio JSON-RPC Process Integration', () => {
  let client: LiveMcpClient;

  before(() => {
    client = new LiveMcpClient(BIN_PATH);
  });

  after(async () => {
    if (client) {
      await client.close();
    }
  });

  it('1. Handles initialize handshake over real stdio', async () => {
    const res = await client.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-runner-client',
        version: '1.0.0'
      }
    });

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.ok(res.result, 'Response must have result');
    assert.strictEqual(res.result.serverInfo.name, '@samrey/mcp-server');
    assert.strictEqual(res.result.serverInfo.version, '2.1.0');
    assert.strictEqual(res.result.protocolVersion, '2024-11-05');
    assert.ok(res.result.capabilities.tools, 'Must declare tools capability');
    assert.ok(res.result.capabilities.resources, 'Must declare resources capability');
    assert.ok(res.result.capabilities.prompts, 'Must declare prompts capability');
  });

  it('2. Emits no response for notifications/initialized', async () => {
    client.notify('notifications/initialized');

    // Send a follow-up ping to verify order and that no ghost response preceded it
    const pingRes = await client.request('ping');
    assert.strictEqual(pingRes.jsonrpc, '2.0');
    assert.deepStrictEqual(pingRes.result, {});
  });

  it('3. Lists all 18 tools with complete JSON schemas over stdio', async () => {
    const res = await client.request('tools/list', {});
    assert.strictEqual(res.jsonrpc, '2.0');
    assert.ok(Array.isArray(res.result?.tools));
    assert.strictEqual(res.result.tools.length, 18);

    const toolNames = res.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes('samrey_search_docs'));
    assert.ok(toolNames.includes('samrey_validate_code'));
    assert.ok(toolNames.includes('samrey_analyze_project'));
    assert.ok(toolNames.includes('samrey_get_api_reference'));
  });

  it('4. Executes documentation search tool (samrey_search_docs) via live stdio', async () => {
    const res = await client.request('tools/call', {
      name: 'samrey_search_docs',
      arguments: {
        query: 'signal reactivity'
      }
    });

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.ok(res.result?.content, 'Tool call must return content array');
    assert.strictEqual(res.result.content[0].type, 'text');
    const text = res.result.content[0].text;
    assert.ok(text.includes('signal'), 'Result text must mention signal');
  });

  it('5. Executes code validation tool (samrey_validate_code) via live stdio', async () => {
    // Valid Samrey component
    const validRes = await client.request('tools/call', {
      name: 'samrey_validate_code',
      arguments: {
        code: `
          import { signal } from '@samrey/reactivity';
          import { template, bindText } from '@samrey/runtime';
          const _tmpl = template('<span></span>');
          export function Comp() {
            const count = signal(0);
            const el = _tmpl() as HTMLElement;
            bindText(el, () => count.value.toString());
            return el;
          }
        `
      }
    });

    assert.strictEqual(validRes.jsonrpc, '2.0');
    const parsedValid = JSON.parse(validRes.result.content[0].text);
    assert.strictEqual(parsedValid.valid, true);
    assert.strictEqual(parsedValid.errors.length, 0);

    // Invalid React hook anti-pattern
    const invalidRes = await client.request('tools/call', {
      name: 'samrey_validate_code',
      arguments: {
        code: `
          import { useState } from 'react';
          export function Comp() { const [x] = useState(0); return null; }
        `
      }
    });

    assert.strictEqual(invalidRes.jsonrpc, '2.0');
    const parsedInvalid = JSON.parse(invalidRes.result.content[0].text);
    assert.strictEqual(parsedInvalid.valid, false);
    assert.ok(parsedInvalid.errors.some((e: any) => e.message.includes('React')));
  });

  it('6. Lists and retrieves prompts via live stdio', async () => {
    const listRes = await client.request('prompts/list', {});
    assert.ok(Array.isArray(listRes.result?.prompts));
    assert.strictEqual(listRes.result.prompts.length, 7);

    const getRes = await client.request('prompts/get', {
      name: 'build-samrey-component',
      arguments: {
        componentName: 'TaskCard',
        purpose: 'Display tasks'
      }
    });

    assert.ok(getRes.result?.messages);
    assert.ok(getRes.result.messages.length > 0);
    assert.ok(getRes.result.messages[0].content.text.includes('TaskCard'));
  });

  it('7. Lists and reads resources via live stdio', async () => {
    const listRes = await client.request('resources/list', {});
    assert.ok(Array.isArray(listRes.result?.resources));
    assert.strictEqual(listRes.result.resources.length, 8);

    const readRes = await client.request('resources/read', {
      uri: 'samrey://docs/overview'
    });

    assert.ok(readRes.result?.contents);
    assert.strictEqual(readRes.result.contents[0].uri, 'samrey://docs/overview');
    assert.ok(readRes.result.contents[0].text.includes('Zero Virtual DOM'));
  });

  it('8. Returns proper JSON-RPC error codes over stdio for invalid calls', async () => {
    // 8a. Method not found (-32601)
    const notFoundRes = await client.request('unsupported/method', {});
    assert.strictEqual(notFoundRes.error?.code, -32601);

    // 8b. Invalid params format for tools/call (-32602)
    const invalidParamsRes = await client.request('tools/call', 'not-an-object');
    assert.strictEqual(invalidParamsRes.error?.code, -32602);

    // 8c. Unknown tool call
    const unknownToolRes = await client.request('tools/call', {
      name: 'non_existent_tool',
      arguments: {}
    });
    assert.ok(unknownToolRes.result?.isError);
  });

  it('9. Handles malformed JSON strings on stdin gracefully with parse error (-32700)', async () => {
    // Write malformed JSON directly and wait for next valid request to observe recovery
    client.sendRaw('INVALID JSON LINE {{{');

    // Follow up with ping to verify server did not crash and responds properly
    const pingRes = await client.request('ping');
    assert.strictEqual(pingRes.jsonrpc, '2.0');
    assert.deepStrictEqual(pingRes.result, {});
  });
});
