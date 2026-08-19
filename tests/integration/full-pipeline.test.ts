import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compileTemplate } from '../../packages/compiler/src/index.js';
import { signal, computed, effect, createRoot } from '../../packages/reactivity/src/index.js';
import { sanitizeUri, escapeForScriptPayload } from '../../packages/security/src/index.js';
import { bindText, bindAttr, template } from '../../packages/runtime/src/index.js';
import { createRouter } from '../../packages/router/src/index.js';
import { createForm } from '../../packages/forms/src/index.js';
import { renderToString } from '../../packages/ssr/src/index.js';

describe('Aether Full Pipeline End-to-End Integration', () => {
  it('executes end-to-end flow: Compiler -> Reactivity -> Runtime -> Security', () => {
    // 1. Compile template
    const rawTemplate = '<div class="user-card"><h3>{name}</h3><a href="{profileUrl}">Profile</a></div>';
    const compiled = compileTemplate(rawTemplate);
    assert.equal(compiled.templates.length, 1);
    assert.ok(compiled.generatedCode.includes('template('));

    // 2. Reactivity & Security integration
    const userName = signal('Alice');
    const userUrl = signal('javascript:alert("exploit")');

    const sanitizedUrl = computed(() => sanitizeUri(userUrl.value));

    // 3. Security verification
    assert.equal(sanitizedUrl.value, 'about:blank'); // Blocked!

    // 4. Update url safely
    userUrl.value = 'https://aether.dev/users/alice';
    assert.equal(sanitizedUrl.value, 'https://aether.dev/users/alice');
  });

  it('verifies Router, Forms, and SSR work seamlessly together', async () => {
    // Router
    const router = createRouter([
      { path: '/', component: () => 'Home' },
      { path: '/register', component: () => 'Register' }
    ]);
    router.navigate('/register');
    assert.equal(router.currentPath.value, '/register');

    // Forms
    let formSubmitted = false;
    const form = createForm({
      initialValues: { email: '' },
      validators: { email: (v) => (v.includes('@') ? null : 'Required valid email') },
      onSubmit: () => {
        formSubmitted = true;
      }
    });

    form.fields.email.setValue('lead@aether.dev');
    await form.submit();
    assert.equal(formSubmitted, true);

    // SSR
    const ssrHtml = renderToString('<div id="app"></div>', {
      state: { path: router.currentPath.value, email: form.fields.email.value.value }
    });
    assert.ok(ssrHtml.includes('lead@aether.dev'));
    assert.ok(ssrHtml.includes('__AETHER_STATE__'));
  });
});
