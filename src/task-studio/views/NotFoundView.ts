/**
 * @license Apache-2.0
 * @gati/task-studio - 404 Not Found View
 */

import { el } from '@gati/runtime';
import { EmptyState } from '../components/ui/EmptyState.js';

export interface NotFoundViewProps {
  onNavigate: (path: string) => void;
}

export function NotFoundView(props: NotFoundViewProps): HTMLElement {
  const container = el('div', { class: 'max-w-2xl mx-auto py-12 px-4 select-none' });

  container.appendChild(
    EmptyState({
      id: 'not-found-state',
      title: 'Page Not Found (404)',
      description: 'The requested route does not exist in Gati Task Studio. Please check the URL or return to the dashboard.',
      actionText: 'Return to Dashboard',
      onAction: () => props.onNavigate('/dashboard')
    })
  );

  return container;
}
