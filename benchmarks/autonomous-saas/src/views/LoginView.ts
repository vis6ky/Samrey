/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Login View
 */

import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';
import { createForm, bindField } from '@samrey/forms';
import { login } from '../auth/AuthContext.js';
import { notify } from '../components/NotificationCenter.js';

const _loginTmpl = template(`
  <div class="login-wrapper">
    <div class="login-box">
      <h2>Sign in to Samrey SaaS</h2>
      <p class="subtitle">Enter your enterprise credentials</p>
      <form ref="loginForm" novalidate>
        <div class="form-group">
          <label for="loginEmail">Work Email</label>
          <input ref="emailInput" id="loginEmail" name="email" type="email" placeholder="you@company.com" />
          <span ref="emailError" class="error-msg" role="alert"></span>
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input ref="passwordInput" id="loginPassword" name="password" type="password" placeholder="••••••••" />
          <span ref="passwordError" class="error-msg" role="alert"></span>
        </div>
        <button ref="submitBtn" type="submit" class="btn-primary w-full">Sign In</button>
        <div ref="generalError" class="error-banner" style="display: none;"></div>
      </form>
    </div>
  </div>
`);

export function LoginView(props?: { onLoginSuccess?: () => void }): HTMLElement {
  const generalErrorMsg = signal<string>('');

  const form = createForm({
    initialValues: { email: '', password: '' },
    validators: {
      email: (val: string) => (!val || !val.includes('@') ? 'Valid work email required' : null),
      password: (val: string) => (!val || val.length < 4 ? 'Password must be at least 4 characters' : null)
    },
    onSubmit: async (values) => {
      generalErrorMsg.value = '';
      const success = await login(values.email, values.password);
      if (success) {
        notify('Welcome back!', 'success');
        if (props?.onLoginSuccess) {
          props.onLoginSuccess();
        }
      } else {
        generalErrorMsg.value = 'Invalid email or password.';
      }
    }
  });

  const root = _loginTmpl.clone();
  const { loginForm, emailInput, emailError, passwordInput, passwordError, submitBtn, generalError } = root.refs;

  bindField(emailInput, form.fields.email);
  bindField(passwordInput, form.fields.password);

  bindText(emailError, () => form.fields.email.error.value ?? '');
  bindText(passwordError, () => form.fields.password.error.value ?? '');
  bindText(generalError, () => generalErrorMsg.value);

  on(loginForm, 'submit', async (e: Event) => {
    e.preventDefault();
    await form.submit();
  });

  return root;
}
