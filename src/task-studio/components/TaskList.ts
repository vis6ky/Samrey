/**
 * @license Apache-2.0
 * @aether/task-studio - Keyed Task List Component with DOM Node Reuse
 */

import { el, For, Show } from '@aether/runtime';
import { TaskItem } from '../types.js';
import { tasksState, resetTaskFilters } from '../state/tasks.store.js';
import { TaskCard } from './TaskCard.js';
import { EmptyState, LoadingState, ErrorState } from './ui/EmptyState.js';

export interface TaskListProps {
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (task: TaskItem) => void;
  onSelectTask?: (task: TaskItem) => void;
  onCreateNew?: () => void;
}

export function TaskList(props: TaskListProps): HTMLElement {
  const container = el('section', {
    id: 'task-list-container',
    class: 'flex flex-col space-y-4 w-full',
    'aria-label': 'Task list'
  });

  // 1. Loading State
  const loadingView = Show({
    when: () => tasksState.isLoading.value && tasksState.tasks.value.length === 0,
    children: () => LoadingState({ message: 'Loading tasks from backend...' })
  });

  // 2. Error State
  const errorView = Show({
    when: () => Boolean(tasksState.error.value),
    children: () =>
      ErrorState({
        title: 'Failed to retrieve tasks',
        message: tasksState.error.value || 'Unknown error occurred.',
        onRetry: () => {
          // Trigger reload
        }
      })
  });

  // 3. Keyed For Task Grid
  const listGrid = el('div', {
    class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr'
  });

  const keyedTaskItems = For({
    each: () => tasksState.filteredTasks.value,
    key: (task) => task.id,
    children: (task) => {
      return TaskCard({
        task,
        onEdit: props.onEditTask,
        onDelete: props.onDeleteTask,
        onSelect: props.onSelectTask
      });
    }
  });

  listGrid.appendChild(keyedTaskItems);

  // 4. Empty State
  const emptyView = Show({
    when: () => !tasksState.isLoading.value && tasksState.filteredTasks.value.length === 0,
    children: () => {
      const isFiltered =
        tasksState.filterType.value !== 'all' ||
        tasksState.searchQuery.value !== '' ||
        tasksState.selectedCategory.value !== 'all' ||
        tasksState.selectedPriority.value !== 'all';

      if (isFiltered) {
        return EmptyState({
          id: 'tasks-empty-filtered',
          title: 'No matching tasks found',
          description: 'No tasks match your current filter, search query, or category criteria.',
          actionText: 'Clear All Filters',
          onAction: resetTaskFilters
        });
      }

      return EmptyState({
        id: 'tasks-empty-all',
        title: 'No tasks yet',
        description: 'You have not created any tasks in your workspace. Start by adding your first task.',
        actionText: 'Create New Task',
        onAction: props.onCreateNew
      });
    }
  });

  container.appendChild(loadingView);
  container.appendChild(errorView);
  container.appendChild(listGrid);
  container.appendChild(emptyView);

  return container;
}
