/**
 * @license Apache-2.0
 * @gati/task-studio - Task Detail View
 */

import { el, Show } from '@gati/runtime';
import { signal, computed } from '@gati/reactivity';
import { RouterInstance } from '@gati/router';
import { tasksState, updateTaskAction, deleteTaskAction, toggleTaskStatusAction } from '../state/tasks.store.js';
import { TaskFormValues, TaskItem } from '../types.js';
import { TaskForm } from '../components/TaskForm.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Modal } from '../components/ui/Modal.js';
import { EmptyState } from '../components/ui/EmptyState.js';

export interface TaskDetailViewProps {
  router: RouterInstance;
  onNavigate: (path: string) => void;
}

export function TaskDetailView(props: TaskDetailViewProps): HTMLElement {
  const isEditing = signal(false);
  const isDeleting = signal(false);

  // Compute current task dynamically from router params
  const currentTask = computed<TaskItem | null>(() => {
    const id = props.router.currentParams.value.id;
    if (!id) return null;
    return tasksState.tasks.value.find((t) => t.id === id) || null;
  });

  const container = el('div', { class: 'flex flex-col space-y-6 max-w-4xl mx-auto w-full select-none' });

  // 1. Breadcrumb Bar
  const breadcrumb = el(
    'div',
    { class: 'flex items-center justify-between' },
    el(
      'button',
      {
        type: 'button',
        class: 'text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center space-x-1 cursor-pointer',
        onClick: () => props.onNavigate('/tasks')
      },
      el('span', null, '←'),
      el('span', null, 'Back to all tasks')
    ),
    el(
      'div',
      { class: 'flex items-center space-x-2' },
      Button(
        {
          variant: 'outline',
          size: 'sm',
          onClick: () => {
            isEditing.value = !isEditing.value;
          }
        },
        () => (isEditing.value ? 'Cancel Editing' : '✎ Edit Task')
      ),
      Button(
        {
          variant: 'danger',
          size: 'sm',
          onClick: () => {
            isDeleting.value = true;
          }
        },
        'Delete'
      )
    )
  );
  container.appendChild(breadcrumb);

  // 2. Main Content (Found vs Not Found)
  const mainContent = Show({
    when: () => Boolean(currentTask.value),
    fallback: () =>
      EmptyState({
        title: 'Task Not Found',
        description: 'The requested task ID does not exist in the workspace or may have been deleted.',
        actionText: 'Return to Tasks',
        onAction: () => props.onNavigate('/tasks')
      }),
    children: () => {
      const task = currentTask.value!;

      // Normal View Mode vs Edit Mode
      return Show({
        when: () => isEditing.value,
        fallback: () => {
          const detailCard = Card(
            {
              padding: 'lg',
              class: 'space-y-6'
            },
            // Title & Status
            el(
              'div',
              { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100' },
              el(
                'div',
                { class: 'space-y-1' },
                el('div', { class: 'flex items-center space-x-3' },
                  el('h1', { class: 'text-2xl font-extrabold text-slate-900 tracking-tight' }, task.title),
                  Badge({ variant: 'status', value: task.status })
                ),
                el('p', { class: 'text-xs text-slate-400 font-mono' }, `ID: ${task.id}`)
              ),
              Button(
                {
                  variant: task.status === 'completed' ? 'secondary' : 'primary',
                  size: 'md',
                  onClick: () => toggleTaskStatusAction(task)
                },
                task.status === 'completed' ? '↩ Reopen Task' : '✓ Mark as Completed'
              )
            ),

            // Metadata Grid (Priority, Category, Due Date, Created)
            el(
              'div',
              { class: 'grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs' },
              el('div', null,
                el('span', { class: 'text-slate-400 font-medium block mb-1' }, 'Priority'),
                Badge({ variant: 'priority', value: task.priority })
              ),
              el('div', null,
                el('span', { class: 'text-slate-400 font-medium block mb-1' }, 'Category'),
                Badge({ variant: 'category', value: task.category })
              ),
              el('div', null,
                el('span', { class: 'text-slate-400 font-medium block mb-1' }, 'Due Date'),
                el('span', { class: 'font-mono font-bold text-slate-800' }, task.dueDate)
              ),
              el('div', null,
                el('span', { class: 'text-slate-400 font-medium block mb-1' }, 'Last Updated'),
                el('span', { class: 'font-mono text-slate-600' }, new Date(task.updatedAt).toLocaleDateString())
              )
            ),

            // Description Section
            el(
              'div',
              { class: 'space-y-2 pt-2' },
              el('h3', { class: 'text-xs font-bold text-slate-900 uppercase tracking-wider' }, 'Description & Scope'),
              el(
                'div',
                { class: 'p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-sm text-slate-700 leading-relaxed font-sans' },
                task.description || 'No detailed description provided.'
              )
            ),

            // Tags Section
            el(
              'div',
              { class: 'space-y-2 pt-2' },
              el('h3', { class: 'text-xs font-bold text-slate-900 uppercase tracking-wider' }, 'Tags'),
              el(
                'div',
                { class: 'flex flex-wrap gap-2' },
                ...task.tags.map((tag) =>
                  el('span', { class: 'px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono border border-slate-200' }, `#${tag}`)
                )
              )
            )
          );

          return detailCard;
        },
        children: () => {
          return Card(
            {
              title: 'Edit Task Information',
              subtitle: 'Update fields and save changes',
              padding: 'md'
            },
            TaskForm({
              initialValues: task,
              submitLabel: 'Save Changes',
              onCancel: () => {
                isEditing.value = false;
              },
              onSubmit: async (values: TaskFormValues) => {
                await updateTaskAction(task.id, values);
                isEditing.value = false;
              }
            })
          );
        }
      });
    }
  });
  container.appendChild(mainContent as HTMLElement);

  // 3. Delete Confirmation Modal
  const deleteModalNode = Modal(
    {
      isOpen: isDeleting,
      title: 'Delete Task',
      onClose: () => {
        isDeleting.value = false;
      },
      maxWidth: 'sm',
      actions: el(
        'div',
        { class: 'flex space-x-3' },
        Button(
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => {
              isDeleting.value = false;
            }
          },
          'Cancel'
        ),
        Button(
          {
            variant: 'danger',
            size: 'sm',
            onClick: async () => {
              if (currentTask.value) {
                await deleteTaskAction(currentTask.value.id);
                isDeleting.value = false;
                props.onNavigate('/tasks');
              }
            }
          },
          'Confirm Delete'
        )
      )
    },
    el('p', { class: 'text-xs text-slate-600 leading-relaxed' }, 'Are you sure you want to permanently delete this task?')
  );
  container.appendChild(deleteModalNode as HTMLElement);

  return container;
}
