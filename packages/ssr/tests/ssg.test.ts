import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateStaticSite, StaticRouteConfig } from '../src/index.js';

describe('@gati/ssr - Static Site Generation (SSG)', () => {
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
          { params: { slug: 'launching-aether' }, title: 'Launching Gati' },
          { params: { slug: 'reactivity-deep-dive' }, title: 'Reactivity Deep Dive' }
        ]
      }
    ];

    const result = await generateStaticSite(routes, {
      writeFiles: false,
      generateSitemap: true,
      baseUrl: 'https://gati.dev'
    });

    assert.equal(result.totalPages, 4);
    assert.ok(result.totalDurationMs >= 0);

    const paths = result.pages.map((p) => p.path);
    assert.ok(paths.includes('/'));
    assert.ok(paths.includes('/about'));
    assert.ok(paths.includes('/blog/launching-aether'));
    assert.ok(paths.includes('/blog/reactivity-deep-dive'));

    const homePage = result.pages.find((p) => p.path === '/');
    assert.ok(homePage?.html.includes('<title>Home Page</title>'));
    assert.ok(homePage?.html.includes('<h1>Home</h1>'));

    assert.ok(result.sitemapXml);
    assert.ok(result.sitemapXml?.includes('https://gati.dev/blog/launching-aether'));
    assert.ok(result.sitemapXml?.includes('https://gati.dev/about'));
  });
});
