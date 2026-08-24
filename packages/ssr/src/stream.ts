/**
 * @license Apache-2.0
 * @gati/ssr - HTML String & Streaming Renderer
 */

import { serializeStateForHydration } from './serializer.js';
import { getDelegatedEventScript } from './hydration.js';
import { createSSRContext, runWithSSRContext, resolveSSRContext, SSRContext } from './context.js';
import { escapeHtmlText } from '@gati/security';

export interface RenderToStringOptions {
  title?: string;
  context?: SSRContext;
  state?: Record<string, unknown>;
  clientScript?: string;
  clientStyles?: string[];
  headTags?: string;
  events?: string[];
  strictSecrets?: boolean;
  errorBoundary?: (error: Error) => string;
}

export interface RenderToStreamOptions extends RenderToStringOptions {
  abortSignal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Renders an Gati application or component function to a complete HTML string.
 * Automatically resolves server data loaders, handles error boundaries, and serializes state safely.
 */
export async function renderToString(
  app: (() => unknown) | string,
  options: RenderToStringOptions = {}
): Promise<string> {
  const ctx = options.context || createSSRContext(options.state || {});
  let bodyHtml = '';

  try {
    if (typeof app === 'function') {
      // 1. Initial execution to trigger and register all server data loaders
      runWithSSRContext(ctx, () => app());

      // 2. Wait for all registered server-side data loaders to resolve
      await resolveSSRContext(ctx);

      // 3. Render final HTML output now that data is populated in context state
      const finalPass = runWithSSRContext(ctx, () => app());
      if (finalPass && typeof finalPass === 'object' && 'outerHTML' in finalPass) {
        bodyHtml = (finalPass as { outerHTML: string }).outerHTML;
      } else {
        bodyHtml = typeof finalPass === 'string' ? finalPass : String(finalPass || '');
      }
    } else {
      bodyHtml = String(app);
      await resolveSSRContext(ctx);
    }
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    ctx.setError(errorObj, 500);

    if (options.errorBoundary) {
      bodyHtml = options.errorBoundary(errorObj);
    } else {
      bodyHtml = `<div class="aether-ssr-error" role="alert"><h1>Application Error</h1><pre>${escapeHtmlText(errorObj.message)}</pre></div>`;
    }
  }

  // Generate serialized state script
  const stateScript = serializeStateForHydration(ctx.state, {
    strict: options.strictSecrets
  });

  const delegatorScript = getDelegatedEventScript(options.events);
  const title = options.title || ctx.head.title || 'Gati Application';
  const clientScriptTag = options.clientScript ? `<script type="module" src="${options.clientScript}"></script>` : '';
  const stylesTags = options.clientStyles ? options.clientStyles.map((s) => `<link rel="stylesheet" href="${s}">`).join('\n  ') : '';
  const metaTags = ctx.head.meta.map((m) => `<meta ${m.name ? `name="${m.name}"` : `property="${m.property}"`} content="${m.content}">`).join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlText(title)}</title>
  ${metaTags}
  ${stylesTags}
  ${options.headTags || ''}
  ${delegatorScript}
</head>
<body>
  <div id="app">${bodyHtml}</div>
  ${stateScript}
  ${clientScriptTag}
</body>
</html>`;
}

/**
 * Streams an Gati application HTML response in real-time using standard Web ReadableStreams.
 */
export function renderToStream(
  app: (() => unknown) | string,
  options: RenderToStreamOptions = {}
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const ctx = options.context || createSSRContext(options.state || {});

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      const title = options.title || ctx.head.title || 'Gati Application';
      const delegatorScript = getDelegatedEventScript(options.events);
      const clientScriptTag = options.clientScript ? `<script type="module" src="${options.clientScript}"></script>` : '';
      const stylesTags = options.clientStyles ? options.clientStyles.map((s) => `<link rel="stylesheet" href="${s}">`).join('\n  ') : '';

      // 1. Send initial head & shell immediately
      send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlText(title)}</title>
  ${stylesTags}
  ${options.headTags || ''}
  ${delegatorScript}
</head>
<body>
  <div id="app">`);

      // 2. Execute app and await server data loaders
      let bodyContent = '';
      try {
        if (typeof app === 'function') {
          runWithSSRContext(ctx, () => app());
          await resolveSSRContext(ctx);

          const finalPass = runWithSSRContext(ctx, () => app());
          if (finalPass && typeof finalPass === 'object' && 'outerHTML' in finalPass) {
            bodyContent = (finalPass as { outerHTML: string }).outerHTML;
          } else {
            bodyContent = typeof finalPass === 'string' ? finalPass : String(finalPass || '');
          }
        } else {
          bodyContent = String(app);
          await resolveSSRContext(ctx);
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        ctx.setError(errorObj, 500);
        bodyContent = options.errorBoundary
          ? options.errorBoundary(errorObj)
          : `<div class="aether-ssr-error" role="alert"><h2>Stream Error</h2><p>${escapeHtmlText(errorObj.message)}</p></div>`;
      }

      send(bodyContent);
      send(`</div>`);

      // 3. Send final hydration state and closing tags
      const stateScript = serializeStateForHydration(ctx.state, {
        strict: options.strictSecrets
      });

      send(`\n  ${stateScript}`);
      if (clientScriptTag) {
        send(`\n  ${clientScriptTag}`);
      }
      send(`\n</body>\n</html>`);

      controller.close();
    }
  });
}
