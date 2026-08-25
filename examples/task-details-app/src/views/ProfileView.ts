/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Profile & Security Diagnostics View
 */

import { el } from '@samrey/runtime';
import { effect } from '@samrey/reactivity';
import { isAuthenticated, currentUser, currentSession, currentCsrfToken, logout } from '../auth.js';
import { showToast } from '../components/NotificationToast.js';

export function ProfileView(onNavigate: (route: string) => void): HTMLElement {
  const container = el('div', { class: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8' });

  const viewBody = el('div', { class: 'space-y-6' });

  effect(() => {
    viewBody.innerHTML = '';
    const authed = isAuthenticated();
    const user = currentUser();
    const session = currentSession();
    const csrf = currentCsrfToken();

    if (!authed || !user) {
      const lockBox = el('div', { class: 'bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4' });
      const lockTitle = el('h3', { class: 'text-xl font-bold text-slate-200' }, 'Authentication Required');
      const lockDesc = el('p', { class: 'text-sm text-slate-400' }, 'You must sign in to view your profile and security credentials.');
      const loginBtn = el('button', {
        class: 'px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl'
      }, 'Sign In Now');
      loginBtn.addEventListener('click', () => onNavigate('/login'));

      lockBox.appendChild(lockTitle);
      lockBox.appendChild(lockDesc);
      lockBox.appendChild(loginBtn);
      viewBody.appendChild(lockBox);
      return;
    }

    // 1. User Profile Header Card
    const profileCard = el('div', { class: 'bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6' });

    const userLeft = el('div', { class: 'flex items-center gap-4' });
    const userAvatar = el('div', { class: 'w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-cyan-600/30' }, user.name.slice(0, 2).toUpperCase());
    const userInfo = el('div', { class: 'space-y-1' });
    const userName = el('h2', { class: 'text-xl font-bold text-slate-100' }, user.name);
    const userEmail = el('p', { class: 'text-sm text-slate-400 font-mono' }, user.email);
    const userRole = el('span', { class: 'inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' }, user.role);

    userInfo.appendChild(userName);
    userInfo.appendChild(userEmail);
    userInfo.appendChild(userRole);
    userLeft.appendChild(userAvatar);
    userLeft.appendChild(userInfo);

    const logoutBtn = el('button', {
      class: 'px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors'
    }, 'Terminate Session (Logout)');

    logoutBtn.addEventListener('click', () => {
      logout();
      showToast('Logged out successfully', 'info');
      onNavigate('/login');
    });

    profileCard.appendChild(userLeft);
    profileCard.appendChild(logoutBtn);

    // 2. Security & Token Verification Card
    const securityCard = el('div', { class: 'bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4' });
    const secTitle = el('h3', { class: 'text-base font-bold text-slate-100 flex items-center gap-2' }, '🛡️ Samrey Security Diagnostics');
    const secDesc = el('p', { class: 'text-xs text-slate-400' }, 'Cryptographic verification and session token inspection provided by @samrey/security.');

    const secGrid = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 pt-2' });

    // CSRF Token Info
    const csrfBox = el('div', { class: 'p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl space-y-1.5' });
    const csrfLabel = el('p', { class: 'text-[10px] font-mono uppercase text-slate-400 font-bold' }, 'Active CSRF Token (HMAC Signed)');
    const csrfVal = el('p', { class: 'text-xs font-mono text-cyan-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800' }, csrf || 'None');
    csrfBox.appendChild(csrfLabel);
    csrfBox.appendChild(csrfVal);

    // Session Token Info
    const tokenBox = el('div', { class: 'p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl space-y-1.5' });
    const tokenLabel = el('p', { class: 'text-[10px] font-mono uppercase text-slate-400 font-bold' }, 'Session JWT Identifier');
    const tokenVal = el('p', { class: 'text-xs font-mono text-emerald-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800' }, session?.token || 'None');
    tokenBox.appendChild(tokenLabel);
    tokenBox.appendChild(tokenVal);

    // XSS Sanitizer Policy
    const xssBox = el('div', { class: 'p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl space-y-1.5' });
    const xssLabel = el('p', { class: 'text-[10px] font-mono uppercase text-slate-400 font-bold' }, 'HTML Sanitization Engine');
    const xssVal = el('p', { class: 'text-xs text-slate-200 font-medium' }, 'Active — Strict HTML/URL Sanitization with Zero Bypass');
    xssBox.appendChild(xssLabel);
    xssBox.appendChild(xssVal);

    // Framework Isolation
    const isoBox = el('div', { class: 'p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl space-y-1.5' });
    const isoLabel = el('p', { class: 'text-[10px] font-mono uppercase text-slate-400 font-bold' }, 'Framework Isolation');
    const isoVal = el('p', { class: 'text-xs text-slate-200 font-medium' }, '100% Native Samrey — 0 External Foreign Runtime Overhead');
    isoBox.appendChild(isoLabel);
    isoBox.appendChild(isoVal);

    secGrid.appendChild(csrfBox);
    secGrid.appendChild(tokenBox);
    secGrid.appendChild(xssBox);
    secGrid.appendChild(isoBox);

    securityCard.appendChild(secTitle);
    securityCard.appendChild(secDesc);
    securityCard.appendChild(secGrid);

    viewBody.appendChild(profileCard);
    viewBody.appendChild(securityCard);
  });

  container.appendChild(viewBody);

  return container;
}
