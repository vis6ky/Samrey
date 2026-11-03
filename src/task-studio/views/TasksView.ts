/**
 * @license Apache-2.0
 * @samrey/task-studio - Tasks Management View
 */

import { el, For, Show } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import {
  tasksState,
  setTaskFilter,
  setTaskCategory,
  setTaskPriority,
  setTaskSort,
  setTaskSearch,
  deleteTaskAction,
  updateTaskAction
} from '../state/tasks.store.js';
import { TaskItem, TaskFilterType, TaskSortField, TaskFormValues } from '../types.js';
import { TaskList } from '../components/TaskList.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { TaskForm } from '../components/TaskForm.js';

export interface TasksViewProps {
  onNavigate: (path: string) => void;
}

export function TasksView(props: TasksViewProps): HTMLElement {
  const container = el('div', { class: 'flex flex-col space-y-6 w-full select-none' });

  // Modal State for Edit & Delete
  const editingTask = signal<TaskItem | null>(null);
  const deletingTask = signal<TaskItem | null>(null);

  // 1. Header Toolbar
  const headerToolbar = el('div', {
    class: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200'
  });

  const titleGroup = el('div', null,
    el('h1', { class: 'text-2xl font-extrabold text-slate-900 tracking-tight' }, 'Task Management'),
    el(
      'p',
      { class: 'text-xs text-slate-500 mt-0.5' },
      () => `Showing ${tasksState.filteredTasks.value.length} of ${tasksState.tasks.value.length} total tasks`
    )
  );

  const actionGroup = el('div', { class: 'flex items-center space-x-3 w-full sm:w-auto' },
    Button(
      {
        variant: 'primary',
        size: 'sm',
        onClick: () => props.onNavigate('/tasks/new')
      },
      '+ Create Task'
    )
  );

  headerToolbar.appendChild(titleGroup);
  headerToolbar.appendChild(actionGroup);
  container.appendChild(headerToolbar);

  // 2. Filter Tabs (All, Active, Completed, High Priority, Overdue)
  const filterTabsContainer = el('div', { class: 'flex flex-wrap gap-2' });

  const tabs: Array<{ type: TaskFilterType; label: string }> = [
    { type: 'all', label: 'All Tasks' },
    { type: 'active', label: 'Active' },
    { type: 'completed', label: 'Completed' },
    { type: 'high-priority', label: 'High / Urgent' },
    { type: 'overdue', label: 'Overdue' }
  ];

  for (const tab of tabs) {
    const isSelected = () => tasksState.filterType.value === tab.type;
    const tabBtn = el(
      'button',
      {
        type: 'button',
        class: () => {
          const selected = isSelected();
          const base = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer';
          if (selected) {
            return `${base} bg-slate-900 text-white shadow-2xs`;
          }
          return `${base} bg-slate-100 text-slate-600 hover:bg-slate-200`;
        },
        onClick: () => setTaskFilter(tab.type)
      },
      tab.label
    );
    filterTabsContainer.appendChild(tabBtn);
  }
  container.appendChild(filterTabsContainer);

  // 3. Filter & Sort Control Bar
  const controlBar = el('div', {
    class: 'p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs'
  });

  // Search input
  const searchWrapper = el('div', { class: 'flex-1 min-w-[200px]' },
    el('input', {
      type: 'search',
      placeholder: 'Search tasks...',
      class: 'w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white',
      value: () => tasksState.searchQuery.value,
      onInput: (e: Event) => setTaskSearch((e.target as HTMLInputElement).value)
    })
  );

  // Dropdown filter controls
  const dropdownGroup = el('div', { class: 'flex flex-wrap items-center gap-2' });

  // Category Filter
  const categorySelect = el(
    'select',
    {
      class: 'px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium',
      value: () => tasksState.selectedCategory.value,
      onChange: (e: Event) => setTaskCategory((e.target as HTMLSelectElement).value)
    },
    el('option', { value: 'all' }, 'All Categories'),
    el('option', { value: 'engineering' }, 'Engineering'),
    el('option', { value: 'architecture' }, 'Architecture'),
    el('option', { value: 'security' }, 'Security'),
    el('option', { value: 'design' }, 'Design'),
    el('option', { value: 'documentation' }, 'Documentation')
  );

  // Priority Filter
  const prioritySelect = el(
    'select',
    {
      class: 'px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium',
      value: () => tasksState.selectedPriority.value,
      onChange: (e: Event) => setTaskPriority((e.target as HTMLSelectElement).value)
    },
    el('option', { value: 'all' }, 'All Priorities'),
    el('option', { value: 'urgent' }, 'Urgent'),
    el('option', { value: 'high' }, 'High'),
    el('option', { value: 'medium' }, 'Medium'),
    el('option', { value: 'low' }, 'Low')
  );

  // Sort Field
  const sortSelect = el(
    'select',
    {
      class: 'px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium',
      value: () => tasksState.sortField.value,
      onChange: (e: Event) => setTaskSort((e.target as HTMLSelectElement).value as TaskSortField)
    },
    el('option', { value: 'dueDate' }, 'Sort: Due Date'),
    el('option', { value: 'priority' }, 'Sort: Priority'),
    el('option', { value: 'title' }, 'Sort: Title'),
    el('option', { value: 'createdAt' }, 'Sort: Created')
  );

  // Sort Direction Toggle
  const sortDirBtn = el(
    'button',
    {
      type: 'button',
      class: 'px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-mono font-bold transition cursor-pointer',
      'aria-label': 'Toggle sort direction',
      onClick: () => setTaskSort(tasksState.sortField.value)
    },
    () => (tasksState.sortDirection.value === 'asc' ? '↑ ASC' : '↓ DESC')
  );

  dropdownGroup.appendChild(categorySelect);
  dropdownGroup.appendChild(prioritySelect);
  dropdownGroup.appendChild(sortSelect);
  dropdownGroup.appendChild(sortDirBtn);

  controlBar.appendChild(searchWrapper);
  controlBar.appendChild(dropdownGroup);
  container.appendChild(controlBar);

  // 4. Task List Grid
  const taskListElement = TaskList({
    onEditTask: (task) => {
      editingTask.value = task;
    },
    onDeleteTask: (task) => {
      deletingTask.value = task;
    },
    onSelectTask: (task) => {
      props.onNavigate(`/tasks/${task.id}`);
    },
    onCreateNew: () => props.onNavigate('/tasks/new')
  });
  container.appendChild(taskListElement);

  // 5. Edit Task Modal Dialog
  const editModalNode = Modal(
    {
      isOpen: () => Boolean(editingTask.value),
      title: 'Edit Task',
      onClose: () => {
        editingTask.value = null;
      },
      maxWidth: 'lg'
    },
    Show({
      when: () => Boolean(editingTask.value),
      children: () => {
        const current = editingTask.value!;
        return TaskForm({
          initialValues: current,
          submitLabel: 'Save Changes',
          onCancel: () => {
            editingTask.value = null;
          },
          onSubmit: async (values: TaskFormValues) => {
            await updateTaskAction(current.id, values);
            editingTask.value = null;
          }
        });
      }
    })
  );
  container.appendChild(editModalNode as HTMLElement);

  // 6. Delete Confirmation Modal Dialog
  const deleteModalNode = Modal(
    {
      isOpen: () => Boolean(deletingTask.value),
      title: 'Confirm Task Deletion',
      onClose: () => {
        deletingTask.value = null;
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
              deletingTask.value = null;
            }
          },
          'Cancel'
        ),
        Button(
          {
            variant: 'danger',
            size: 'sm',
            onClick: async () => {
              if (deletingTask.value) {
                await deleteTaskAction(deletingTask.value.id);
                deletingTask.value = null;
              }
            }
          },
          'Delete Task'
        )
      )
    },
    Show({
      when: () => Boolean(deletingTask.value),
      children: () =>
        el(
          'p',
          { class: 'text-xs text-slate-600 leading-relaxed' },
          `Are you sure you want to delete "${deletingTask.value?.title}"? This action cannot be undone.`
        )
    })
  );
  container.appendChild(deleteModalNode as HTMLElement);

  return container;
}
