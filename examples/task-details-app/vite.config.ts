import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, '../..');
const isInsideMonorepo = fs.existsSync(path.resolve(monorepoRoot, 'packages/reactivity/src/index.ts'));

export default defineConfig({
  resolve: {
    alias: isInsideMonorepo ? {
      '@samrey/reactivity': path.resolve(monorepoRoot, 'packages/reactivity/src/index.ts'),
      '@samrey/runtime': path.resolve(monorepoRoot, 'packages/runtime/src/index.ts'),
      '@samrey/router': path.resolve(monorepoRoot, 'packages/router/src/index.ts'),
      '@samrey/forms': path.resolve(monorepoRoot, 'packages/forms/src/index.ts'),
      '@samrey/http': path.resolve(monorepoRoot, 'packages/http/src/index.ts'),
      '@samrey/security': path.resolve(monorepoRoot, 'packages/security/src/index.ts'),
      '@samrey/ssr': path.resolve(monorepoRoot, 'packages/ssr/src/index.ts'),
      '@samrey/cli': path.resolve(monorepoRoot, 'packages/cli/src/index.ts'),
      '@samrey/testing': path.resolve(monorepoRoot, 'packages/testing/src/index.ts'),
    } : {}
  },
  server: {
    port: 3000,
    host: true
  }
});
