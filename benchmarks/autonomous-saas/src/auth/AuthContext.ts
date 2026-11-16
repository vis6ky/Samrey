/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Authentication Context & Route Guard
 */

import { signal, computed } from '@samrey/reactivity';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

export const currentUser = signal<User | null>({
  id: 'usr_mock_1',
  name: 'Alex Rivera',
  email: 'alex@acme.corp',
  role: 'admin'
});

export const isAuthenticated = computed(() => currentUser.value !== null);

export async function login(email: string, password: string): Promise<boolean> {
  if (!email.includes('@') || password.length < 4) {
    return false;
  }
  currentUser.value = {
    id: `usr_${Date.now()}`,
    name: email.split('@')[0],
    email,
    role: 'admin'
  };
  return true;
}

export function logout(): void {
  currentUser.value = null;
}

export function canAccess(requiredRole?: string): boolean {
  if (!currentUser.value) return false;
  if (!requiredRole) return true;
  if (currentUser.value.role === 'admin') return true;
  return currentUser.value.role === requiredRole;
}
