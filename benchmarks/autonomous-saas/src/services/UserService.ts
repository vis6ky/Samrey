/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — User Management Service
 */

import { signal } from '@samrey/reactivity';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'suspended';
  createdAt: string;
}

const INITIAL_USERS: ManagedUser[] = [
  { id: 'usr_1', name: 'Alice Smith', email: 'alice@acme.corp', role: 'admin', status: 'active', createdAt: '2026-01-15' },
  { id: 'usr_2', name: 'Bob Jones', email: 'bob@acme.corp', role: 'member', status: 'active', createdAt: '2026-02-01' },
  { id: 'usr_3', name: 'Charlie Kim', email: 'charlie@acme.corp', role: 'viewer', status: 'suspended', createdAt: '2026-02-20' },
  { id: 'usr_4', name: 'Diana Prince', email: 'diana@acme.corp', role: 'member', status: 'active', createdAt: '2026-03-05' }
];

export const usersSignal = signal<ManagedUser[]>([...INITIAL_USERS]);
export const isUserLoading = signal<boolean>(false);

export class UserService {
  static async fetchUsers(): Promise<ManagedUser[]> {
    isUserLoading.value = true;
    await new Promise(r => setTimeout(r, 20));
    isUserLoading.value = false;
    return usersSignal.value;
  }

  static async createUser(data: Omit<ManagedUser, 'id' | 'createdAt'>): Promise<ManagedUser> {
    const newUser: ManagedUser = {
      ...data,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    usersSignal.update(list => [...list, newUser]);
    return newUser;
  }

  static async deleteUser(id: string): Promise<boolean> {
    usersSignal.update(list => list.filter(u => u.id !== id));
    return true;
  }
}
