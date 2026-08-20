/**
 * @license Apache-2.0
 * @aether/example-ssg - Static Site Generation Build Script
 */

import { generateStaticSite } from '@aether/ssr';
import { routes } from './pages.js';
import * as path from 'node:path';

async function buildStaticSite() {
  console.log('[Aether SSG] Starting static site generation...');

  const outDir = path.join(process.cwd(), 'dist/ssg-output');

  const result = await generateStaticSite(routes, {
    outDir,
    writeFiles: true,
    generateSitemap: true,
    baseUrl: 'https://aether.dev',
    clientStyles: ['https://cdn.tailwindcss.com']
  });

  console.log(`[Aether SSG] Generated ${result.totalPages} static pages in ${result.totalDurationMs}ms.`);
  result.pages.forEach((p) => {
    console.log(`  -> ${p.path} [${p.sizeBytes} bytes] (${p.renderTimeMs}ms)`);
  });
}

buildStaticSite().catch((err) => {
  console.error('[Aether SSG Build Failed]:', err);
  process.exit(1);
});
