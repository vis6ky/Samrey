/**
 * @license Apache-2.0
 * @samrey/example-ssg - Static Site Generation Build Script
 */

import { generateStaticSite } from '@samrey/ssr';
import { routes } from './pages.js';
import * as path from 'node:path';

async function buildStaticSite() {
  console.log('[Samrey SSG] Starting static site generation...');

  const outDir = path.join(process.cwd(), 'dist/ssg-output');

  const result = await generateStaticSite(routes, {
    outDir,
    writeFiles: true,
    generateSitemap: true,
    baseUrl: 'https://samrey.dev',
    clientStyles: ['https://cdn.tailwindcss.com']
  });

  console.log(`[Samrey SSG] Generated ${result.totalPages} static pages in ${result.totalDurationMs}ms.`);
  result.pages.forEach((p) => {
    console.log(`  -> ${p.path} [${p.sizeBytes} bytes] (${p.renderTimeMs}ms)`);
  });
}

buildStaticSite().catch((err) => {
  console.error('[Samrey SSG Build Failed]:', err);
  process.exit(1);
});
