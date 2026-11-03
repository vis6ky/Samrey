/**
 * @license Apache-2.0
 * @samrey/task-studio - Accessible Badge Component
 */

import { el } from '@samrey/runtime';
import { TaskPriority, TaskStatus, TaskCategory } from '../../types.js';

export interface BadgeProps {
  id?: string;
  variant?: 'priority' | 'status' | 'category' | 'neutral' | 'count';
  value: string;
  class?: string;
}

export function Badge(props: BadgeProps): HTMLElement {
  const v = props.value.toLowerCase();
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (props.variant === 'priority') {
    const p = v as TaskPriority;
    switch (p) {
      case 'urgent':
        colorClass = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
        break;
      case 'high':
        colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
      case 'medium':
        colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'low':
        colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (props.variant === 'status') {
    const s = v as TaskStatus;
    switch (s) {
      case 'completed':
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'in-progress':
        colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      case 'todo':
        colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (props.variant === 'category') {
    const c = v as TaskCategory;
    switch (c) {
      case 'engineering':
        colorClass = 'bg-cyan-50 text-cyan-800 border-cyan-200';
        break;
      case 'design':
        colorClass = 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200';
        break;
      case 'security':
        colorClass = 'bg-rose-50 text-rose-800 border-rose-200';
        break;
      case 'architecture':
        colorClass = 'bg-violet-50 text-violet-800 border-violet-200';
        break;
      case 'documentation':
        colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
    }
  } else if (props.variant === 'count') {
    colorClass = 'bg-slate-200 text-slate-700 border-slate-300 font-mono text-[11px] px-1.5 py-0.2';
  }

  const customClass = props.class ? ` ${props.class}` : '';
  const finalClass = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}${customClass}`;

  const attrs: Record<string, any> = { class: finalClass };
  if (props.id) attrs.id = props.id;

  return el('span', attrs, props.value);
}
