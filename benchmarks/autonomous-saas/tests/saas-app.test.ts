/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Independent Verification Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';

import { currentUser, isAuthenticated, login, logout } from '../src/auth/AuthContext.js';
import { notifications, notify, dismissNotification } from '../src/components/NotificationCenter.js';
import { usersSignal, UserService } from '../src/services/UserService.js';
import { DashboardView } from '../src/views/DashboardView.js';
import { UserManagementView } from '../src/views/UserManagementView.js';
import { AnalyticsView } from '../src/views/AnalyticsView.js';
import { App } from '../src/App.js';

describe('Samrey Autonomous SaaS Application Benchmark', () => {
  it('verifies authentication state & route protection toggle', async () => {
    // 1. Initial authenticated state
    assert.equal(isAuthenticated.value, true);
    assert.equal(currentUser.value?.name, 'Alex Rivera');

    // 2. Logout
    logout();
    assert.equal(isAuthenticated.value, false);
    assert.equal(currentUser.value, null);

    // 3. Login
    const loggedIn = await login('architect@samrey.dev', 'securePass123');
    assert.equal(loggedIn, true);
    assert.equal(isAuthenticated.value, true);
    assert.equal(currentUser.value?.email, 'architect@samrey.dev');
  });

  it('renders DashboardView with fine-grained reactive metrics', async () => {
    const { container } = renderTest(() => DashboardView());
    const initialUsersCount = usersSignal.value.length;

    assert.ok(container.textContent?.includes('Total Users'));
    assert.ok(container.textContent?.includes(initialUsersCount.toString()));

    // Dynamically add a user to the reactive signal
    usersSignal.update(list => [
      ...list,
      { id: 'usr_new_test', name: 'Test User', email: 'test@acme.corp', role: 'member', status: 'active', createdAt: '2026-11-16' }
    ]);
    await flushReactivity();

    assert.ok(container.textContent?.includes((initialUsersCount + 1).toString()), 'Dashboard metric updated reactively');
  });

  it('executes UserManagementView search filtering and CRUD operations', async () => {
    const { container } = renderTest(() => UserManagementView());

    // 1. Initial user rendering
    assert.ok(container.textContent?.includes('Alice Smith'));
    assert.ok(container.textContent?.includes('Bob Jones'));

    // 2. Search filtering
    const searchInput = (container.querySelector('.search-input') || container.querySelector('input')) as HTMLInputElement;
    searchInput.value = 'Alice';
    fireEvent(searchInput, 'input');
    await flushReactivity();

    assert.ok(container.textContent?.includes('Alice Smith'), 'Matches search query');
    assert.ok(!container.textContent?.includes('Bob Jones'), 'Non-matching users filtered out');

    // Clear search
    searchInput.value = '';
    fireEvent(searchInput, 'input');
    await flushReactivity();
    assert.ok(container.textContent?.includes('Bob Jones'), 'All users restored on clearing search');

    // 3. User deletion
    const initialCount = usersSignal.value.length;
    const deleteButtons = container.querySelectorAll('.btn-danger');
    assert.ok(deleteButtons.length > 0);

    fireEvent(deleteButtons[0], 'click');
    await flushReactivity();

    assert.equal(usersSignal.value.length, initialCount - 1, 'User removed from reactive state');
  });

  it('updates AnalyticsView metrics on period selection without full re-render', async () => {
    const { container } = renderTest(() => AnalyticsView());

    assert.ok(container.textContent?.includes('1,420,800'), 'Initial 7d requests metric');

    const btn30d = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('30 Days'))!;
    assert.ok(btn30d, '30d tab button found');

    fireEvent(btn30d, 'click');
    await flushReactivity();

    assert.ok(container.textContent?.includes('6,180,450'), 'Updated 30d requests metric');
  });

  it('dispatches and dismisses notifications in NotificationCenter', async () => {
    const initialLen = notifications.value.length;

    notify('Deployment initiated', 'info', 0);
    assert.equal(notifications.value.length, initialLen + 1);

    const toast = notifications.value[notifications.value.length - 1];
    assert.equal(toast.message, 'Deployment initiated');

    dismissNotification(toast.id);
    assert.equal(notifications.value.length, initialLen);
  });

  it('mounts full App shell with all subsystems', async () => {
    currentUser.value = {
      id: 'admin_test',
      name: 'System Admin',
      email: 'admin@samrey.dev',
      role: 'admin'
    };

    const { container } = renderTest(() => App());

    assert.ok(container.querySelector('.saas-sidebar'), 'Sidebar mounted');
    assert.ok(container.querySelector('.saas-header'), 'Header mounted');
    assert.ok(container.querySelector('.notification-container'), 'NotificationCenter mounted');
    assert.ok(container.textContent?.includes('Enterprise Workspace'));
  });
});
