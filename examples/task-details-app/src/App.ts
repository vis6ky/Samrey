/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Root Application Shell
 */

import { el } from '@samrey/runtime';
import { signal, effect } from '@samrey/reactivity';
import { Navbar } from './components/Navbar.js';
import { NotificationToast } from './components/NotificationToast.js';
import { TasksListView } from './views/TasksListView.js';
import { TaskDetailView } from './views/TaskDetailView.js';
import { LoginView } from './views/LoginView.js';
import { RegisterView } from './views/RegisterView.js';
import { ProfileView } from './views/ProfileView.js';
import { restoreSession, isAuthenticated } from './auth.js';
import { selectTask } from './state.js';

export function App(): HTMLElement {
  // Restore persisted user session if present
  restoreSession();

  // Current navigation route signal
  const currentRoute = signal<string>('/');

  // Synchronize route with URL hash/params
  if (typeof window !== 'undefined') {
    const syncRouteFromUrl = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      const [path, query] = hash.split('?');
      currentRoute.set(path || '/');

      if (query) {
        const params = new URLSearchParams(query);
        const taskId = params.get('id');
        if (taskId) {
          selectTask(taskId);
        }
      }
    };

    syncRouteFromUrl();
    window.addEventListener('hashchange', syncRouteFromUrl);
  }

  const navigate = (route: string) => {
    currentRoute.set(route.split('?')[0]);
    if (typeof window !== 'undefined') {
      window.location.hash = route;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const appShell = el('div', {
    class: 'min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white relative flex flex-col'
  });

  // Top navigation
  const navbar = Navbar(navigate);

  // Main content area
  const mainContent = el('main', { class: 'flex-1 w-full pb-16' });

  // Reactive View Dispatcher & Auth Guards
  effect(() => {
    mainContent.innerHTML = '';
    const route = currentRoute();
    const authed = isAuthenticated();

    // Protected Route Handling: if user accesses /profile without auth, redirect to /login
    if (route === '/profile' && !authed) {
      mainContent.appendChild(LoginView(navigate));
      return;
    }

    if (route === '/login') {
      mainContent.appendChild(LoginView(navigate));
    } else if (route === '/register') {
      mainContent.appendChild(RegisterView(navigate));
    } else if (route === '/profile') {
      mainContent.appendChild(ProfileView(navigate));
    } else if (route === '/tasks' || route.startsWith('/tasks')) {
      mainContent.appendChild(TaskDetailView(navigate));
    } else {
      // Default: Tasks List Overview
      mainContent.appendChild(TasksListView(navigate));
    }
  });

  // Global Toasts overlay
  const toasts = NotificationToast();

  appShell.appendChild(navbar);
  appShell.appendChild(mainContent);
  appShell.appendChild(toasts);

  return appShell;
}
