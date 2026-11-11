import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeStateForHydration,
  deserializeHydrationState,
  safeJsonParse,
  stripSecrets,
  isSensitiveKey
} from '../src/index.js';

describe('@samrey/ssr - State Security, Secret Guard & Validation', () => {
  it('escapes dangerous script tags, HTML tokens, and line separators', () => {
    const maliciousPayload = {
      comment: '</script><script>alert(document.cookie)</script>',
      htmlComment: '<!--#exec cmd="ls"-->',
      unicodeLine: 'Line1\u2028Line2\u2029Line3'
    };

    const scriptTag = serializeStateForHydration(maliciousPayload);

    assert.ok(!scriptTag.includes('</script><script>'));
    assert.ok(scriptTag.includes('\\u003c/script\\u003e'));
    assert.ok(scriptTag.includes('\\u003c!--#exec'));
    assert.ok(scriptTag.includes('\\u2028'));
    assert.ok(scriptTag.includes('\\u2029'));
  });

  it('identifies sensitive keys accurately', () => {
    assert.equal(isSensitiveKey('password'), true);
    assert.equal(isSensitiveKey('api_key'), true);
    assert.equal(isSensitiveKey('apiKey'), true);
    assert.equal(isSensitiveKey('DATABASE_URL'), true);
    assert.equal(isSensitiveKey('jwt_token'), true);
    assert.equal(isSensitiveKey('sessionSecret'), true);
    assert.equal(isSensitiveKey('clientSecret'), true);
    assert.equal(isSensitiveKey('env.PORT'), true);
    assert.equal(isSensitiveKey('username'), false);
    assert.equal(isSensitiveKey('displayName'), false);
  });

  it('automatically strips secret credentials from state payload in default mode', () => {
    const serverState = {
      publicUser: {
        id: 'usr_1',
        name: 'Sarah Connor',
        email: 'sarah@example.com'
      },
      userProfile: {
        theme: 'dark',
        passwordHash: '$2b$12$e8Y...',
        apiKey: 'sk_live_983749823479283749',
        jwtToken: 'eyJhbGciOiJIUzI1Ni...',
        bearer: 'bearer-token-12345',
        database_url: 'postgres://user:pass@localhost:5432/db'
      }
    };

    const stripped = stripSecrets(serverState);

    assert.equal(stripped.publicUser.name, 'Sarah Connor');
    assert.equal(stripped.userProfile.theme, 'dark');
    assert.equal(stripped.userProfile.passwordHash, undefined);
    assert.equal(stripped.userProfile.apiKey, undefined);
    assert.equal(stripped.userProfile.jwtToken, undefined);
    assert.equal(stripped.userProfile.bearer, undefined);
    assert.equal(stripped.userProfile.database_url, undefined);
  });

  it('throws security violation in strict mode when secret is present', () => {
    const leakAttempt = {
      user: 'admin',
      secretKey: 'super_secret_master_key'
    };

    assert.throws(
      () => {
        serializeStateForHydration(leakAttempt, { strict: true });
      },
      /Security Violation.*Attempted to serialize secret field/
    );
  });

  it('scrubs prototype pollution vectors in safeJsonParse', () => {
    const maliciousJson = '{"__proto__": {"polluted": true}, "constructor": {"evil": 1}, "validKey": "safe"}';
    const parsed = safeJsonParse<{ validKey: string }>(maliciousJson);

    assert.equal(parsed.validKey, 'safe');
    assert.equal(('polluted' in {}), false);
    assert.equal((Object.prototype as unknown as { polluted?: boolean }).polluted, undefined);
  });

  it('handles malformed and corrupted hydration state gracefully with fallback', () => {
    // In headless test where document is undefined, returns fallback
    const result = deserializeHydrationState({ fallback: { count: 0 } });
    assert.deepEqual(result, { count: 0 });
  });

  it('EXT-001: validates and escapes custom hydration script IDs against attribute breakout', () => {
    // 1. Malicious script ID with attribute breakout and script injection
    const breakoutId = '__SAMREY_STATE__" onclick="alert(1)"';
    const output1 = serializeStateForHydration({ foo: 'bar' }, { id: breakoutId });
    assert.ok(!output1.includes('onclick="alert(1)"'));
    assert.ok(output1.startsWith('<script id="__SAMREY_STATE__"'));

    // 2. Malicious script ID attempting script tag termination
    const tagBreakoutId = '__SAMREY_STATE__"></script><script>alert(2)</script>';
    const output2 = serializeStateForHydration({ foo: 'bar' }, { id: tagBreakoutId });
    assert.ok(!output2.includes('<script>alert(2)</script>'));
    assert.ok(output2.startsWith('<script id="__SAMREY_STATE__"'));

    // 3. Legitimate alphanumeric custom script ID is accepted and escaped
    const validCustomId = 'my-custom-state_123';
    const output3 = serializeStateForHydration({ count: 42 }, { id: validCustomId });
    assert.ok(output3.startsWith('<script id="my-custom-state_123"'));
  });

  it('hardens deserializeHydrationState against DOM clobbering and non-JSON script tags', () => {
    const hadDocument = 'document' in globalThis;
    const origDocument = (globalThis as any).document;

    try {
      // 1. querySelector enforces exact script[type="application/json"] selector even when clobbered forms exist
      let queriedSelector = '';
      const validScript = {
        nodeName: 'SCRIPT',
        getAttribute: (attr: string) => (attr === 'type' ? 'application/json' : null),
        textContent: '{"user":"alice"}'
      };
      (globalThis as any).document = {
        querySelector: (sel: string) => {
          queriedSelector = sel;
          return validScript;
        },
        getElementById: () => ({
          nodeName: 'FORM',
          textContent: '{"clobbered":true}'
        })
      };

      const okState = deserializeHydrationState({ fallback: { user: 'fallback' } });
      assert.ok(queriedSelector.includes('script[type="application/json"]'));
      assert.deepEqual(okState, { user: 'alice' });

      // 2. Rejects script element without type="application/json" even if nodeName is SCRIPT
      const executableScript = {
        nodeName: 'SCRIPT',
        getAttribute: (attr: string) => (attr === 'type' ? 'text/javascript' : null),
        textContent: '{"pwned":true}'
      };
      (globalThis as any).document = {
        getElementById: () => executableScript
      };

      const rejectedWrongType = deserializeHydrationState({ fallback: { safe: true } });
      assert.deepEqual(rejectedWrongType, { safe: true });

      // 3. Rejects script element missing type attribute (getAttribute('type') === null)
      const missingTypeScript = {
        nodeName: 'SCRIPT',
        getAttribute: () => null,
        textContent: '{"pwned":true}'
      };
      (globalThis as any).document = {
        getElementById: () => missingTypeScript
      };

      const rejectedNullType = deserializeHydrationState({ fallback: { safe: true } });
      assert.deepEqual(rejectedNullType, { safe: true });
    } finally {
      if (hadDocument) {
        (globalThis as any).document = origDocument;
      } else {
        delete (globalThis as any).document;
      }
    }
  });
});
