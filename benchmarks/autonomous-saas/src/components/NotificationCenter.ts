/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Notification Center
 */

import { signal } from '@samrey/reactivity';
import { template, on, bindText, For } from '@samrey/runtime';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const notifications = signal<Toast[]>([]);

export function notify(message: string, type: Toast['type'] = 'info', durationMs = 4000): void {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  notifications.update(list => [...list, { id, message, type }]);

  if (durationMs > 0) {
    setTimeout(() => {
      dismissNotification(id);
    }, durationMs);
  }
}

export function dismissNotification(id: string): void {
  notifications.update(list => list.filter(t => t.id !== id));
}

const _containerTmpl = template('<div class="notification-container" role="region" aria-live="polite"></div>');
const _toastTmpl = template('<div class="toast-item"><span ref="msg"></span><button ref="closeBtn" aria-label="Dismiss">&times;</button></div>');

export function NotificationCenter(): HTMLElement {
  const root = _containerTmpl.clone();

  const list = For({
    each: () => notifications.value,
    key: (t: Toast) => t.id,
    children: (t: Toast) => {
      const toastEl = _toastTmpl.clone();
      const { msg, closeBtn } = toastEl.refs;
      toastEl.classList.add(`toast-${t.type}`);
      bindText(msg, () => t.message);
      on(closeBtn, 'click', () => dismissNotification(t.id));
      return toastEl;
    }
  });

  root.appendChild(list);
  return root;
}
