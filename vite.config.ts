import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@samrey/security': path.resolve(__dirname, 'packages/security/src/index.ts'),
        '@samrey/reactivity': path.resolve(__dirname, 'packages/reactivity/src/index.ts'),
        '@samrey/runtime': path.resolve(__dirname, 'packages/runtime/src/index.ts'),
        '@samrey/compiler': path.resolve(__dirname, 'packages/compiler/src/index.ts'),
        '@samrey/router': path.resolve(__dirname, 'packages/router/src/index.ts'),
        '@samrey/http': path.resolve(__dirname, 'packages/http/src/index.ts'),
        '@samrey/forms': path.resolve(__dirname, 'packages/forms/src/index.ts'),
        '@samrey/ssr': path.resolve(__dirname, 'packages/ssr/src/index.ts'),
        '@samrey/testing': path.resolve(__dirname, 'packages/testing/src/index.ts'),
        '@samrey/cli': path.resolve(__dirname, 'packages/cli/src/index.ts'),
        '@samrey/devtools': path.resolve(__dirname, 'packages/devtools/src/index.ts')
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
