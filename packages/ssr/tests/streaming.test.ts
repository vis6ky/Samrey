import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStream, renderToString, getSSRContext, createServerData } from '../src/index.js';
import { onCleanup } from '@samrey/reactivity';

describe('@samrey/ssr - Streaming HTML Renderer', () => {
  it('streams complete HTML document chunks via ReadableStream', async () => {
    const stream = renderToStream(
      () => '<section class="hero"><h1>Streaming Fast</h1><p>Real-time edge rendering</p></section>',
      {
        title: 'Streaming App',
        state: { streamId: 'chunk_01' }
      }
    );

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let accumulatedHtml = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulatedHtml += decoder.decode(value, { stream: true });
    }

    assert.ok(accumulatedHtml.includes('<!DOCTYPE html>'));
    assert.ok(accumulatedHtml.includes('<title>Streaming App</title>'));
    assert.ok(accumulatedHtml.includes('<h1>Streaming Fast</h1>'));
    assert.ok(accumulatedHtml.includes('chunk_01'));
    assert.ok(accumulatedHtml.includes('</html>'));
  });

  it('handles stream error boundaries and flushes error chunk', async () => {
    const stream = renderToStream(
      () => {
        throw new Error('Fatal stream worker fault');
      },
      {
        errorBoundary: (err) => `<div class="stream-error">Stream Fallback: ${err.message}</div>`
      }
    );

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let output = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value, { stream: true });
    }

    assert.ok(output.includes('Stream Fallback: Fatal stream worker fault'));
    assert.ok(output.includes('</html>'));
  });

  it('sanitizes headTags against script injection, inline handlers, and meta refresh in SSR and streaming (Bug 8c)', async () => {
    const maliciousHeadTags = [
      '<meta name="theme-color" content="#0f172a">',
      '<link rel="icon" href="/favicon.ico" onload="alert(1)">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
      '<link rel="import" href="/evil.html">',
      '<script>alert("xss")</script>',
      '</head><body><img src=x onerror=alert(2)>'
    ].join('');

    const html = await renderToString(() => '<p>Hello</p>', {
      headTags: maliciousHeadTags
    });

    assert.ok(html.includes('<meta name="theme-color" content="#0f172a">'));
    assert.ok(html.includes('<link rel="icon" href="/favicon.ico">'));
    assert.ok(!html.includes('onload'));
    assert.ok(!html.includes('http-equiv="refresh"'));
    assert.ok(!html.includes('rel="import"'));
    assert.ok(!html.includes('alert("xss")'));
    assert.ok(!html.includes('onerror=alert(2)'));

    const stream = renderToStream(() => '<p>Stream</p>', { headTags: maliciousHeadTags });
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let streamed = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamed += decoder.decode(value, { stream: true });
    }
    assert.ok(!streamed.includes('alert("xss")'));
    assert.ok(!streamed.includes('http-equiv="refresh"'));
    assert.ok(streamed.includes('<meta name="theme-color" content="#0f172a">'));
  });

  it('disposes stream SSR owners on completion and on reader cancellation', async () => {
    let completedDisposals = 0;
    const stream = renderToStream(() => {
      onCleanup(() => completedDisposals++);
      return '<p>Done</p>';
    });
    const reader = stream.getReader();
    while (!(await reader.read()).done) {
      // consume stream
    }
    assert.equal(completedDisposals, 1);

    let cancelledDisposals = 0;
    const cancelStream = renderToStream(() => {
      onCleanup(() => cancelledDisposals++);
      return '<p>Will cancel</p>';
    });
    await cancelStream.getReader().cancel('aborted');
    assert.equal(cancelledDisposals, 1);
  });

  it('renders ctx.head links/scripts, blocks protocol-relative URLs, and handles rejected createServerData without unhandledRejection', async () => {
    const html = await renderToString(() => {
      const ctx = getSSRContext()!;
      ctx.head.links.push(
        { rel: 'canonical', href: 'https://samrey.dev/docs' },
        { rel: 'stylesheet', href: '//evil.com/evil.css' }
      );
      ctx.head.scripts.push(
        { src: '/hydrate.js', defer: true },
        { src: '//evil.com/evil.js' },
        { inline: 'console.log("safe-inline")' }
      );
      return '<main>OK</main>';
    }, {
      title: 'Sec Head Test',
      clientScript: '//evil.com/pwn.js',
      clientStyles: ['//evil.com/pwn.css', '/assets/app.css']
    });
    assert.ok(!html.includes('//evil.com/pwn.js'), 'Protocol-relative clientScript must be blocked');
    assert.ok(!html.includes('//evil.com/pwn.css'), 'Protocol-relative clientStyles must be blocked');
    assert.ok(html.includes('/assets/app.css'));
    assert.ok(html.includes('rel="canonical"'));
    assert.ok(html.includes('https://samrey.dev/docs'));
    assert.ok(html.includes('src="/hydrate.js"'));
    assert.ok(!html.includes('//evil.com/evil.css'));
    assert.ok(!html.includes('//evil.com/evil.js'));

    // Also verify ctx.head.links and ctx.head.scripts rendering in renderToStream
    const headStream = renderToStream(() => {
      const ctx = getSSRContext()!;
      ctx.head.links.push(
        { rel: 'canonical', href: 'https://samrey.dev/docs' },
        { rel: 'stylesheet', href: '//evil.com/evil.css' }
      );
      ctx.head.scripts.push(
        { src: '/hydrate.js', defer: true },
        { src: '//evil.com/evil.js' }
      );
      return '<p>Head</p>';
    });
    let headOutput = '';
    const r = headStream.getReader();
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      headOutput += new TextDecoder().decode(value);
    }
    assert.ok(headOutput.includes('rel="canonical"'));
    assert.ok(headOutput.includes('https://samrey.dev/docs'));
    assert.ok(headOutput.includes('src="/hydrate.js"'));
    assert.ok(!headOutput.includes('//evil.com/evil.css'));
    assert.ok(!headOutput.includes('//evil.com/evil.js'));

    // Verify createServerData rejection inside renderToStream & cancelled stream emits zero unhandledRejection
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);
    try {
      const errStream = renderToStream(() => {
        createServerData('failing-key', async () => {
          throw new Error('backend boom');
        });
        return '<section>Body</section>';
      });
      let errOut = '';
      const errReader = errStream.getReader();
      while (true) {
        const { value, done } = await errReader.read();
        if (done) break;
        errOut += new TextDecoder().decode(value);
      }
      assert.ok(errOut.includes('<section>Body</section>'));

      const abortStream = renderToStream(() => {
        createServerData('late-abort-key', async () => {
          await new Promise((res) => setTimeout(res, 10));
          throw new Error('late boom');
        });
        return '<section>Abort</section>';
      });
      await abortStream.getReader().cancel('stop early');
      await new Promise((res) => setTimeout(res, 30));
      assert.equal(unhandled.length, 0, `Unexpected unhandledRejection(s): ${unhandled.length}`);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
