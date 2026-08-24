/**
 * @license Apache-2.0
 * @gati/task-studio - New Task View
 */

import { el } from '@gati/runtime';
import { signal } from '@gati/reactivity';
import { createTaskAction } from '../state/tasks.store.js';
import { TaskFormValues } from '../types.js';
import { TaskForm } from '../components/TaskForm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';

export interface NewTaskViewProps {
  onNavigate: (path: string) => void;
}

export function NewTaskView(props: NewTaskViewProps): HTMLElement {
  const container = el('div', { class: 'flex flex-col space-y-6 max-w-3xl mx-auto w-full select-none' });

  // 1. Header with Breadcrumb & Back Navigation
  const header = el(
    'div',
    { class: 'flex items-center justify-between' },
    el(
      'div',
      null,
      el(
        'button',
        {
          type: 'button',
          class: 'text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center space-x-1 mb-1 cursor-pointer',
          onClick: () => props.onNavigate('/tasks')
        },
        el('span', null, '←'),
        el('span', null, 'Back to all tasks')
      ),
      el('h1', { class: 'text-2xl font-extrabold text-slate-900 tracking-tight' }, 'Create New Task'),
      el('p', { class: 'text-xs text-slate-500 mt-0.5' }, 'Add an initiative, bug fix, or architecture goal to the roadmap.')
    )
  );
  container.appendChild(header);

  // 2. Main Form Card
  const formCard = Card(
    {
      title: 'Task Details',
      subtitle: 'Validated with Standard Schema (~v1) on @gati/forms',
      padding: 'md'
    },
    TaskForm({
      submitLabel: 'Create Task',
      onCancel: () => props.onNavigate('/tasks'),
      onSubmit: async (values: TaskFormValues) => {
        const created = await createTaskAction(values);
        if (created) {
          props.onNavigate('/tasks');
        }
      }
    })
  );
  container.appendChild(formCard);

  return container;
}
