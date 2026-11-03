/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Registration View
 */

import { el } from '@samrey/runtime';
import { signal, effect } from '@samrey/reactivity';
import { register, authLoading, authError } from '../auth.js';
import { validateRegisterForm } from '../forms.js';
import { showToast } from '../components/NotificationToast.js';

export function RegisterView(onNavigate: (route: string) => void): HTMLElement {
  const container = el('div', {
    class: 'min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12'
  });

  const card = el('div', {
    class: 'max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6'
  });

  // Header
  const header = el('div', { class: 'text-center space-y-2' });
  const icon = el('div', { class: 'mx-auto w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 font-black text-xl mb-3' }, 'S');
  const title = el('h2', { class: 'text-2xl font-bold text-slate-100 tracking-tight' }, 'Create Samrey Account');
  const subtitle = el('p', { class: 'text-sm text-slate-400' }, 'Join the native zero-overhead task management workspace');

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(subtitle);

  // Form
  const form = el('form', { class: 'space-y-4' });

  // Full Name Field
  const nameGroup = el('div', { class: 'space-y-1.5' });
  const nameLabel = el('label', { class: 'block text-xs font-semibold text-slate-300 uppercase tracking-wider' }, 'Full Name');
  const nameInput = el('input', {
    type: 'text',
    placeholder: 'Sarah Connor',
    class: 'w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all'
  }) as HTMLInputElement;
  const nameError = el('p', { class: 'text-xs text-rose-400 hidden' });
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  nameGroup.appendChild(nameError);

  // Email Field
  const emailGroup = el('div', { class: 'space-y-1.5' });
  const emailLabel = el('label', { class: 'block text-xs font-semibold text-slate-300 uppercase tracking-wider' }, 'Email Address');
  const emailInput = el('input', {
    type: 'email',
    placeholder: 'sarah@samrey.dev',
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
    class: 'w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all'
  }) as HTMLInputElement;
  const passError = el('p', { class: 'text-xs text-rose-400 hidden' });
  passGroup.appendChild(passLabel);
  passGroup.appendChild(passInput);
  passGroup.appendChild(passError);

  // Confirm Password Field
  const confGroup = el('div', { class: 'space-y-1.5' });
  const confLabel = el('label', { class: 'block text-xs font-semibold text-slate-300 uppercase tracking-wider' }, 'Confirm Password');
  const confInput = el('input', {
    type: 'password',
    placeholder: '••••••••',
    class: 'w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all'
  }) as HTMLInputElement;
  const confError = el('p', { class: 'text-xs text-rose-400 hidden' });
  confGroup.appendChild(confLabel);
  confGroup.appendChild(confInput);
  confGroup.appendChild(confError);

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
  }, 'Create Account');

  effect(() => {
    const loading = authLoading();
    submitBtn.textContent = loading ? 'Creating Account...' : 'Create Account';
    (submitBtn as HTMLButtonElement).disabled = loading;
  });

  form.appendChild(nameGroup);
  form.appendChild(emailGroup);
  form.appendChild(passGroup);
  form.appendChild(confGroup);
  form.appendChild(serverErrorEl);
  form.appendChild(submitBtn);

  // Handle submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const validation = validateRegisterForm({
      name: nameInput.value,
      email: emailInput.value,
      password: passInput.value,
      confirmPassword: confInput.value
    });

    if (!validation.isValid) {
      if (validation.errors.name) {
        nameError.textContent = validation.errors.name;
        nameError.classList.remove('hidden');
      } else {
        nameError.classList.add('hidden');
      }

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

      if (validation.errors.confirmPassword) {
        confError.textContent = validation.errors.confirmPassword;
        confError.classList.remove('hidden');
      } else {
        confError.classList.add('hidden');
      }
      return;
    }

    nameError.classList.add('hidden');
    emailError.classList.add('hidden');
    passError.classList.add('hidden');
    confError.classList.add('hidden');

    const res = await register({
      name: nameInput.value,
      email: emailInput.value,
      password: passInput.value
    });

    if (res.success) {
      showToast(`Account created! Welcome, ${res.user?.name}!`, 'success');
      onNavigate('/');
    } else {
      showToast(res.error || 'Registration failed', 'error');
    }
  });

  // Footer link
  const footer = el('div', { class: 'text-center pt-2 text-xs text-slate-400' });
  footer.appendChild(document.createTextNode('Already have an account? '));
  const loginLink = el('button', { class: 'text-cyan-400 hover:text-cyan-300 font-semibold underline' }, 'Sign In');
  loginLink.addEventListener('click', () => onNavigate('/login'));
  footer.appendChild(loginLink);

  card.appendChild(header);
  card.appendChild(form);
  card.appendChild(footer);
  container.appendChild(card);

  return container;
}
