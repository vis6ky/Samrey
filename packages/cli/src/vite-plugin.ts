/**
 * @license Apache-2.0
 * @samrey/cli - Vite / Rollup Compiler Plugin
 */

import { compileTemplate } from '@samrey/compiler';

export interface SamreyPluginOptions {
  include?: string[];
  exclude?: string[];
}

export function aetherVitePlugin(options: SamreyPluginOptions = {}) {
  return {
    name: 'vite-plugin-aether',
    transform(code: string, id: string) {
      if (!id.endsWith('.aether') && !id.endsWith('.tsx') && !id.endsWith('.jsx')) {
        return null;
      }

      const result = compileTemplate(code);
      return {
        code: result.generatedCode,
        map: null
      };
    }
  };
}
