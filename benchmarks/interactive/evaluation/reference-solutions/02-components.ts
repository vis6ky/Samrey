/**
 * Reference Solution: Challenge 02 - Reusable Components
 */

import { template, bindText } from '@samrey/runtime';

export type BadgeVariant = 'success' | 'warning' | 'error';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const _badgeTmpl = template('<span ref="badge" class="badge"></span>');

export function Badge(props: BadgeProps): HTMLElement {
  const root = _badgeTmpl.clone();
  const { badge } = root.refs;
  const variant = props.variant ?? 'success';

  badge.classList.add(`badge-${variant}`);
  bindText(badge, () => props.label);

  return root;
}

export interface UserCardProps {
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
}

const _userCardTmpl = template(
  '<div ref="card" class="user-card"><h3 ref="name"></h3><p ref="email"></p><div ref="badgeContainer"></div></div>'
);

export function UserCard(props: UserCardProps): HTMLElement {
  const root = _userCardTmpl.clone();
  const { name, email, badgeContainer } = root.refs;

  bindText(name, () => props.name);
  bindText(email, () => props.email);

  const badge = Badge({
    label: props.status === 'active' ? 'Active' : 'Suspended',
    variant: props.status === 'active' ? 'success' : 'error'
  });
  badgeContainer.appendChild(badge);

  return root;
}
