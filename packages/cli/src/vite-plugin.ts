/**
 * @license Apache-2.0
 * @samrey/cli - Vite / Rollup Compiler Plugin
 */

import { compileTemplate } from '@samrey/compiler';

export interface SamreyPluginOptions {
  include?: string[];
  exclude?: string[];
}

export function samreyVitePlugin(options: SamreyPluginOptions = {}) {
  const defaultExclude = [/node_modules/];
  const userExclude = options.exclude ? options.exclude.map((e) => (typeof e === 'string' ? new RegExp(e) : e)) : [];
  const allExclude = [...defaultExclude, ...userExclude];

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

      if (options.include && options.include.length > 0) {
        const matchesInclude = options.include.some((inc) => {
          const reg = typeof inc === 'string' ? new RegExp(inc) : inc;
          return reg.test(id);
        });
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

      const result = compileTemplate(code);
      return {
        code: result.generatedCode,
        map: null
      };
    }
  };
}

export const samreyPlugin = samreyVitePlugin;
