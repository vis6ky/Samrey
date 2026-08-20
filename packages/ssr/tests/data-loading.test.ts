import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServerData, createSSRContext, runWithSSRContext, resolveSSRContext, renderToString } from '../src/index.js';

describe('@aether/ssr - Server-Side Data Loading & Cache', () => {
  it('registers and resolves server loaders within SSR context', async () => {
    const ctx = createSSRContext();

    await runWithSSRContext(ctx, async () => {
      const [user] = createServerData('current_user', async () => {
        // Simulated server DB lookup
        return { id: 101, name: 'Alice Walker', role: 'admin' };
      });

      assert.equal(user(), undefined); // Initially undefined until loader resolves
    });

    await resolveSSRContext(ctx);

    assert.deepEqual(ctx.state['current_user'], {
      id: 101,
      name: 'Alice Walker',
      role: 'admin'
    });
  });

  it('renders SSR HTML with pre-fetched server data embedded in state script', async () => {
    const app = () => {
      const [data] = createServerData('product', async () => {
        return { id: 'prod_99', title: 'Mechanical Keyboard', price: 149 };
      });

      const prod = data();
      return `<div id="product-view"><h1>${prod ? prod.title : 'Loading...'}</h1><p>$${prod ? prod.price : 0}</p></div>`;
    };

    const html = await renderToString(app);

    assert.ok(html.includes('Mechanical Keyboard'));
    assert.ok(html.includes('$149'));
    assert.ok(html.includes('prod_99'));
    assert.ok(html.includes('"current_user"') === false); // Only product present
  });

  it('handles loader failures gracefully in SSR context', async () => {
    const ctx = createSSRContext();

    runWithSSRContext(ctx, () => {
      createServerData('failing_key', async () => {
        throw new Error('API Gateway 502 Bad Gateway');
      });
    });

    await resolveSSRContext(ctx);
    assert.equal(ctx.errors.length, 1);
    assert.ok(ctx.errors[0].message.includes('502 Bad Gateway'));
  });
});
