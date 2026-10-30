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

export function samreyVitePlugin(options: SamreyPluginOptions = {}) {
  const defaultExclude = [/node_modules/];
  const userExclude = options.exclude ? options.exclude.map((e) => compilePattern(e)) : [];
  const allExclude = [...defaultExclude, ...userExclude];
  const userInclude = options.include ? options.include.map((i) => compilePattern(i)) : null;

  return {
    name: 'vite-plugin-samrey',
    transform(code: string, id: string) {
      if (!id.endsWith('.samrey') && !id.endsWith('.tsx') && !id.endsWith('.jsx')) {
        return null;
      }

      for (const pattern of allExclude) {
        if (pattern.test(id)) {
          return null;
        }
      }

      if (userInclude && userInclude.length > 0) {
        const matchesInclude = userInclude.some((reg) => reg.test(id));
        if (!matchesInclude) {
          return null;
        }
      }

      if (!id.endsWith('.samrey')) {
        const trimmed = code.trim();
        const hasModuleSyntax = /^\s*(import|export)\s/m.test(code);
        if (hasModuleSyntax || !trimmed.startsWith('<')) {
          return null;
        }
      }

      try {
        const result = compileTemplate(code, { filename: id });
        return {
          code: result.generatedCode,
          map: null
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
