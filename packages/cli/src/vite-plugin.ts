/**
 * @license Apache-2.0
 * @samrey/cli - Vite / Rollup Compiler Plugin
 */

import { compileTemplate } from '@samrey/compiler';

export interface SamreyPluginOptions {
  include?: string[];
  exclude?: string[];
}

function globToRegex(glob: string): RegExp {
  let res = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          res += '(?:.+/)?';
          i += 3;
        } else {
          res += '.*';
          i += 2;
        }
      } else {
        res += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      res += '[^/]';
      i += 1;
    } else if (['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'].includes(c)) {
      res += '\\' + c;
      i += 1;
    } else {
      res += c;
      i += 1;
    }
  }
  return new RegExp(res);
}

function compilePattern(pattern: string | RegExp): RegExp {
  if (pattern instanceof RegExp) return pattern;
  if (typeof pattern !== 'string') {
    throw new TypeError(`[samrey-vite-plugin] Invalid pattern: expected string or RegExp, received ${typeof pattern}`);
  }

  // Convert glob wildcards to regular expression
  if (pattern.includes('*')) {
    try {
      return globToRegex(pattern);
    } catch {
      throw new Error(`[samrey-vite-plugin] Invalid glob pattern "${pattern}".`);
    }
  }

  try {
    return new RegExp(pattern);
  } catch (err: any) {
    throw new Error(`[samrey-vite-plugin] Invalid pattern "${pattern}": ${err?.message || err}`);
  }
}

const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeVlq(value: number): string {
  let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
  let encoded = '';
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    encoded += VLQ_CHARS[digit];
  } while (vlq > 0);
  return encoded;
}

export interface RawSourceMapV3 {
  version: 3;
  file: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

export function createLineSourceMap(
  sourceFile: string,
  sourceCode: string,
  generatedCode: string
): RawSourceMapV3 {
  const sourceLineCount = Math.max(1, sourceCode.split('\n').length);
  const generatedLineCount = Math.max(1, generatedCode.split('\n').length);
  const maxSourceLine = sourceLineCount - 1;
  let prevSourceLine = 0;
  const lineMappings: string[] = [];

  for (let i = 0; i < generatedLineCount; i++) {
    const targetSourceLine = Math.min(i, maxSourceLine);
    const deltaLine = targetSourceLine - prevSourceLine;
    prevSourceLine = targetSourceLine;
    lineMappings.push(`AA${encodeVlq(deltaLine)}A`);
  }

  return {
    version: 3,
    file: sourceFile,
    sources: [sourceFile],
    sourcesContent: [sourceCode],
    names: [],
    mappings: lineMappings.join(';')
  };
}

export function samreyVitePlugin(options: SamreyPluginOptions = {}) {
  const defaultExclude = [/node_modules/];
  const userExclude = options.exclude ? options.exclude.map((e) => compilePattern(e)) : [];
  const allExclude = [...defaultExclude, ...userExclude];
  const userInclude = options.include ? options.include.map((i) => compilePattern(i)) : null;

  return {
    name: 'vite-plugin-samrey',
    transform(code: string, id: string) {
      const cleanId = id.split(/[?#]/)[0];
      if (!cleanId.endsWith('.samrey')) {
        return null;
      }

      for (const pattern of allExclude) {
        if (pattern.test(cleanId) || pattern.test(id)) {
          return null;
        }
      }

      if (userInclude && userInclude.length > 0) {
        const matchesInclude = userInclude.some((reg) => reg.test(cleanId) || reg.test(id));
        if (!matchesInclude) {
          return null;
        }
      }

      try {
        const result = compileTemplate(code, { filename: cleanId });
        return {
          code: result.generatedCode,
          map: createLineSourceMap(cleanId, code, result.generatedCode)
        };
      } catch (err: any) {
        if (err && err.name === 'SamreyCompilerError') {
          throw new Error(`[samrey-vite-plugin] Error in ${id}:\n${err.message}`);
        }
        throw err;
      }
    }
  };
}

export const samreyPlugin = samreyVitePlugin;
