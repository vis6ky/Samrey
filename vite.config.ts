import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@aether/security': path.resolve(__dirname, 'packages/security/src/index.ts'),
        '@aether/reactivity': path.resolve(__dirname, 'packages/reactivity/src/index.ts'),
        '@aether/runtime': path.resolve(__dirname, 'packages/runtime/src/index.ts'),
        '@aether/compiler': path.resolve(__dirname, 'packages/compiler/src/index.ts'),
        '@aether/router': path.resolve(__dirname, 'packages/router/src/index.ts'),
        '@aether/http': path.resolve(__dirname, 'packages/http/src/index.ts'),
        '@aether/forms': path.resolve(__dirname, 'packages/forms/src/index.ts'),
        '@aether/ssr': path.resolve(__dirname, 'packages/ssr/src/index.ts'),
        '@aether/testing': path.resolve(__dirname, 'packages/testing/src/index.ts'),
        '@aether/cli': path.resolve(__dirname, 'packages/cli/src/index.ts'),
        '@aether/devtools': path.resolve(__dirname, 'packages/devtools/src/index.ts')
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
