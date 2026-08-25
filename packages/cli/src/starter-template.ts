/**
 * @license Apache-2.0
 * @samrey/cli - Production Starter Project Generator
 * Provides complete, runnable TypeScript templates with SSR, Routing, Reactivity, and Testing.
 */

export interface StarterProjectFiles {
  [filePath: string]: string;
}

export function generateStarterProject(
  projectName: string,
  options: { template?: 'ssr' | 'spa' | 'minimal' | 'ssg'; typescript?: boolean } = {}
): StarterProjectFiles {
  const templateType = options.template || 'ssr';

  const scripts: Record<string, string> = {
    dev: 'samrey dev',
    build: 'samrey build',
    test: 'samrey test',
    audit: 'samrey audit',
    analyze: 'samrey analyze'
  };

  if (templateType === 'ssr') {
    scripts.start = 'node server.js';
  } else if (templateType === 'ssg') {
    scripts.build = 'samrey build && tsx ssg-build.ts';
    scripts.start = 'vite preview';
  } else {
    scripts.start = 'vite preview';
  }

  const packageJson = JSON.stringify(
    {
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts,
      dependencies: {
        '@samrey/compiler': '^1.0.0',
        '@samrey/reactivity': '^1.0.0',
        '@samrey/runtime': '^1.0.0',
        ...(templateType !== 'minimal' ? { '@samrey/router': '^1.0.0' } : {}),
        ...(templateType === 'ssr' || templateType === 'ssg' ? { '@samrey/ssr': '^1.0.0' } : {}),
        '@samrey/devtools': '^1.0.0'
      },
      devDependencies: {
        '@samrey/cli': '^1.0.0',
        typescript: '^5.0.0',
        vite: '^5.0.0'
      }
    },
    null,
    2
  );

  const tsconfigJson = JSON.stringify(
    {
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
    },
    null,
    2
  );

  const viteConfig = `import { defineConfig } from 'vite';
import { samreyVitePlugin } from '@samrey/cli';

export default defineConfig({
  plugins: [samreyVitePlugin()],
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
    <title>${projectName} - Samrey App</title>
  </head>
  <body>
    <div id="app"><!--ssr-outlet--></div>
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>
`;

  // Minimal Template App
  if (templateType === 'minimal') {
    const minimalApp = `import { signal } from '@samrey/reactivity';

export function App() {
  const count = signal(0);
  return (
    <main style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto;">
      <h1>${projectName}</h1>
      <p>Minimal Samrey Application</p>
      <div style="margin-top: 1rem;">
        <button type="button" onClick={() => count.value--}>-</button>
        <span style="margin: 0 1rem; font-weight: bold;">{count.value}</span>
        <button type="button" onClick={() => count.value++}>+</button>
      </div>
    </main>
  );
}
`;

    const minimalEntry = `import { mount } from '@samrey/runtime';
import { App } from './App.js';

const root = document.getElementById('app');
if (root) {
  mount(() => <App />, root);
}
`;

    const minimalTest = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signal } from '@samrey/reactivity';

describe('${projectName} Minimal Tests', () => {
  it('updates signal state', () => {
    const count = signal(0);
    assert.equal(count.value, 0);
    count.value = 42;
    assert.equal(count.value, 42);
  });
});
`;

    return {
      'package.json': packageJson,
      'tsconfig.json': tsconfigJson,
      'vite.config.ts': viteConfig,
      'index.html': indexHtml,
      'README.md': `# ${projectName}\n\nMinimal Samrey Application.\n`,
      '.gitignore': `node_modules/\ndist/\n.DS_Store\ncoverage/\n*.log\n`,
      'src/App.tsx': minimalApp,
      'src/entry-client.tsx': minimalEntry,
      'tests/app.test.ts': minimalTest
    };
  }

  // SSG / SPA / SSR Templates
  const appTsx = `import { signal } from '@samrey/reactivity';
import { Router, Route, Link } from '@samrey/router';
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

  const headerTsx = `import { Link } from '@samrey/router';

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

  const counterTsx = `import { signal } from '@samrey/reactivity';

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
      <h2>Welcome to your Samrey Application</h2>
      <p>Fine-grained reactive performance with zero virtual DOM overhead.</p>
      <Counter />
    </section>
  );
}
`;

  const aboutViewTsx = `export function AboutView() {
  return (
    <section class="page about-page">
      <h2>About Samrey Framework</h2>
      <p>Built for unmatched developer ergonomics, security sandboxing, and ultra-fast SSR.</p>
    </section>
  );
}
`;

  const entryClientTsx = `import { mount } from '@samrey/runtime';
import { App } from './App.js';

const root = document.getElementById('app');
if (root) {
  mount(() => <App />, root);
}
`;

  const entryServerTsx = `import { renderToString } from '@samrey/ssr';
import { App } from './App.js';

export function render(url: string) {
  return renderToString(() => <App />);
}
`;

  const ssgBuildTs = `import { generateStaticSite } from '@samrey/ssr';
import { App } from './src/App.js';

async function buildSSG() {
  await generateStaticSite({
    routes: ['/', '/about'],
    outDir: './dist',
    template: ({ route, bodyHtml }) => \`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName} - \${route}</title>
  </head>
  <body>
    <div id="app">\${bodyHtml}</div>
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>\`,
    renderRoute: async (route) => {
      const { renderToString } = await import('@samrey/ssr');
      return renderToString(() => <App />);
    }
  });
  console.log('SSG Build Complete!');
}

buildSSG().catch(console.error);
`;

  const testTsx = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signal } from '@samrey/reactivity';

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

Built with [Samrey Framework](https://github.com/samrey/samrey) (Template: ${templateType.toUpperCase()}).

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

  const result: StarterProjectFiles = {
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
    'tests/app.test.ts': testTsx
  };

  if (templateType === 'ssr') {
    result['src/entry-server.tsx'] = entryServerTsx;
  }
  if (templateType === 'ssg') {
    result['ssg-build.ts'] = ssgBuildTs;
    result['src/entry-server.tsx'] = entryServerTsx;
  }

  return result;
}
