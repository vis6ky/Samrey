/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Navigation Header Component
 */

import { el } from '@samrey/runtime';
import { effect } from '@samrey/reactivity';
import { isAuthenticated, currentUser, logout } from '../auth.js';

export function Navbar(onNavigate: (route: string) => void): HTMLElement {
  const container = el('header', {
    class: 'w-full bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 backdrop-blur-md bg-opacity-95'
  });

  const inner = el('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between' });

  // Left Brand Area
  const brandArea = el('div', { class: 'flex items-center gap-3 cursor-pointer' });
  const brandLogo = el('div', { class: 'w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-cyan-500/20' }, 'S');
  const brandText = el('div', { class: 'flex flex-col' });
  const brandTitle = el('span', { class: 'font-bold text-base tracking-tight text-white flex items-center gap-1.5' }, 'Samrey Tasks');
  const brandBadge = el('span', { class: 'text-[10px] text-cyan-400 font-mono font-semibold' }, 'v1.0.0 NATIVE');

  brandText.appendChild(brandTitle);
  brandText.appendChild(brandBadge);
  brandArea.appendChild(brandLogo);
  brandArea.appendChild(brandText);
  brandArea.addEventListener('click', () => onNavigate('/'));

  // Center Navigation Links
  const navLinks = el('nav', { class: 'hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50' });

  const tasksBtn = el('button', { class: 'px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors' }, 'Tasks Board');
  tasksBtn.addEventListener('click', () => onNavigate('/'));

  const profileBtn = el('button', { class: 'px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors' }, 'Security & Profile');
  profileBtn.addEventListener('click', () => onNavigate('/profile'));

  navLinks.appendChild(tasksBtn);
  navLinks.appendChild(profileBtn);

  // Right Auth Actions Area
  const authSection = el('div', { class: 'flex items-center gap-3' });

  // Reactive Subscription to Auth State
  effect(() => {
    authSection.innerHTML = '';
    const authed = isAuthenticated();
    const user = currentUser();

    if (authed && user) {
      const userPill = el('div', { class: 'flex items-center gap-2.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl' });
      const avatar = el('div', { class: 'w-7 h-7 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center' }, user.name.slice(0, 2).toUpperCase());
      const userInfo = el('div', { class: 'flex flex-col text-left' });
      const userName = el('span', { class: 'text-xs font-semibold text-slate-200' }, user.name);
      const userRole = el('span', { class: 'text-[10px] text-slate-400 uppercase font-mono' }, user.role);

      userInfo.appendChild(userName);
      userInfo.appendChild(userRole);
      userPill.appendChild(avatar);
      userPill.appendChild(userInfo);

      const logoutBtn = el('button', {
        class: 'px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex items-center gap-1.5'
      }, 'Logout');

      logoutBtn.addEventListener('click', () => {
        logout();
        onNavigate('/login');
      });

      authSection.appendChild(userPill);
      authSection.appendChild(logoutBtn);
    } else {
      const loginBtn = el('button', {
        class: 'px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:text-white transition-colors'
      }, 'Login');
      loginBtn.addEventListener('click', () => onNavigate('/login'));

      const registerBtn = el('button', {
        class: 'px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-all shadow-md shadow-cyan-600/30'
      }, 'Register');
      registerBtn.addEventListener('click', () => onNavigate('/register'));

      authSection.appendChild(loginBtn);
      authSection.appendChild(registerBtn);
    }
  });

  inner.appendChild(brandArea);
  inner.appendChild(navLinks);
  inner.appendChild(authSection);
  container.appendChild(inner);

  return container;
}
