import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateStaticSite, StaticRouteConfig } from '../src/index.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

describe('@samrey/ssr - Static Site Generation (SSG)', () => {
  it('generates static HTML pages for fixed and dynamic routes', async () => {
    const routes: StaticRouteConfig[] = [
      {
        path: '/',
        title: 'Home Page',
        component: () => '<h1>Home</h1>'
      },
      {
        path: '/about',
        title: 'About Us',
        component: () => '<article><h2>About Team</h2></article>'
      },
      {
        path: '/blog/:slug',
        component: () => '<article class="post"><h1>Blog Post</h1></article>',
        getStaticPaths: () => [
          { params: { slug: 'launching-samrey' }, title: 'Launching Samrey' },
          { params: { slug: 'reactivity-deep-dive' }, title: 'Reactivity Deep Dive' }
        ]
      }
    ];

    const result = await generateStaticSite(routes, {
      writeFiles: false,
      generateSitemap: true,
      baseUrl: 'https://samrey.dev'
    });

    assert.equal(result.totalPages, 4);
    assert.ok(result.totalDurationMs >= 0);

    const paths = result.pages.map((p) => p.path);
    assert.ok(paths.includes('/'));
    assert.ok(paths.includes('/about'));
    assert.ok(paths.includes('/blog/launching-samrey'));
    assert.ok(paths.includes('/blog/reactivity-deep-dive'));

    const homePage = result.pages.find((p) => p.path === '/');
    assert.ok(homePage?.html.includes('<title>Home Page</title>'));
    assert.ok(homePage?.html.includes('<h1>Home</h1>'));

    assert.ok(result.sitemapXml);
    assert.ok(result.sitemapXml?.includes('https://samrey.dev/blog/launching-samrey'));
    assert.ok(result.sitemapXml?.includes('https://samrey.dev/about'));
  });

  it('XML-escapes special characters in generated sitemap <loc> entries (Bug 8b)', async () => {
    const result = await generateStaticSite(
      [{ path: '/search?q=a&b=<tag>', component: () => '<p>Search</p>' }],
      {
        writeFiles: false,
        generateSitemap: true,
        baseUrl: 'https://samrey.dev'
      }
    );

    assert.ok(result.sitemapXml);
    assert.ok(result.sitemapXml?.includes('https://samrey.dev/search?q=a&amp;b=&lt;tag&gt;'));
    assert.ok(!result.sitemapXml?.includes('<tag></loc>'));
  });

  it('creates outDir cleanly before writing sitemap.xml even when routes list is empty', async () => {
    const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'samrey-ssg-empty-'));
    const nestedOut = path.join(tmpBase, 'dist', 'static');
    try {
      const res = await generateStaticSite([], {
        outDir: nestedOut,
        writeFiles: true,
        generateSitemap: true,
        baseUrl: 'https://samrey.dev'
      });
      assert.equal(res.totalPages, 0);
      const written = await fs.readFile(path.join(nestedOut, 'sitemap.xml'), 'utf8');
      assert.ok(written.includes('<urlset'));
    } finally {
      await fs.rm(tmpBase, { recursive: true, force: true });
    }
  });
});
