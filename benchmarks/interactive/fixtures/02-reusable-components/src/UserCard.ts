import { template, bindText } from '@samrey/runtime';
import { Badge } from './Badge.js';

export interface UserCardProps {
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
}

export function UserCard(props: UserCardProps): HTMLElement {
  // TODO: Implement according to benchmarks/interactive/tasks/02-reusable-components.md
  throw new Error('Not implemented');
}
