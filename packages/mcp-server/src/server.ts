/**
 * @license Apache-2.0
 * @samrey/mcp-server - Central Model Context Protocol Server
 */

import * as readline from 'node:readline';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  MCP_ERROR_CODES
} from './protocol.js';
import { MCP_TOOLS, handleToolCall, ToolContext } from './tools.js';
import { MCP_RESOURCES, readResource } from './resources.js';
import { MCP_PROMPTS, getPromptMessages } from './prompts.js';

export interface SamreyMcpServerOptions {
  projectRoot?: string;
  serverName?: string;
  serverVersion?: string;
}

export class SamreyMcpServer {
  private projectRoot: string;
  private serverName: string;
  private serverVersion: string;
  private isInitialized = false;

  constructor(options: SamreyMcpServerOptions = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.serverName = options.serverName || '@samrey/mcp-server';
    this.serverVersion = options.serverVersion || '2.0.0';
  }

  public async handleMessage(rawMessage: string | JsonRpcRequest): Promise<JsonRpcResponse | null> {
    let request: JsonRpcRequest;
    if (typeof rawMessage === 'string') {
      try {
        request = JSON.parse(rawMessage);
      } catch (e: any) {
        return {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: MCP_ERROR_CODES.PARSE_ERROR,
            message: `Parse error: ${e?.message || e}`
          }
        };
      }
    } else {
      request = rawMessage;
    }

    if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
      return {
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: {
          code: MCP_ERROR_CODES.INVALID_REQUEST,
          message: 'Invalid JSON-RPC request.'
        }
      };
    }

    const id = request.id;
    const method = request.method;
    const params = request.params || {};
    const ctx: ToolContext = { projectRoot: this.projectRoot };

    try {
      switch (method) {
        case 'initialize': {
          this.isInitialized = true;
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: {
                name: this.serverName,
                version: this.serverVersion
              },
              capabilities: {
                tools: {},
                resources: {},
                prompts: {}
              }
            }
          };
        }

        case 'notifications/initialized': {
          // Notification, no response required
          return null;
        }

        case 'ping': {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {}
          };
        }

        case 'tools/list': {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              tools: MCP_TOOLS
            }
          };
        }

        case 'tools/call': {
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          const result = await handleToolCall(toolName, toolArgs, ctx);
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result
          };
        }

        case 'resources/list': {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              resources: MCP_RESOURCES
            }
          };
        }

        case 'resources/read': {
          const uri = params.uri;
          const result = readResource(uri, this.projectRoot);
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result
          };
        }

        case 'prompts/list': {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              prompts: MCP_PROMPTS
            }
          };
        }

        case 'prompts/get': {
          const promptName = params.name;
          const promptArgs = params.arguments || {};
          const result = getPromptMessages(promptName, promptArgs);
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result
          };
        }

        default: {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
              code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
              message: `Method "${method}" not found.`
            }
          };
        }
      }
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: MCP_ERROR_CODES.INTERNAL_ERROR,
          message: err?.message || String(err)
        }
      };
    }
  }

  public startStdio(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const response = await this.handleMessage(trimmed);
      if (response !== null) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    });

    process.on('SIGINT', () => {
      process.exit(0);
    });
  }
}
