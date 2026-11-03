/**
 * @license Apache-2.0
 * @samrey/ssr - Static Site Generation (SSG) Engine
 */

import { renderToString, RenderToStringOptions } from './stream.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface StaticPathEntry {
  params: Record<string, string>;
  title?: string;
  state?: Record<string, unknown>;
}

export interface StaticRouteConfig {
  path: string;
  component: (() => unknown) | string;
  title?: string;
  state?: Record<string, unknown> | (() => Promise<Record<string, unknown>>);
  getStaticPaths?: () => Promise<StaticPathEntry[]> | StaticPathEntry[];
}

export interface SSGOptions {
  outDir?: string;
  writeFiles?: boolean;
  baseUrl?: string;
  generateSitemap?: boolean;
  clientScript?: string;
  clientStyles?: string[];
  headTags?: string;
  strictSecrets?: boolean;
}

export interface GeneratedPage {
  path: string;
  filePath: string;
  html: string;
  sizeBytes: number;
  renderTimeMs: number;
}

export interface SSGResult {
  pages: GeneratedPage[];
  totalPages: number;
  totalDurationMs: number;
  sitemapXml?: string;
}

function interpolatePath(routePattern: string, params: Record<string, string>): string {
  let resolved = routePattern;
  const sortedKeys = Object.keys(params).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const regex = new RegExp(`:${key}(?![a-zA-Z0-9_])`, 'g');
    resolved = resolved.replace(regex, encodeURIComponent(params[key]));
  }
  return resolved;
}

/**
 * Computes standard output file path (e.g. '/' -> 'index.html', '/about' -> 'about/index.html').
 */
function toOutputFilePath(routePath: string, outDir: string): string {
  const segments = routePath.split(/[/\\]/);
  if (segments.includes('..')) {
    throw new Error(`[Samrey SSG] Path traversal blocked for route: "${routePath}"`);
  }

  const normalized = routePath === '/' ? 'index' : routePath.replace(/^\//, '');
  let relativeTarget: string;
  if (normalized.endsWith('.html')) {
    relativeTarget = normalized;
  } else if (normalized === '404' || normalized === '500') {
    relativeTarget = `${normalized}.html`;
  } else {
    relativeTarget = path.join(normalized, 'index.html');
  }

  const absoluteOut = path.resolve(outDir);
  const targetPath = path.resolve(absoluteOut, relativeTarget);

  if (!targetPath.startsWith(absoluteOut + path.sep) && targetPath !== path.join(absoluteOut, 'index.html')) {
    throw new Error(`[Samrey SSG] Path traversal blocked outside target directory: "${routePath}"`);
  }

  return targetPath;
}

/**
 * Builds static HTML pages for all specified routes and dynamic parameter sets.
 */
export async function generateStaticSite(
  routes: StaticRouteConfig[],
  options: SSGOptions = {}
): Promise<SSGResult> {
  const startTime = Date.now();
  const outDir = options.outDir || path.join(process.cwd(), 'dist/static');
  const writeFiles = options.writeFiles ?? true;
  const generatedPages: GeneratedPage[] = [];

  for (const route of routes) {
    if (route.path.includes(':') && route.getStaticPaths) {
      // Dynamic parameterized route
      const entries = await route.getStaticPaths();
      for (const entry of entries) {
        const resolvedPath = interpolatePath(route.path, entry.params);
        const pageStart = Date.now();

        let pageState: Record<string, unknown> = entry.state || {};
        if (typeof route.state === 'function') {
          pageState = { ...pageState, ...(await route.state()) };
        } else if (route.state) {
          pageState = { ...pageState, ...route.state };
        }

        const html = await renderToString(route.component, {
          title: entry.title || route.title,
          state: pageState,
          clientScript: options.clientScript,
          clientStyles: options.clientStyles,
          headTags: options.headTags,
          strictSecrets: options.strictSecrets
        });

        const filePath = toOutputFilePath(resolvedPath, outDir);
        const sizeBytes = Buffer.byteLength(html, 'utf8');
        const renderTimeMs = Date.now() - pageStart;

        generatedPages.push({
          path: resolvedPath,
          filePath,
          html,
          sizeBytes,
          renderTimeMs
        });
      }
    } else {
      // Static fixed route
      const pageStart = Date.now();
      let pageState: Record<string, unknown> = {};
      if (typeof route.state === 'function') {
        pageState = await route.state();
      } else if (route.state) {
        pageState = route.state;
      }

      const html = await renderToString(route.component, {
        title: route.title,
        state: pageState,
        clientScript: options.clientScript,
        clientStyles: options.clientStyles,
        headTags: options.headTags,
        strictSecrets: options.strictSecrets
      });

      const filePath = toOutputFilePath(route.path, outDir);
      const sizeBytes = Buffer.byteLength(html, 'utf8');
      const renderTimeMs = Date.now() - pageStart;

      generatedPages.push({
        path: route.path,
        filePath,
        html,
        sizeBytes,
        renderTimeMs
      });
    }
  }

  // Write static files to filesystem if requested
  if (writeFiles) {
    for (const page of generatedPages) {
      await fs.mkdir(path.dirname(page.filePath), { recursive: true });
      await fs.writeFile(page.filePath, page.html, 'utf8');
    }
  }

  // Optional sitemap generation
  let sitemapXml: string | undefined;
  if (options.generateSitemap && options.baseUrl) {
    const base = options.baseUrl.replace(/\/$/, '');
    sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${generatedPages
  .map(
    (p) => `  <url>
    <loc>${base}${p.path.startsWith('/') ? p.path : '/' + p.path}</loc>
    <changefreq>daily</changefreq>
    <priority>${p.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    if (writeFiles) {
      await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemapXml, 'utf8');
    }
  }

  return {
    pages: generatedPages,
    totalPages: generatedPages.length,
    totalDurationMs: Date.now() - startTime,
    sitemapXml
  };
}
