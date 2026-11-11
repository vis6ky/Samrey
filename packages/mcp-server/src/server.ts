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
  allowExec?: boolean;
}

export class SamreyMcpServer {
  private projectRoot: string;
  private serverName: string;
  private serverVersion: string;
  private allowExec: boolean;
  private isInitialized = false;

  constructor(options: SamreyMcpServerOptions = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.serverName = options.serverName || '@samrey/mcp-server';
    this.serverVersion = options.serverVersion || '2.1.0';
    this.allowExec = options.allowExec ?? false;
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

    const isNotification = Boolean(request && request.id === undefined);

    if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
      if (isNotification) return null;
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
    const ctx: ToolContext = {
      projectRoot: this.projectRoot,
      allowExec: this.allowExec
    };

    // Protocol requirement: Server must be initialized before processing tool calls
    if (!this.isInitialized && method === 'tools/call') {
      if (isNotification) return null;
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: -32002, // ServerNotInitialized in LSP/MCP
          message: 'Server not initialized. Client must call "initialize" first.'
        }
      };
    }

    try {
      let response: JsonRpcResponse | null = null;

      switch (method) {
        case 'initialize': {
          this.isInitialized = true;
          response = {
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
          break;
        }

        case 'notifications/initialized': {
          // Notification, no response required
          return null;
        }

        case 'ping': {
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {}
          };
          break;
        }

        case 'tools/list': {
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              tools: MCP_TOOLS
            }
          };
          break;
        }

        case 'tools/call': {
          if (!params || typeof params !== 'object' || Array.isArray(params)) {
            response = {
              jsonrpc: '2.0',
              id: id ?? null,
              error: {
                code: MCP_ERROR_CODES.INVALID_PARAMS,
                message: 'Invalid params: Expected object.'
              }
            };
            break;
          }

          const toolName = params.name;
          if (!toolName || typeof toolName !== 'string') {
            response = {
              jsonrpc: '2.0',
              id: id ?? null,
              error: {
                code: MCP_ERROR_CODES.INVALID_PARAMS,
                message: 'Invalid params: tool "name" string is required.'
              }
            };
            break;
          }

          const toolArgs = params.arguments;
          if (
            toolArgs !== undefined &&
            (typeof toolArgs !== 'object' || toolArgs === null || Array.isArray(toolArgs))
          ) {
            response = {
              jsonrpc: '2.0',
              id: id ?? null,
              error: {
                code: MCP_ERROR_CODES.INVALID_PARAMS,
                message: 'Invalid params: tool "arguments" must be an object.'
              }
            };
            break;
          }

          const result = await handleToolCall(toolName, toolArgs || {}, ctx);
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            result
          };
          break;
        }

        case 'resources/list': {
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              resources: MCP_RESOURCES
            }
          };
          break;
        }

        case 'resources/read': {
          const uri = params.uri;
          const result = readResource(uri, this.projectRoot);
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            result
          };
          break;
        }

        case 'prompts/list': {
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              prompts: MCP_PROMPTS
            }
          };
          break;
        }

        case 'prompts/get': {
          const promptName = params.name;
          const promptArgs = params.arguments || {};
          const result = getPromptMessages(promptName, promptArgs);
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            result
          };
          break;
        }

        default: {
          response = {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
              code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
              message: `Method "${method}" not found.`
            }
          };
          break;
        }
      }

      if (isNotification) {
        return null;
      }
      return response;
    } catch (err: any) {
      if (isNotification) {
        return null;
      }
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
