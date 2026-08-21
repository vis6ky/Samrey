/**
 * @license Apache-2.0
 * @aether/task-studio - Accessible Task Card Component
 */

import { el } from '@aether/runtime';
import { TaskItem } from '../types.js';
import { Badge } from './ui/Badge.js';
import { toggleTaskStatusAction } from '../state/tasks.store.js';

export interface TaskCardProps {
  task: TaskItem;
  onEdit?: (task: TaskItem) => void;
  onDelete?: (task: TaskItem) => void;
  onSelect?: (task: TaskItem) => void;
}

export function TaskCard(props: TaskCardProps): HTMLElement {
  const { task } = props;
  const isCompleted = task.status === 'completed';
  const today = new Date().toISOString().split('T')[0]!;
  const isOverdue = !isCompleted && task.dueDate < today;

  const card = el(
    'article',
    {
      id: `task-card-${task.id}`,
      class: `group relative bg-white rounded-xl border p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between select-none ${
        isCompleted ? 'border-slate-200/80 bg-slate-50/50 opacity-80' : isOverdue ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
      }`,
      'aria-labelledby': `task-title-${task.id}`
    }
  );

  // Top Row: Checkbox + Title + Actions
  const topRow = el('div', { class: 'flex items-start space-x-3' });

  // Custom accessible Checkbox button
  const checkBtn = el(
    'button',
    {
      type: 'button',
      role: 'checkbox',
      'aria-checked': isCompleted ? 'true' : 'false',
      'aria-label': isCompleted ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as completed`,
      class: `mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 ${
        isCompleted
          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
          : 'bg-white border-slate-300 hover:border-slate-500 text-transparent'
      }`,
      onClick: (e: MouseEvent) => {
        e.stopPropagation();
        toggleTaskStatusAction(task);
      }
    },
    '✓'
  );

  // Content Area
  const contentArea = el(
    'div',
    {
      class: 'flex-1 min-w-0 cursor-pointer',
      onClick: () => {
        if (props.onSelect) props.onSelect(task);
      }
    },
    el(
      'div',
      { class: 'flex items-center space-x-2' },
      el(
        'h4',
        {
          id: `task-title-${task.id}`,
          class: `text-sm font-semibold tracking-tight truncate ${
            isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
          }`
        },
        task.title
      ),
      isOverdue
        ? el('span', { class: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 uppercase tracking-wider' }, 'Overdue')
        : null
    ),
    el(
      'p',
      { class: 'mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed' },
      task.description
    )
  );

  // Action Buttons (Edit / Delete)
  const actionArea = el('div', { class: 'flex items-center space-x-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition' });

  if (props.onEdit) {
    const editBtn = el(
      'button',
      {
        type: 'button',
        class: 'p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer text-xs font-mono',
        'aria-label': `Edit ${task.title}`,
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          props.onEdit!(task);
        }
      },
      '✎'
    );
    actionArea.appendChild(editBtn);
  }

  if (props.onDelete) {
    const deleteBtn = el(
      'button',
      {
        type: 'button',
        class: 'p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer text-xs font-mono',
        'aria-label': `Delete ${task.title}`,
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          props.onDelete!(task);
        }
      },
      '✕'
    );
    actionArea.appendChild(deleteBtn);
  }

  topRow.appendChild(checkBtn);
  topRow.appendChild(contentArea);
  topRow.appendChild(actionArea);
  card.appendChild(topRow);

  // Bottom Metadata Row (Badges, Due Date, Category)
  const metaRow = el(
    'div',
    { class: 'mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500' },
    el(
      'div',
      { class: 'flex items-center space-x-2' },
      Badge({ variant: 'priority', value: task.priority }),
      Badge({ variant: 'category', value: task.category })
    ),
    el(
      'div',
      { class: `flex items-center space-x-1 font-mono text-[11px] ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}` },
      el('span', null, '📅 Due:'),
      el('time', { datetime: task.dueDate }, task.dueDate)
    )
  );

  card.appendChild(metaRow);
  return card;
}
