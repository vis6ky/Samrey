/**
 * @license Apache-2.0
 * @samrey/task-studio - Reactive Toast Notification Store
 */

import { signal, ReadonlySignal } from '@samrey/reactivity';
import { ToastMessage } from '../types.js';

const toastsSignal = signal<ToastMessage[]>([]);

export const toasts: ReadonlySignal<ToastMessage[]> = toastsSignal;

export function addToast(toast: Omit<ToastMessage, 'id' | 'timestamp'>): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newToast: ToastMessage = {
    ...toast,
    id,
    timestamp: Date.now(),
    duration: toast.duration ?? 4000
  };

  toastsSignal.value = [...toastsSignal.value, newToast];

  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }

  return id;
}

export function removeToast(id: string): void {
  toastsSignal.value = toastsSignal.value.filter((t) => t.id !== id);
}

export function clearToasts(): void {
  toastsSignal.value = [];
}
