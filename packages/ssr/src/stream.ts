/**
 * @license Apache-2.0
 * @samrey/ssr - HTML String & Streaming Renderer
 */

import { createOwner, runWithOwner, Owner } from '@samrey/reactivity';
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
  linksTags: string;
  headScriptsTags: string;
  clientScriptTag: string;
  metaTags: string;
  safeHeadTags: string;
  delegatorScript: string;
} {
  const nonce = options.nonce || options.scriptNonce;
  const nonceAttr = nonce ? ` nonce="${escapeHtmlAttribute(nonce)}"` : '';
  const delegatorScript = getDelegatedEventScript(options.events, nonce);
  const sanitizeAsset = (raw?: string): string => {
    if (!raw) return '';
    const cleaned = sanitizeUri(raw, { allowImageDataUri: false, allowProtocolRelative: false });
    return cleaned && cleaned !== 'about:blank' ? cleaned : '';
  };

  const sanitizedClientScript = sanitizeAsset(options.clientScript);
  const clientScriptTag = sanitizedClientScript
    ? `<script type="module" src="${escapeHtmlAttribute(sanitizedClientScript)}"${nonceAttr}></script>`
    : '';
  const stylesTags = options.clientStyles
    ? options.clientStyles
        .map((s) => sanitizeAsset(s))
        .filter(Boolean)
        .map((s) => `<link rel="stylesheet" href="${escapeHtmlAttribute(s)}">`)
        .join('\n  ')
    : '';
  const linksTags = ctx.head.links
    .map((link) => {
      const rel = String(link.rel || '').trim();
      if (!rel || rel.toLowerCase() === 'import') return '';
      const safeHref = sanitizeAsset(link.href);
      if (!safeHref) return '';
      const asAttr = link.as ? ` as="${escapeHtmlAttribute(link.as)}"` : '';
      return `<link rel="${escapeHtmlAttribute(rel)}" href="${escapeHtmlAttribute(safeHref)}"${asAttr}>`;
    })
    .filter(Boolean)
    .join('\n  ');
  const headScriptsTags = ctx.head.scripts
    .map((sc) => {
      const typeAttr = sc.type ? ` type="${escapeHtmlAttribute(sc.type)}"` : '';
      const deferAttr = sc.defer ? ' defer' : '';
      if (sc.src) {
        const safeSrc = sanitizeAsset(sc.src);
        if (!safeSrc) return '';
        return `<script${typeAttr} src="${escapeHtmlAttribute(safeSrc)}"${deferAttr}${nonceAttr}></script>`;
      }
      if (typeof sc.inline === 'string' && sc.inline.length > 0) {
        const safeInline = sc.inline.replace(/<\//gi, '<\\/').replace(/<!--/g, '\\x3C!--');
        return `<script${typeAttr}${deferAttr}${nonceAttr}>${safeInline}</script>`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n  ');
  const metaTags = ctx.head.meta
    .map((m) => {
      const attr = m.name ? `name="${escapeHtmlAttribute(m.name)}"` : `property="${escapeHtmlAttribute(m.property || '')}"`;
      return `<meta ${attr} content="${escapeHtmlAttribute(m.content || '')}">`;
    })
    .join('\n  ');
  const safeHeadTags = options.headTags ? sanitizeHeadTags(options.headTags) : '';

  return { stylesTags, linksTags, headScriptsTags, clientScriptTag, metaTags, safeHeadTags, delegatorScript };
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

  const initialHeadTitle = ctx.head.title;
  const initialMetaLen = ctx.head.meta.length;
  const initialLinksLen = ctx.head.links.length;
  const initialScriptsLen = ctx.head.scripts.length;

  try {
    if (typeof app === 'function') {
      // 1. Initial pass inside an isolated Owner so effects/resources register and clean up safely
      const pass1Owner = createOwner(null);
      let pass1Result: unknown;
      try {
        pass1Result = runWithOwner(pass1Owner, () => runWithSSRContext(ctx, () => app()));
        if (ctx.loaders.size === 0) {
          bodyHtml = serializeNodeOutput(pass1Result);
        }
      } finally {
        pass1Owner.dispose();
      }

      if (ctx.loaders.size > 0) {
        // Restore pre-render head state so Pass 2 does not duplicate head entries collected in Pass 1
        ctx.head.title = initialHeadTitle;
        ctx.head.meta.length = initialMetaLen;
        ctx.head.links.length = initialLinksLen;
        ctx.head.scripts.length = initialScriptsLen;

        // 2. Wait for all registered server-side data loaders to resolve
        await resolveSSRContext(ctx);

        // 3. Render final HTML output inside a fresh Owner now that data is populated in context state
        const pass2Owner = createOwner(null);
        try {
          const finalPass = runWithOwner(pass2Owner, () => runWithSSRContext(ctx, () => app()));
          bodyHtml = serializeNodeOutput(finalPass);
        } finally {
          pass2Owner.dispose();
        }
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
      bodyHtml = `<div class="samrey-ssr-error" role="alert"><h1>Application Error</h1><pre>${escapeHtmlText(errorObj.message)}</pre></div>`;
    }
  }

  const title = options.title || ctx.head.title || 'Samrey Application';
  const { stylesTags, linksTags, headScriptsTags, clientScriptTag, metaTags, safeHeadTags, delegatorScript } = renderHeadElements(ctx, options);

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
  ${linksTags}
  ${stylesTags}
  ${safeHeadTags}
  ${headScriptsTags}
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
  let isClosed = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  let activeOwner: Owner | null = null;

  const disposeActiveOwner = () => {
    if (activeOwner) {
      const toDispose = activeOwner;
      activeOwner = null;
      toDispose.dispose();
    }
  };

  const cleanupAbortListener = () => {
    if (options.abortSignal && onAbort) {
      options.abortSignal.removeEventListener('abort', onAbort);
      onAbort = undefined;
    }
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          if (timeoutId !== undefined) clearTimeout(timeoutId);
          cleanupAbortListener();
          disposeActiveOwner();
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
          disposeActiveOwner();
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

      try {
      // 1. Run the app's synchronous shell render first with an active Owner and SSR context
      let shellResult: any = undefined;
      let bodyContent = '';
      let shellThrew = false;

      try {
        if (typeof app === 'function') {
          activeOwner = createOwner(null);
          shellResult = runWithOwner(activeOwner, () => runWithSSRContext(ctx, () => app()));
        } else {
          bodyContent = String(app);
        }
      } catch (err) {
        disposeActiveOwner();
        shellThrew = true;
        const errorObj = err instanceof Error ? err : new Error(String(err));
        ctx.setError(errorObj, 500);
        bodyContent = options.errorBoundary
          ? options.errorBoundary(errorObj)
          : `<div class="samrey-ssr-error" role="alert"><h2>Stream Error</h2><p>${escapeHtmlText(errorObj.message)}</p></div>`;
      }

      if (isClosed) {
        disposeActiveOwner();
        return;
      }

      // 2. Head elements (title, meta, links) are now collected from the synchronous shell render
      const title = options.title || ctx.head.title || 'Samrey Application';
      const { stylesTags, linksTags, headScriptsTags, clientScriptTag, metaTags, safeHeadTags, delegatorScript } = renderHeadElements(ctx, options);
      ctx.headFlushed = true;

      // Write head and opening shell
      send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlText(title)}</title>
  ${metaTags}
  ${linksTags}
  ${stylesTags}
  ${safeHeadTags}
  ${headScriptsTags}
  ${delegatorScript}
</head>
<body>
  <div id="app">`);

      // 3. If shell succeeded, await server data loaders if any, otherwise serialize shell result
      if (!shellThrew && typeof app === 'function') {
        try {
          if (ctx.loaders.size > 0) {
            disposeActiveOwner();
            await resolveSSRContext(ctx);
            if (isClosed) return;

            activeOwner = createOwner(null);
            const finalPass = runWithOwner(activeOwner, () => runWithSSRContext(ctx, () => app()));
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
        } finally {
          disposeActiveOwner();
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
      } catch (err) {
        if (!isClosed) {
          safeError(err);
        } else {
          disposeActiveOwner();
        }
      }
    },
    cancel() {
      isClosed = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      cleanupAbortListener();
      disposeActiveOwner();
    }
  });
}
