import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@gati/security': path.resolve(__dirname, 'packages/security/src/index.ts'),
        '@gati/reactivity': path.resolve(__dirname, 'packages/reactivity/src/index.ts'),
        '@gati/runtime': path.resolve(__dirname, 'packages/runtime/src/index.ts'),
        '@gati/compiler': path.resolve(__dirname, 'packages/compiler/src/index.ts'),
        '@gati/router': path.resolve(__dirname, 'packages/router/src/index.ts'),
        '@gati/http': path.resolve(__dirname, 'packages/http/src/index.ts'),
        '@gati/forms': path.resolve(__dirname, 'packages/forms/src/index.ts'),
        '@gati/ssr': path.resolve(__dirname, 'packages/ssr/src/index.ts'),
        '@gati/testing': path.resolve(__dirname, 'packages/testing/src/index.ts'),
        '@gati/cli': path.resolve(__dirname, 'packages/cli/src/index.ts'),
        '@gati/devtools': path.resolve(__dirname, 'packages/devtools/src/index.ts')
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
