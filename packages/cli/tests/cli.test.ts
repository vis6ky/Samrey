import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aetherVitePlugin, auditSource } from '../src/index.js';

describe('@aether/cli', () => {
  it('integrates Vite plugin transform hook with compiler', () => {
    const plugin = aetherVitePlugin();
    assert.equal(plugin.name, 'vite-plugin-aether');

    const transformed = plugin.transform('<div>{title}</div>', 'App.tsx');
    assert.ok(transformed !== null);
    assert.ok(transformed.code.includes('/*#__PURE__*/ template('));
  });

  it('audits template for security and a11y non-conformances', () => {
    const badCode = '<img src="pic.jpg"><script>alert(1)</script>';
    const report = auditSource(badCode, 'Header.tsx');

    assert.equal(report.violationsCount, 2);
    assert.ok(report.messages.some((m) => m.includes('alt')));
    assert.ok(report.messages.some((m) => m.includes('script')));
  });
});
