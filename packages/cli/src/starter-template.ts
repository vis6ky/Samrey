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
    scripts.build = 'samrey build && samrey build --ssr src/entry-server.ts --outDir dist/server';
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
      version: '2.1.0',
      type: 'module',
      scripts,
      dependencies: {
        '@samrey/compiler': '^2.1.0',
        '@samrey/reactivity': '^2.1.0',
        '@samrey/runtime': '^2.1.0',
        ...(templateType !== 'minimal' ? { '@samrey/router': '^2.1.0' } : {}),
        ...(templateType === 'ssr' || templateType === 'ssg' ? { '@samrey/ssr': '^2.1.0' } : {}),
        '@samrey/devtools': '^2.1.0'
      },
      devDependencies: {
        '@samrey/cli': '^2.1.0',
        '@types/node': '^20.0.0',
        tsx: '^4.19.0',
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
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        types: ['node', '@samrey/runtime/ambient']
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
    <script type="module" src="/src/entry-client.ts"></script>
  </body>
</html>
`;

  // Minimal Template App
  if (templateType === 'minimal') {
    const minimalApp = `import { el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export function App() {
  const count = signal(0);
  return el(
    'main',
    { style: 'font-family: sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto;' },
    el('h1', null, '${projectName}'),
    el('p', null, 'Minimal Samrey Application'),
    el(
      'div',
      { style: 'margin-top: 1rem;' },
      el('button', { type: 'button', onClick: () => count.value-- }, '-'),
      el('span', { style: 'margin: 0 1rem; font-weight: bold;' }, () => count.value),
      el('button', { type: 'button', onClick: () => count.value++ }, '+')
    )
  );
}
`;

    const minimalEntry = `import { mount } from '@samrey/runtime';
import { App } from './App.js';

const root = document.getElementById('app');
if (root) {
  mount(() => App(), root);
}
`;

    const minimalTest = `import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { App } from '../src/App.js';

describe('${projectName} Minimal Tests', () => {
  it('renders application node and verifies structure', () => {
    const node = App();
    assert.ok(node, 'App must return a node');
    const html = (node as any).outerHTML || (node as any).textContent || '';
    assert.ok(html.includes('${projectName}'), 'Must render project name');
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
      'src/App.ts': minimalApp,
      'src/entry-client.ts': minimalEntry,
      'tests/app.test.ts': minimalTest
    };
  }

  // SSG / SPA / SSR Templates
  const appTs = `import { el } from '@samrey/runtime';
import { Router } from '@samrey/router';
import { Header } from './components/Header.js';
import { HomeView } from './views/HomeView.js';
import { AboutView } from './views/AboutView.js';

export function App(props?: { url?: string }) {
  return el(
    'div',
    { class: 'app-container' },
    Header({ title: '${projectName}' }),
    el(
      'main',
      null,
      Router({
        initialPath: props?.url || '/',
        routes: [
          { path: '/', component: HomeView },
          { path: '/about', component: AboutView }
        ]
      })
    )
  );
}
`;

  const headerTs = `import { el } from '@samrey/runtime';
import { Link } from '@samrey/router';

export function Header(props: { title: string }) {
  return el(
    'header',
    { class: 'navbar' },
    el('div', { class: 'brand' }, el('h1', null, props.title)),
    el(
      'nav',
      null,
      Link({ href: '/', children: 'Home' }),
      ' ',
      Link({ href: '/about', children: 'About' })
    )
  );
}
`;

  const counterTs = `import { el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export function Counter() {
  const count = signal(0);
  const increment = () => { count.value++; };
  const decrement = () => { count.value--; };

  return el(
    'div',
    { class: 'counter-card' },
    el('h3', null, 'Reactive Counter'),
    el(
      'p',
      { class: 'count-display' },
      'Current Count: ',
      el('strong', null, () => count.value)
    ),
    el(
      'div',
      { class: 'actions' },
      el('button', { type: 'button', onClick: decrement }, '-'),
      el('button', { type: 'button', onClick: increment }, '+')
    )
  );
}
`;

  const homeViewTs = `import { el } from '@samrey/runtime';
import { Counter } from '../components/Counter.js';

export function HomeView() {
  return el(
    'section',
    { class: 'page home-page' },
    el('h2', null, 'Welcome to your Samrey Application'),
    el('p', null, 'Fine-grained reactive performance with zero virtual DOM overhead.'),
    Counter()
  );
}
`;

  const aboutViewTs = `import { el } from '@samrey/runtime';

export function AboutView() {
  return el(
    'section',
    { class: 'page about-page' },
    el('h2', null, 'About Samrey Framework'),
    el('p', null, 'Built for unmatched developer ergonomics, security sandboxing, and ultra-fast SSR.')
  );
}
`;

  const entryClientTs = `import { mount } from '@samrey/runtime';
import { App } from './App.js';

const root = document.getElementById('app');
if (root) {
  mount(() => App(), root);
}
`;

  const entryServerTs = `import { renderToString, type RenderToStringOptions } from '@samrey/ssr';
import { App } from './App.js';

export function render(url?: string, options?: RenderToStringOptions) {
  return renderToString(() => App({ url }), options);
}
`;

  const ssrServerJs = `import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const distDir = path.resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';

function resolveClientScript() {
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return undefined;
  const entry = fs.readdirSync(assetsDir).find((f) => f.endsWith('.js'));
  return entry ? \`/assets/\${entry}\` : undefined;
}

function resolveSafeStaticPath(reqPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(reqPath);
  } catch {
    return null;
  }
  const cleanRel = decoded.replace(/^\\/+/, '');
  if (!cleanRel || cleanRel === 'index.html') return null;
  const segments = cleanRel.split(/[\\\\/]+/).filter(Boolean);
  if (segments.some((s) => s === '.' || s === '..' || s.startsWith('.'))) {
    return 'FORBIDDEN';
  }
  if (segments[0] === 'server') {
    return 'FORBIDDEN';
  }
  const resolved = path.resolve(distDir, cleanRel);
  if (!resolved.startsWith(distDir + path.sep)) {
    return 'FORBIDDEN';
  }
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return resolved;
  }
  return null;
}

const serverEntryPath = path.join(distDir, 'server', 'entry-server.js');
if (!fs.existsSync(serverEntryPath)) {
  console.error('SSR server bundle missing. Run "npm run build" before "npm start".');
  process.exit(1);
}

const { render } = await import(pathToFileURL(serverEntryPath).href);
const clientScript = resolveClientScript();

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0] || '/';
  const staticPath = resolveSafeStaticPath(urlPath);
  if (staticPath === 'FORBIDDEN') {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  if (staticPath) {
    const ext = path.extname(staticPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(staticPath).pipe(res);
    return;
  }

  try {
    const html = await render(req.url || '/', clientScript ? { clientScript } : undefined);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    console.error('[SSR Error]', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(\`Samrey SSR server listening at http://\${host}:\${port}\`);
});
`;

  const ssgBuildTs = `import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateStaticSite } from '@samrey/ssr';
import { App } from './src/App.js';

function resolveClientScript(distDir: string): string {
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const entry = fs.readdirSync(assetsDir).find((f) => f.endsWith('.js'));
    if (entry) return \`/assets/\${entry}\`;
  }
  return '/src/entry-client.ts';
}

async function buildSSG() {
  const outDir = './dist';
  const result = await generateStaticSite(
    [
      { path: '/', component: () => App({ url: '/' }), title: '${projectName} - Home' },
      { path: '/about', component: () => App({ url: '/about' }), title: '${projectName} - About' }
    ],
    {
      outDir,
      clientScript: resolveClientScript(path.resolve(process.cwd(), outDir))
    }
  );
  console.log(\`SSG Build Complete! (\${result.totalPages} pages)\`);
}

buildSSG().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
`;

  const testTs = `import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { App } from '../src/App.js';
import { Counter } from '../src/components/Counter.js';
import { Header } from '../src/components/Header.js';

describe('${projectName} Component Suite', () => {
  it('renders application and verifies reactive structure', () => {
    const node = App();
    assert.ok(node, 'App must return a valid DOM/mock node');
    const html = (node as any).outerHTML || (node as any).textContent || '';
    assert.ok(html.includes('${projectName}') || html.includes('app-container'), 'Must render application structure');
  });

  it('renders Header component with title prop', () => {
    const header = Header({ title: 'My Custom App' });
    assert.ok(header, 'Header must return a node');
    const html = (header as any).outerHTML || '';
    assert.ok(html.includes('My Custom App'), 'Header must contain title prop');
  });

  it('renders Counter component with initial count', () => {
    const counter = Counter();
    assert.ok(counter, 'Counter must return a node');
    const html = (counter as any).outerHTML || '';
    assert.ok(html.includes('Current Count:'), 'Counter must contain count display');
    assert.ok(html.includes('0'), 'Counter must show initial count 0');
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
    'src/App.ts': appTs,
    'src/components/Header.ts': headerTs,
    'src/components/Counter.ts': counterTs,
    'src/views/HomeView.ts': homeViewTs,
    'src/views/AboutView.ts': aboutViewTs,
    'src/entry-client.ts': entryClientTs,
    'tests/app.test.ts': testTs
  };

  if (templateType === 'ssr') {
    result['src/entry-server.ts'] = entryServerTs;
    result['server.js'] = ssrServerJs;
  }
  if (templateType === 'ssg') {
    result['ssg-build.ts'] = ssgBuildTs;
    result['src/entry-server.ts'] = entryServerTs;
  }

  return result;
}
