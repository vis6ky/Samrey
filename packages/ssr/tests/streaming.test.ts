import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStream, createSSRContext } from '../src/index.js';

describe('@gati/ssr - Streaming HTML Renderer', () => {
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
});
