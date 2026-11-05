#!/usr/bin/env node
/**
 * @license Apache-2.0
 * @samrey/mcp-server - Executable CLI Entry Point
 */

import { SamreyMcpServer } from '../src/server.js';

const server = new SamreyMcpServer({
  projectRoot: process.cwd()
});

server.startStdio();

