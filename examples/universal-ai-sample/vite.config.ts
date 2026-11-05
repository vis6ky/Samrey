import { defineConfig } from 'vite';
import { samreyVitePlugin } from '@samrey/cli';
import * as path from 'node:path';

export default defineConfig({
  plugins: [samreyVitePlugin()],
  resolve: {
    alias: {
      '@samrey/reactivity': path.resolve(__dirname, '../../packages/reactivity/src/index.ts'),
      '@samrey/runtime': path.resolve(__dirname, '../../packages/runtime/src/index.ts'),
      '@samrey/compiler': path.resolve(__dirname, '../../packages/compiler/src/index.ts'),
      '@samrey/security': path.resolve(__dirname, '../../packages/security/src/index.ts'),
      '@samrey/router': path.resolve(__dirname, '../../packages/router/src/index.ts'),
      '@samrey/http': path.resolve(__dirname, '../../packages/http/src/index.ts'),
      '@samrey/forms': path.resolve(__dirname, '../../packages/forms/src/index.ts'),
      '@samrey/ssr': path.resolve(__dirname, '../../packages/ssr/src/index.ts'),
      '@samrey/testing': path.resolve(__dirname, '../../packages/testing/src/index.ts'),
      '@samrey/cli': path.resolve(__dirname, '../../packages/cli/src/index.ts')
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});

