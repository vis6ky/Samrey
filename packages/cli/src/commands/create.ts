/**
 * @license Apache-2.0
 * @samrey/cli - "samrey create" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateStarterProject } from '../starter-template.js';

export interface CreateCommandOptions {
  name: string;
  template?: 'ssr' | 'spa' | 'minimal' | 'ssg';
  targetDir?: string;
  dryRun?: boolean;
}

export interface CommandResult {
  success: boolean;
  message: string;
  exitCode: number;
  data?: Record<string, unknown>;
}

export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name cannot be empty.' };
  }
  const trimmed = name.trim();
  // Prevent directory traversal attacks (e.g. ../../, absolute paths, backslashes)
  if (trimmed.includes('..') || trimmed.startsWith('/') || trimmed.startsWith('\\') || path.isAbsolute(trimmed)) {
    return { valid: false, error: `Invalid project name "${name}". Directory traversal characters (..) and absolute paths are forbidden.` };
  }
  if (!/^(@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: `Invalid project name "${name}". Only alphanumeric characters, dashes, underscores, dots, or valid scoped package names are allowed.` };
  }
  return { valid: true };
}

export async function runCreateCommand(options: CreateCommandOptions): Promise<CommandResult> {
  const validation = validateProjectName(options.name);
  if (!validation.valid) {
    return {
      success: false,
      message: `[Samrey Create Error] ${validation.error}`,
      exitCode: 1
    };
  }

  const targetDir = options.targetDir || path.resolve(process.cwd(), options.name);
  const files = generateStarterProject(options.name, { template: options.template });

  if (options.dryRun) {
    return {
      success: true,
      message: `[Dry Run] Prepared ${Object.keys(files).length} files for "${options.name}" at ${targetDir}`,
      exitCode: 0,
      data: { files: Object.keys(files), targetDir }
    };
  }

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    } else {
      const conflicting: string[] = [];
      for (const relPath of Object.keys(files)) {
        if (fs.existsSync(path.join(targetDir, relPath))) {
          conflicting.push(relPath);
        }
      }
      if (conflicting.length > 0) {
        return {
          success: false,
          message: `[Samrey Create Error] Target directory contains conflicting files that would be overwritten: ${conflicting.slice(0, 5).join(', ')}${conflicting.length > 5 ? '...' : ''}`,
          exitCode: 1
        };
      }
    }

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(targetDir, relPath);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }

    return {
      success: true,
      message: `[Samrey] Successfully initialized production starter project "${options.name}" at ${targetDir}`,
      exitCode: 0,
      data: { filesCreated: Object.keys(files).length, targetDir }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `[Samrey Create Failed] Could not create project files: ${err.message}`,
      exitCode: 1
    };
  }
}
