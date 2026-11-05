/**
 * @license Apache-2.0
 * UserProfile Component - Async Resource Fetching & Show Conditional Rendering
 */

import { createResource } from '@samrey/http';
import { Show, template, on, bindText } from '@samrey/runtime';

export interface UserData {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'offline';
}

const _wrapperTmpl = template(`
  <section class="profile-container">
    <h2>User Profile</h2>
    <div class="profile-content"></div>
    <div class="profile-actions">
      <button type="button" class="btn btn-reload">Reload Profile</button>
    </div>
  </section>
`);

const _loadingTmpl = template('<div class="loading-state">Loading user profile...</div>');

const _cardTmpl = template(`
  <div class="profile-card">
    <div class="user-info">
      <h3 class="user-name"></h3>
      <p class="user-role"></p>
      <p class="user-email"></p>
      <span class="user-status-badge"></span>
    </div>
  </div>
`);

export function UserProfile(props?: {
  fetcher?: () => Promise<UserData>;
}) {
  const defaultFetcher = async (): Promise<UserData> => {
    // Simulated async fetch
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      id: 'usr-1',
      name: 'Samrey Developer',
      role: 'Principal Framework Architect',
      email: 'architect@samrey.dev',
      status: 'active'
    };
  };

  const userResource = createResource(props?.fetcher ?? defaultFetcher);

  const root = _wrapperTmpl() as HTMLElement;
  const contentContainer = root.querySelector('.profile-content') as HTMLElement;
  const reloadBtn = root.querySelector('.btn-reload') as HTMLButtonElement;

  const conditionalView = Show({
    when: () => !userResource.loading.value && userResource.data.value != null,
    fallback: () => _loadingTmpl(),
    children: () => {
      const card = _cardTmpl() as HTMLElement;
      const user = userResource.data.value!;

      const nameEl = card.querySelector('.user-name') as HTMLElement;
      const roleEl = card.querySelector('.user-role') as HTMLElement;
      const emailEl = card.querySelector('.user-email') as HTMLElement;
      const statusBadge = card.querySelector('.user-status-badge') as HTMLElement;

      bindText(nameEl, () => user.name);
      bindText(roleEl, () => user.role);
      bindText(emailEl, () => user.email);
      bindText(statusBadge, () => user.status.toUpperCase());

      return card;
    }
  });

  contentContainer.appendChild(conditionalView);

  on(reloadBtn, 'click', () => {
    userResource.refetch();
  });

  return root;
}

