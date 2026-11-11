/**
 * @license Apache-2.0
 * @samrey/ssr - HTML String & Streaming Renderer
 */

import { serializeStateForHydration } from './serializer.js';
import { getDelegatedEventScript } from './hydration.js';
import { createSSRContext, runWithSSRContext, resolveSSRContext, SSRContext } from './context.js';
import { escapeHtmlText, escapeHtmlAttribute, sanitizeUri, sanitizeHeadTags } from '@samrey/security';

export interface RenderToStringOptions {
  title?: string;
  context?: SSRContext;
  state?: Record<string, unknown>;
  clientScript?: string;
  clientStyles?: string[];
  headTags?: string;
  events?: string[];
  scriptNonce?: string;
  nonce?: string;
  strictSecrets?: boolean;
  errorBoundary?: (error: Error) => string;
}

export interface RenderToStreamOptions extends RenderToStringOptions {
  abortSignal?: AbortSignal;
  timeoutMs?: number;
}

function serializeNodeOutput(val: unknown): string {
  if (val === null || val === undefined || val === false || val === true) {
    return '';
  }
  if (typeof val === 'string') {
    return val;
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (Array.isArray(val)) {
    return val.map(serializeNodeOutput).join('');
  }
  if (typeof val === 'object') {
    if ('outerHTML' in val && typeof (val as any).outerHTML === 'string') {
      return (val as any).outerHTML;
    }
    if ('innerHTML' in val && typeof (val as any).innerHTML === 'string') {
      return (val as any).innerHTML;
    }
    if ('nodeType' in val && (val as any).nodeType === 8) {
      return '';
    }
    if ('textContent' in val && (val as any).textContent !== undefined) {
      return escapeHtmlText((val as any).textContent);
    }
  }
  return String(val);
}

function renderHeadElements(ctx: SSRContext, options: RenderToStringOptions): {
  stylesTags: string;
  clientScriptTag: string;
  metaTags: string;
  safeHeadTags: string;
  delegatorScript: string;
} {
  const nonce = options.nonce || options.scriptNonce;
  const delegatorScript = getDelegatedEventScript(options.events, nonce);
  const sanitizedClientScript = options.clientScript ? sanitizeUri(options.clientScript, { allowImageDataUri: false }) : '';
  const clientScriptTag = sanitizedClientScript && sanitizedClientScript !== 'about:blank'
    ? `<script type="module" src="${escapeHtmlAttribute(sanitizedClientScript)}"${nonce ? ` nonce="${escapeHtmlAttribute(nonce)}"` : ''}></script>`
    : '';
  const stylesTags = options.clientStyles
    ? options.clientStyles
        .map((s) => sanitizeUri(s, { allowImageDataUri: false }))
        .filter((s) => s !== 'about:blank')
        .map((s) => `<link rel="stylesheet" href="${escapeHtmlAttribute(s)}">`)
        .join('\n  ')
    : '';
  const metaTags = ctx.head.meta
    .map((m) => {
      const attr = m.name ? `name="${escapeHtmlAttribute(m.name)}"` : `property="${escapeHtmlAttribute(m.property || '')}"`;
      return `<meta ${attr} content="${escapeHtmlAttribute(m.content || '')}">`;
    })
    .join('\n  ');
  const safeHeadTags = options.headTags ? sanitizeHeadTags(options.headTags) : '';

  return { stylesTags, clientScriptTag, metaTags, safeHeadTags, delegatorScript };
}

/**
 * Renders an Samrey application or component function to a complete HTML string.
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
      bodyHtml = serializeNodeOutput(finalPass);
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
      bodyHtml = `<div class="samrey-ssr-error" role="alert"><h1>Application Error</h1><pre>${escapeHtmlText(errorObj.message)}</pre></div>`;
    }
  }

  const title = options.title || ctx.head.title || 'Samrey Application';
  const { stylesTags, clientScriptTag, metaTags, safeHeadTags, delegatorScript } = renderHeadElements(ctx, options);

  // Generate serialized state script
  const nonce = options.nonce || options.scriptNonce;
  const stateScript = serializeStateForHydration(ctx.state, {
    strict: options.strictSecrets,
    nonce
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlText(title)}</title>
  ${metaTags}
  ${stylesTags}
  ${safeHeadTags}
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
 * Streams an Samrey application HTML response in real-time using standard Web ReadableStreams.
 */
export function renderToStream(
  app: (() => unknown) | string,
  options: RenderToStreamOptions = {}
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const ctx = options.context || createSSRContext(options.state || {});

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;

      const cleanupAbortListener = () => {
        if (options.abortSignal && onAbort) {
          options.abortSignal.removeEventListener('abort', onAbort);
          onAbort = undefined;
        }
      };

      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          if (timeoutId !== undefined) clearTimeout(timeoutId);
          cleanupAbortListener();
          controller.close();
        }
      };

      const safeError = (err: unknown) => {
        if (!isClosed) {
          isClosed = true;
          if (timeoutId !== undefined) clearTimeout(timeoutId);
          cleanupAbortListener();
          ctx.loaders.clear();
          ctx.errors.length = 0;
          controller.error(err);
        }
      };

      if (options.abortSignal?.aborted) {
        safeError(options.abortSignal.reason);
        return;
      }

      if (options.abortSignal) {
        onAbort = () => safeError(options.abortSignal?.reason);
        options.abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      if (options.timeoutMs && options.timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          safeError(new Error(`[Samrey SSR] renderToStream timed out after ${options.timeoutMs}ms`));
        }, options.timeoutMs);
      }

      const send = (chunk: string) => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(chunk));
        }
      };

      // 1. Run the app's synchronous shell render first with the SSR context active
      let shellResult: any = undefined;
      let bodyContent = '';
      let shellThrew = false;

      try {
        if (typeof app === 'function') {
          shellResult = runWithSSRContext(ctx, () => app());
        } else {
          bodyContent = String(app);
        }
      } catch (err) {
        shellThrew = true;
        const errorObj = err instanceof Error ? err : new Error(String(err));
        ctx.setError(errorObj, 500);
        bodyContent = options.errorBoundary
          ? options.errorBoundary(errorObj)
          : `<div class="samrey-ssr-error" role="alert"><h2>Stream Error</h2><p>${escapeHtmlText(errorObj.message)}</p></div>`;
      }

      if (isClosed) return;

      // 2. Head elements (title, meta, links) are now collected from the synchronous shell render
      const title = options.title || ctx.head.title || 'Samrey Application';
      const { stylesTags, clientScriptTag, metaTags, safeHeadTags, delegatorScript } = renderHeadElements(ctx, options);
      ctx.headFlushed = true;

      // Write head and opening shell
      send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlText(title)}</title>
  ${metaTags}
  ${stylesTags}
  ${safeHeadTags}
  ${delegatorScript}
</head>
<body>
  <div id="app">`);

      // 3. If shell succeeded, await server data loaders if any, otherwise stream shell result
      if (!shellThrew && typeof app === 'function') {
        try {
          if (ctx.loaders.size > 0) {
            await resolveSSRContext(ctx);
            if (isClosed) return;

            const finalPass = runWithSSRContext(ctx, () => app());
            bodyContent = serializeNodeOutput(finalPass);
          } else {
            bodyContent = serializeNodeOutput(shellResult);
          }
        } catch (err) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          ctx.setError(errorObj, 500);
          bodyContent = options.errorBoundary
            ? options.errorBoundary(errorObj)
            : `<div class="samrey-ssr-error" role="alert"><h2>Stream Error</h2><p>${escapeHtmlText(errorObj.message)}</p></div>`;
        }
      }

      if (isClosed) return;

      send(bodyContent);
      send(`</div>`);

      // 4. Send final hydration state and closing tags
      const nonce = options.nonce || options.scriptNonce;
      const stateScript = serializeStateForHydration(ctx.state, {
        strict: options.strictSecrets,
        nonce
      });

      send(`\n  ${stateScript}`);
      if (clientScriptTag) {
        send(`\n  ${clientScriptTag}`);
      }
      send(`\n</body>\n</html>`);

      safeClose();
    }
  });
}
