/**
 * @license Apache-2.0
 * @gati/cli - Vite / Rollup Compiler Plugin
 */

import { compileTemplate } from '@gati/compiler';

export interface GatiPluginOptions {
  include?: string[];
  exclude?: string[];
}

export function aetherVitePlugin(options: GatiPluginOptions = {}) {
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
