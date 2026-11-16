import { template, bindText } from '@samrey/runtime';

export type BadgeVariant = 'success' | 'warning' | 'error';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge(props: BadgeProps): HTMLElement {
  // TODO: Implement according to benchmarks/interactive/tasks/02-reusable-components.md
  throw new Error('Not implemented');
}
