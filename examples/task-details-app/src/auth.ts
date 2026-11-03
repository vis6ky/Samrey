/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Authentication Service & State
 */

import { signal, computed } from '@samrey/reactivity';
import { sanitizeHtml, createCsrfToken, validateCsrfToken } from '@samrey/security';
import type { User, AuthSession } from './types.js';

// Pre-seeded mock users for testing and quick login
const INITIAL_USERS: Array<{ user: User; passwordHash: string }> = [
  {
    user: {
      id: 'usr-1',
      name: 'Alex Mercer',
      email: 'alex@samrey.dev',
      role: 'admin',
      createdAt: '2026-01-15T09:00:00Z'
    },
    passwordHash: 'Password123!'
  },
  {
    user: {
      id: 'usr-2',
      name: 'Elena Rostova',
      email: 'elena@samrey.dev',
      role: 'member',
      createdAt: '2026-02-01T14:30:00Z'
    },
    passwordHash: 'MemberPass2026!'
  }
];

// Reactive Authentication State Signals
export const currentSession = signal<AuthSession | null>(null);
export const authError = signal<string | null>(null);
export const authLoading = signal<boolean>(false);

// Reactive Computeds
export const isAuthenticated = computed<boolean>(() => currentSession() !== null);
export const currentUser = computed<User | null>(() => currentSession()?.user ?? null);
export const currentCsrfToken = computed<string>(() => currentSession()?.csrfToken ?? '');

// In-memory user store
const usersDatabase = [...INITIAL_USERS];

const STORAGE_KEY = 'samrey_task_auth_session';

/**
 * Restore session from local persistence if available
 */
export function restoreSession(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    // Seed default session if non-browser
    return false;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const session: AuthSession = JSON.parse(raw);
    if (session.expiresAt > Date.now()) {
      currentSession.set(session);
      return true;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore parsing errors
  }
  return false;
}

/**
 * Register a new user
 */
export async function register(data: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
}): Promise<{ success: boolean; error?: string; user?: User }> {
  authLoading.set(true);
  authError.set(null);

  try {
    const sanitizedName = sanitizeHtml(data.name.trim());
    const email = data.email.trim().toLowerCase();

    if (!sanitizedName || sanitizedName.length < 2) {
      const err = 'Name must be at least 2 characters.';
      authError.set(err);
      authLoading.set(false);
      return { success: false, error: err };
    }

    if (!email.includes('@') || !email.includes('.')) {
      const err = 'Invalid email address format.';
      authError.set(err);
      authLoading.set(false);
      return { success: false, error: err };
    }

    if (!data.password || data.password.length < 6) {
      const err = 'Password must be at least 6 characters.';
      authError.set(err);
      authLoading.set(false);
      return { success: false, error: err };
    }

    // Check email uniqueness
    const exists = usersDatabase.some(u => u.user.email === email);
    if (exists) {
      const err = 'An account with this email address already exists.';
      authError.set(err);
      authLoading.set(false);
      return { success: false, error: err };
    }

    const newUser: User = {
      id: `usr-${Date.now().toString(36)}`,
      name: sanitizedName,
      email,
      role: data.role || 'member',
      createdAt: new Date().toISOString()
    };

    usersDatabase.push({
      user: newUser,
      passwordHash: data.password
    });

    // Auto-login after registration
    const session: AuthSession = {
      user: newUser,
      token: `jwt-${Math.random().toString(36).slice(2)}.${Date.now()}`,
      csrfToken: createCsrfToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    currentSession.set(session);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    authLoading.set(false);
    return { success: true, user: newUser };
  } catch (err: any) {
    const message = err?.message || 'Registration failed unexpectedly.';
    authError.set(message);
    authLoading.set(false);
    return { success: false, error: message };
  }
}

/**
 * Log in an existing user
 */
export async function login(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
  authLoading.set(true);
  authError.set(null);

  try {
    const email = data.email.trim().toLowerCase();
    const record = usersDatabase.find(u => u.user.email === email);

    if (!record || record.passwordHash !== data.password) {
      const err = 'Invalid email or password.';
      authError.set(err);
      authLoading.set(false);
      return { success: false, error: err };
    }

    const session: AuthSession = {
      user: record.user,
      token: `jwt-${Math.random().toString(36).slice(2)}.${Date.now()}`,
      csrfToken: createCsrfToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    currentSession.set(session);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    authLoading.set(false);
    return { success: true, session };
  } catch (err: any) {
    const message = err?.message || 'Login failed.';
    authError.set(message);
    authLoading.set(false);
    return { success: false, error: message };
  }
}

/**
 * Log out current user
 */
export function logout(): void {
  currentSession.set(null);
  authError.set(null);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
