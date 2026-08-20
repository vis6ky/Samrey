/**
 * @license Apache-2.0
 * @aether/cli - Production Starter Project Generator
 * Provides complete, runnable TypeScript templates with SSR, Routing, Reactivity, and Testing.
 */

export interface StarterProjectFiles {
  [filePath: string]: string;
}

export function generateStarterProject(projectName: string, options: { template?: 'ssr' | 'spa' | 'minimal'; typescript?: boolean } = {}): StarterProjectFiles {
  const templateType = options.template || 'ssr';

  const packageJson = JSON.stringify({
    name: projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'aether dev',
      build: 'aether build',
      start: templateType === 'ssr' ? 'node server.js' : 'vite preview',
      test: 'aether test',
      audit: 'aether audit',
      analyze: 'aether analyze'
    },
    dependencies: {
      '@aether/compiler': '^0.1.0',
      '@aether/reactivity': '^0.1.0',
      '@aether/runtime': '^0.1.0',
      '@aether/router': '^0.1.0',
      '@aether/ssr': '^0.1.0',
      '@aether/devtools': '^0.1.0'
    },
    devDependencies: {
      '@aether/cli': '^0.1.0',
      'typescript': '^5.0.0',
      'vite': '^5.0.0'
    }
  }, null, 2);

  const tsconfigJson = JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      jsx: 'preserve',
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true
    },
    include: ['src/**/*', 'tests/**/*']
  }, null, 2);

  const viteConfig = `import { defineConfig } from 'vite';
import { aetherVitePlugin } from '@aether/cli';

export default defineConfig({
  plugins: [aetherVitePlugin()],
  server: {
    port: 3000
  }
});
`;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName} - Aether App</title>
  </head>
  <body>
    <div id="app"><!--ssr-outlet--></div>
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>
`;

  const appTsx = `import { signal } from '@aether/reactivity';
import { Router, Route, Link } from '@aether/router';
import { Header } from './components/Header.js';
import { HomeView } from './views/HomeView.js';
import { AboutView } from './views/AboutView.js';

export function App() {
  return (
    <div class="app-container">
      <Header title="${projectName}" />
      <main>
        <Router>
          <Route path="/" component={HomeView} />
          <Route path="/about" component={AboutView} />
        </Router>
      </main>
    </div>
  );
}
`;

  const headerTsx = `import { Link } from '@aether/router';

export function Header(props: { title: string }) {
  return (
    <header class="navbar">
      <div class="brand">
        <h1>{props.title}</h1>
      </div>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}
`;

  const counterTsx = `import { signal } from '@aether/reactivity';

export function Counter() {
  const count = signal(0);
  const increment = () => { count.value++; };
  const decrement = () => { count.value--; };

  return (
    <div class="counter-card">
      <h3>Reactive Counter</h3>
      <p class="count-display">Current Count: <strong>{count.value}</strong></p>
      <div class="actions">
        <button type="button" onClick={decrement}>-</button>
        <button type="button" onClick={increment}>+</button>
      </div>
    </div>
  );
}
`;

  const homeViewTsx = `import { Counter } from '../components/Counter.js';

export function HomeView() {
  return (
    <section class="page home-page">
      <h2>Welcome to your Aether Application</h2>
      <p>Fine-grained reactive performance with zero virtual DOM overhead.</p>
      <Counter />
    </section>
  );
}
`;

  const aboutViewTsx = `export function AboutView() {
  return (
    <section class="page about-page">
      <h2>About Aether Framework</h2>
      <p>Built for unmatched developer ergonomics, security sandboxing, and ultra-fast SSR.</p>
    </section>
  );
}
`;

  const entryClientTsx = `import { mount } from '@aether/runtime';
import { App } from './App.js';

const root = document.getElementById('app');
if (root) {
  mount(() => <App />, root);
}
`;

  const entryServerTsx = `import { renderToString } from '@aether/ssr';
import { App } from './App.js';

export function render(url: string) {
  return renderToString(() => <App />);
}
`;

  const testTsx = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signal } from '@aether/reactivity';

describe('${projectName} Component Suite', () => {
  it('increments reactive counter signal', () => {
    const count = signal(0);
    assert.equal(count.value, 0);
    count.value++;
    assert.equal(count.value, 1);
  });
});
`;

  const readmeMd = `# ${projectName}

Built with [Aether Framework](https://github.com/aether/aether).

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server with DevTools
npm run dev

# Run test suite
npm run test

# Run accessibility and security audit
npm run audit

# Analyze bundle size and reactive topology
npm run analyze

# Build for production
npm run build
\`\`\`
`;

  const gitignore = `node_modules/
dist/
.DS_Store
coverage/
*.log
`;

  return {
    'package.json': packageJson,
    'tsconfig.json': tsconfigJson,
    'vite.config.ts': viteConfig,
    'index.html': indexHtml,
    'README.md': readmeMd,
    '.gitignore': gitignore,
    'src/App.tsx': appTsx,
    'src/components/Header.tsx': headerTsx,
    'src/components/Counter.tsx': counterTsx,
    'src/views/HomeView.tsx': homeViewTsx,
    'src/views/AboutView.tsx': aboutViewTsx,
    'src/entry-client.tsx': entryClientTsx,
    'src/entry-server.tsx': entryServerTsx,
    'tests/app.test.ts': testTsx
  };
}
