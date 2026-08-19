import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString, serializeStateForHydration, getDelegatedEventScript } from '../src/index.js';

describe('@aether/ssr', () => {
  it('renders safe static HTML document with hydration delegator', () => {
    const html = renderToString('<h1>Welcome to Aether</h1>', {
      title: 'Aether SSR'
    });

    assert.ok(html.includes('<h1>Welcome to Aether</h1>'));
    assert.ok(html.includes('<title>Aether SSR</title>'));
    assert.ok(html.includes('__AETHER_EVENTS__'));
  });

  it('escapes serialized state against script tag breakout attacks', () => {
    const maliciousState = {
      bio: '</script><script>alert("hacked")</script>'
    };

    const serialized = serializeStateForHydration(maliciousState);
    assert.ok(!serialized.includes('</script><script>'));
    assert.ok(serialized.includes('\\u003c/script\\u003e'));
  });

  it('generates compact inline event capture script', () => {
    const script = getDelegatedEventScript(['click', 'submit']);
    assert.ok(script.includes('"click"'));
    assert.ok(script.includes('"submit"'));
  });
});
