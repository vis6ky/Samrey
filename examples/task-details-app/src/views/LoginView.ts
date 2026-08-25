/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Login View
 */

import { el } from '@samrey/runtime';
import { signal, effect } from '@samrey/reactivity';
import { login, authLoading, authError } from '../auth.js';
import { validateLoginForm } from '../forms.js';
import { showToast } from '../components/NotificationToast.js';

export function LoginView(onNavigate: (route: string) => void): HTMLElement {
  const container = el('div', {
    class: 'min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12'
  });

  const card = el('div', {
    class: 'max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 relative overflow-hidden'
  });

  // Top header
  const header = el('div', { class: 'text-center space-y-2' });
  const icon = el('div', { class: 'mx-auto w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 font-black text-xl mb-3' }, 'S');
  const title = el('h2', { class: 'text-2xl font-bold text-slate-100 tracking-tight' }, 'Sign In to Samrey');
  const subtitle = el('p', { class: 'text-sm text-slate-400' }, 'Manage your enterprise tasks with pure native reactivity');

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(subtitle);

  // Form
  const form = el('form', { class: 'space-y-4' });

  // Email Field
  const emailGroup = el('div', { class: 'space-y-1.5' });
  const emailLabel = el('label', { class: 'block text-xs font-semibold text-slate-300 uppercase tracking-wider' }, 'Email Address');
  const emailInput = el('input', {
    type: 'email',
    placeholder: 'alex@samrey.dev',
    value: 'alex@samrey.dev',
    class: 'w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all'
  }) as HTMLInputElement;
  const emailError = el('p', { class: 'text-xs text-rose-400 hidden' });
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  emailGroup.appendChild(emailError);

  // Password Field
  const passGroup = el('div', { class: 'space-y-1.5' });
  const passLabel = el('label', { class: 'block text-xs font-semibold text-slate-300 uppercase tracking-wider' }, 'Password');
  const passInput = el('input', {
    type: 'password',
    placeholder: '••••••••',
    value: 'Password123!',
    class: 'w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all'
  }) as HTMLInputElement;
  const passError = el('p', { class: 'text-xs text-rose-400 hidden' });
  passGroup.appendChild(passLabel);
  passGroup.appendChild(passInput);
  passGroup.appendChild(passError);

  // Server error banner
  const serverErrorEl = el('div', {
    class: 'p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium hidden'
  });

  effect(() => {
    const err = authError();
    if (err) {
      serverErrorEl.textContent = err;
      serverErrorEl.classList.remove('hidden');
    } else {
      serverErrorEl.classList.add('hidden');
    }
  });

  // Submit button
  const submitBtn = el('button', {
    type: 'submit',
    class: 'w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-cyan-600/30 disabled:opacity-50'
  }, 'Sign In');

  effect(() => {
    const loading = authLoading();
    submitBtn.textContent = loading ? 'Authenticating...' : 'Sign In';
    (submitBtn as HTMLButtonElement).disabled = loading;
  });

  form.appendChild(emailGroup);
  form.appendChild(passGroup);
  form.appendChild(serverErrorEl);
  form.appendChild(submitBtn);

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const validation = validateLoginForm({
      email: emailInput.value,
      password: passInput.value
    });

    if (!validation.isValid) {
      if (validation.errors.email) {
        emailError.textContent = validation.errors.email;
        emailError.classList.remove('hidden');
      } else {
        emailError.classList.add('hidden');
      }

      if (validation.errors.password) {
        passError.textContent = validation.errors.password;
        passError.classList.remove('hidden');
      } else {
        passError.classList.add('hidden');
      }
      return;
    }

    emailError.classList.add('hidden');
    passError.classList.add('hidden');

    const res = await login({
      email: emailInput.value,
      password: passInput.value
    });

    if (res.success) {
      showToast(`Welcome back, ${res.session?.user.name}!`, 'success');
      onNavigate('/');
    } else {
      showToast(res.error || 'Authentication failed', 'error');
    }
  });

  // Demo Credentials quick fill buttons
  const demoSection = el('div', { class: 'pt-2 border-t border-slate-800 space-y-2' });
  const demoLabel = el('p', { class: 'text-[11px] text-slate-500 font-semibold uppercase tracking-wider text-center' }, 'Quick Demo Sign-In');
  const demoRow = el('div', { class: 'grid grid-cols-2 gap-2' });

  const adminDemoBtn = el('button', {
    type: 'button',
    class: 'px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors'
  }, 'Admin (Alex)');
  adminDemoBtn.addEventListener('click', () => {
    emailInput.value = 'alex@samrey.dev';
    passInput.value = 'Password123!';
  });

  const memberDemoBtn = el('button', {
    type: 'button',
    class: 'px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors'
  }, 'Member (Elena)');
  memberDemoBtn.addEventListener('click', () => {
    emailInput.value = 'elena@samrey.dev';
    passInput.value = 'MemberPass2026!';
  });

  demoRow.appendChild(adminDemoBtn);
  demoRow.appendChild(memberDemoBtn);
  demoSection.appendChild(demoLabel);
  demoSection.appendChild(demoRow);

  // Bottom switch to registration
  const footer = el('div', { class: 'text-center pt-2 text-xs text-slate-400' });
  footer.appendChild(document.createTextNode("Don't have an account yet? "));
  const regLink = el('button', { class: 'text-cyan-400 hover:text-cyan-300 font-semibold underline' }, 'Register here');
  regLink.addEventListener('click', () => onNavigate('/register'));
  footer.appendChild(regLink);

  card.appendChild(header);
  card.appendChild(form);
  card.appendChild(demoSection);
  card.appendChild(footer);
  container.appendChild(card);

  return container;
}
