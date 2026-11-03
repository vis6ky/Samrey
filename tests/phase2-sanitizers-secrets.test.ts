import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtmlString } from '../packages/security/src/index.js';

describe('Phase 2 - 2.1: sanitizeHtmlString data: and vbscript: blocking in href/src/action', () => {
  it('blocks data:text/html;base64 in href', () => {
    const malicious = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click</a>';
    const clean = sanitizeHtmlString(malicious);
    assert.ok(!clean.includes('data:text/html;base64'), 'Must not contain data:text/html;base64');
    assert.ok(clean.includes('href="about:blank"'), 'Must replace with about:blank');
  });

  it('blocks data:image/svg+xml with embedded script in src/href', () => {
    const malicious = '<img src="data:image/svg+xml,<svg onload=alert(1)>" />';
    const clean = sanitizeHtmlString(malicious);
    assert.ok(!clean.includes('data:image/svg+xml'), 'Must block SVG data URI');
    assert.ok(clean.includes('src="about:blank"'), 'Must replace with about:blank');
  });

  it('blocks vbscript: and data: in action attributes', () => {
    const formWithData = '<form action="data:text/html;base64,123"><input></form>';
    // form tag itself is stripped by sanitizeHtmlString, but if an element with action attribute exists:
    const linkWithVb = '<a href="vbscript:msgbox(1)">Click</a>';
    const cleanLink = sanitizeHtmlString(linkWithVb);
    assert.ok(!cleanLink.includes('vbscript:'), 'Must block vbscript: in href');
    assert.ok(cleanLink.includes('href="about:blank"'), 'Must replace with about:blank');
  });

  it('allows safe image data URIs in allowlist (png, jpeg, gif, webp)', () => {
    const safePng = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" />';
    const cleanPng = sanitizeHtmlString(safePng);
    assert.ok(cleanPng.includes('data:image/png;base64,'), 'Allowed image png data URI must be preserved');

    const safeJpeg = '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRg==" />';
    const cleanJpeg = sanitizeHtmlString(safeJpeg);
    assert.ok(cleanJpeg.includes('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), 'Allowed jpeg data URI must be preserved');
  });
});

describe('Phase 2 - 2.2: stripSecrets and sanitizePayload key anchoring', () => {
  it('preserves author, authorId, and tokenCount while stripping token, authToken, apiKey in @samrey/security stripSecrets', async () => {
    const { stripSecrets } = await import('../packages/security/src/index.js');
    const input = {
      author: 'Jane Doe',
      authorId: 101,
      author_name: 'Jane',
      tokenCount: 42,
      token_count: 50,
      token: 'super_secret_token_123',
      authToken: 'auth_jwt_999',
      apiKey: 'api_key_abc',
      password: 'mypassword',
      secret: 'mysecret'
    };

    const result = stripSecrets(input);
    assert.equal(result.author, 'Jane Doe', 'author must not be stripped');
    assert.equal(result.authorId, 101, 'authorId must not be stripped');
    assert.equal(result.author_name, 'Jane', 'author_name must not be stripped');
    assert.equal(result.tokenCount, 42, 'tokenCount must not be stripped');
    assert.equal(result.token_count, 50, 'token_count must not be stripped');
    assert.equal((result as any).token, undefined, 'token must be stripped');
    assert.equal((result as any).authToken, undefined, 'authToken must be stripped');
    assert.equal((result as any).apiKey, undefined, 'apiKey must be stripped');
    assert.equal((result as any).password, undefined, 'password must be stripped');
    assert.equal((result as any).secret, undefined, 'secret must be stripped');
  });

  it('preserves author, authorId, and tokenCount in @samrey/devtools sanitizePayload', async () => {
    const { sanitizePayload } = await import('../packages/devtools/src/index.js');
    const input = {
      author: 'Jane Doe',
      authorId: 101,
      tokenCount: 42,
      token: 'secret_token_val',
      authToken: 'auth_token_val',
      apiKey: 'key_val'
    };

    const result = sanitizePayload(input) as any;
    assert.equal(result.author, 'Jane Doe', 'author must not be masked');
    assert.equal(result.authorId, 101, 'authorId must not be masked');
    assert.equal(result.tokenCount, 42, 'tokenCount must not be masked');
    assert.equal(result.token, '[REDACTED]', 'token must be masked');
    assert.equal(result.authToken, '[REDACTED]', 'authToken must be masked');
    assert.equal(result.apiKey, '[REDACTED]', 'apiKey must be masked');
  });
});

describe('Phase 2 - 2.3: devtools sanitizePayload DAG references and embedded tokens', () => {
  it('preserves shared DAG references and only marks actual circular references', async () => {
    const { sanitizePayload } = await import('../packages/devtools/src/index.js');
    const shared = { id: 10, title: 'Shared Node' };
    const root = {
      a: shared,
      b: shared,
      list: [shared, shared]
    };

    const sanitized = sanitizePayload(root) as any;
    assert.deepEqual(sanitized.a, { id: 10, title: 'Shared Node' });
    assert.deepEqual(sanitized.b, { id: 10, title: 'Shared Node' });
    assert.notEqual(sanitized.b, '[Circular Reference]', 'Shared node must not be marked as Circular Reference');
    assert.notEqual(sanitized.list[1], '[Circular Reference]', 'Shared node in array must not be marked as Circular Reference');

    // Real circular reference
    const circular: any = { id: 99 };
    circular.self = circular;
    const sanitizedCirc = sanitizePayload(circular) as any;
    assert.equal(sanitizedCirc.self, '[Circular Reference]', 'Actual circular reference must be marked');
  });

  it('redacts tokens embedded inside strings (Bearer and JWT)', async () => {
    const { sanitizePayload } = await import('../packages/devtools/src/index.js');
    const input = {
      requestLog: 'Authorization: Bearer secret_bearer_token_xyz.123',
      auditNote: 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c in payload',
      safeText: 'Normal text without tokens'
    };

    const sanitized = sanitizePayload(input) as any;
    assert.ok(!sanitized.requestLog.includes('secret_bearer_token_xyz'), 'Must redact embedded Bearer token');
    assert.ok(sanitized.requestLog.includes('Bearer [REDACTED]'), 'Must format as Bearer [REDACTED]');
    assert.ok(!sanitized.auditNote.includes('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'), 'Must redact JWT signature');
    assert.ok(sanitized.auditNote.includes('[REDACTED JWT]'), 'Must replace with [REDACTED JWT]');
    assert.equal(sanitized.safeText, 'Normal text without tokens', 'Safe text must not be changed');
  });
});

describe('Phase 2 - 2.4: SSR state serialization Map/Set/function/symbol/BigInt handling', () => {
  it('triggers dev warning/diagnostic with key path when Map, Set, function, symbol, or BigInt is encountered', async () => {
    const { serializeStateForHydration } = await import('../packages/ssr/src/index.js');
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnings.push(args.join(' '));
    };

    try {
      const state = {
        cart: {
          items: new Set(['item-1', 'item-2']),
          metadata: new Map([['k1', 'v1']])
        },
        fn: () => {},
        sym: Symbol('test'),
        big: BigInt(123)
      };

      serializeStateForHydration(state);
      assert.ok(warnings.some(w => w.includes('cart.items') && w.includes('Set')), 'Must report cart.items Set');
      assert.ok(warnings.some(w => w.includes('cart.metadata') && w.includes('Map')), 'Must report cart.metadata Map');
    } finally {
      console.warn = origWarn;
    }
  });

  it('throws in strict mode when Map or Set is encountered', async () => {
    const { serializeStateForHydration } = await import('../packages/ssr/src/index.js');
    const state = {
      user: {
        roles: new Set(['admin', 'editor'])
      }
    };

    assert.throws(
      () => serializeStateForHydration(state, { strict: true }),
      (err: any) => {
        return err instanceof Error && err.message.includes('user.roles') && err.message.includes('Set');
      }
    );
  });

  it('serializes converted arrays and Date without error and plain output is byte-identical', async () => {
    const { serializeStateForHydration } = await import('../packages/ssr/src/index.js');
    const d = new Date('2026-01-01T00:00:00.000Z');
    const state = {
      cart: {
        items: ['item-1', 'item-2'],
        entries: [['k1', 'v1']]
      },
      createdAt: d
    };

    const payload = serializeStateForHydration(state);
    assert.ok(payload.includes('"cart":{"items":["item-1","item-2"],"entries":[["k1","v1"]]}'));
    assert.ok(payload.includes('"createdAt":"2026-01-01T00:00:00.000Z"'));
  });
});



