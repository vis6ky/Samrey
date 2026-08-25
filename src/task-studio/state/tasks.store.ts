/**
 * @license Apache-2.0
 * @samrey/task-studio - Reactive Task Management State Store
 */

import { signal, computed, batch, ReadonlySignal } from '@samrey/reactivity';
import {
  TaskItem,
  TaskActivityLog,
  TaskFilterType,
  TaskSortField,
  TaskSortDirection,
  TaskFormValues,
  TaskCategory,
  TaskPriority
} from '../types.js';
import { taskService } from '../api/task-service.js';
import { addToast } from './toast.store.js';

// Signals
const tasksSignal = signal<TaskItem[]>([]);
const activitiesSignal = signal<TaskActivityLog[]>([]);
const filterTypeSignal = signal<TaskFilterType>('all');
const searchQuerySignal = signal<string>('');
const selectedCategorySignal = signal<string>('all');
const selectedPrioritySignal = signal<string>('all');
const sortFieldSignal = signal<TaskSortField>('dueDate');
const sortDirectionSignal = signal<TaskSortDirection>('asc');
const isLoadingSignal = signal<boolean>(false);
const errorSignal = signal<string | null>(null);

// Priority ranking for sorting
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
};

function isTaskOverdue(dueDate: string, status: string): boolean {
  if (status === 'completed') return false;
  const today = new Date().toISOString().split('T')[0]!;
  return dueDate < today;
}

// Computed: Filtered & Sorted Tasks
const filteredTasksComputed = computed<TaskItem[]>(() => {
  const all = tasksSignal.value;
  const filter = filterTypeSignal.value;
  const search = searchQuerySignal.value.trim().toLowerCase();
  const category = selectedCategorySignal.value;
  const priority = selectedPrioritySignal.value;
  const sortField = sortFieldSignal.value;
  const sortDir = sortDirectionSignal.value;

  let result = all;

  // 1. Primary Filter Type
  if (filter === 'active') {
    result = result.filter((t) => t.status !== 'completed');
  } else if (filter === 'completed') {
    result = result.filter((t) => t.status === 'completed');
  } else if (filter === 'high-priority') {
    result = result.filter((t) => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'completed');
  } else if (filter === 'overdue') {
    result = result.filter((t) => isTaskOverdue(t.dueDate, t.status));
  }

  // 2. Category Filter
  if (category !== 'all') {
    result = result.filter((t) => t.category === category);
  }

  // 3. Priority Filter
  if (priority !== 'all') {
    result = result.filter((t) => t.priority === priority);
  }

  // 4. Text Search
  if (search) {
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  }

  // 5. Sorting
  const sorted = [...result].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'dueDate') {
      cmp = a.dueDate.localeCompare(b.dueDate);
    } else if (sortField === 'priority') {
      cmp = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    } else if (sortField === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortField === 'createdAt') {
      cmp = b.createdAt - a.createdAt;
    }

    return sortDir === 'asc' ? cmp : -cmp;
  });

  return sorted;
});

// Computed: Dashboard Metrics & Statistics
export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  urgentCount: number;
  highCount: number;
  categoryBreakdown: Record<TaskCategory, number>;
  priorityBreakdown: Record<TaskPriority, number>;
}

const statsComputed = computed<TaskStats>(() => {
  const all = tasksSignal.value;
  const total = all.length;
  let completed = 0;
  let overdue = 0;
  let urgent = 0;
  let high = 0;

  const categoryBreakdown: Record<TaskCategory, number> = {
    engineering: 0,
    design: 0,
    security: 0,
    architecture: 0,
    documentation: 0
  };

  const priorityBreakdown: Record<TaskPriority, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const t of all) {
    if (t.status === 'completed') {
      completed++;
    } else {
      if (isTaskOverdue(t.dueDate, t.status)) {
        overdue++;
      }
    }

    if (t.priority === 'urgent') urgent++;
    else if (t.priority === 'high') high++;

    if (t.category in categoryBreakdown) {
      categoryBreakdown[t.category]++;
    }
    if (t.priority in priorityBreakdown) {
      priorityBreakdown[t.priority]++;
    }
  }

  const pending = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    totalTasks: total,
    completedTasks: completed,
    pendingTasks: pending,
    overdueTasks: overdue,
    completionPercentage: percentage,
    urgentCount: urgent,
    highCount: high,
    categoryBreakdown,
    priorityBreakdown
  };
});

// Public Readonly State Exports
export const tasksState = {
  tasks: tasksSignal as ReadonlySignal<TaskItem[]>,
  activities: activitiesSignal as ReadonlySignal<TaskActivityLog[]>,
  filteredTasks: filteredTasksComputed,
  stats: statsComputed,
  filterType: filterTypeSignal as ReadonlySignal<TaskFilterType>,
  searchQuery: searchQuerySignal as ReadonlySignal<string>,
  selectedCategory: selectedCategorySignal as ReadonlySignal<string>,
  selectedPriority: selectedPrioritySignal as ReadonlySignal<string>,
  sortField: sortFieldSignal as ReadonlySignal<TaskSortField>,
  sortDirection: sortDirectionSignal as ReadonlySignal<TaskSortDirection>,
  isLoading: isLoadingSignal as ReadonlySignal<boolean>,
  error: errorSignal as ReadonlySignal<string | null>
};

// State Actions
export async function loadTasks(): Promise<void> {
  isLoadingSignal.value = true;
  errorSignal.value = null;

  try {
    const [fetchedTasks, fetchedActivities] = await Promise.all([
      taskService.getTasks(undefined, { bypassCache: true }),
      taskService.getActivities()
    ]);

    batch(() => {
      tasksSignal.value = fetchedTasks;
      activitiesSignal.value = fetchedActivities;
      isLoadingSignal.value = false;
    });
  } catch (err: any) {
    batch(() => {
      errorSignal.value = err?.message || 'Failed to fetch tasks';
      isLoadingSignal.value = false;
    });
    addToast({
      type: 'error',
      title: 'Fetch Failed',
      message: err?.message || 'Failed to load task list.'
    });
  }
}

export async function createTaskAction(formValues: TaskFormValues): Promise<TaskItem | null> {
  isLoadingSignal.value = true;
  try {
    const created = await taskService.createTask(formValues);
    const updatedActivities = await taskService.getActivities();

    batch(() => {
      tasksSignal.value = [created, ...tasksSignal.value];
      activitiesSignal.value = updatedActivities;
      isLoadingSignal.value = false;
    });

    addToast({
      type: 'success',
      title: 'Task Created',
      message: `"${created.title}" was successfully created.`
    });

    return created;
  } catch (err: any) {
    isLoadingSignal.value = false;
    addToast({
      type: 'error',
      title: 'Creation Failed',
      message: err?.message || 'Could not create task.'
    });
    return null;
  }
}

export async function updateTaskAction(id: string, updates: Partial<TaskItem>): Promise<TaskItem | null> {
  try {
    const updated = await taskService.updateTask(id, updates);
    const updatedActivities = await taskService.getActivities();

    batch(() => {
      tasksSignal.value = tasksSignal.value.map((t) => (t.id === id ? updated : t));
      activitiesSignal.value = updatedActivities;
    });

    addToast({
      type: 'success',
      title: 'Task Updated',
      message: `Changes to "${updated.title}" saved.`
    });

    return updated;
  } catch (err: any) {
    addToast({
      type: 'error',
      title: 'Update Failed',
      message: err?.message || 'Could not update task.'
    });
    return null;
  }
}

export async function toggleTaskStatusAction(task: TaskItem): Promise<void> {
  const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
  // Optimistic UI update
  const previousTasks = tasksSignal.value;
  tasksSignal.value = tasksSignal.value.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t));

  try {
    const updated = await taskService.toggleTaskStatus(task);
    const updatedActivities = await taskService.getActivities();

    batch(() => {
      tasksSignal.value = tasksSignal.value.map((t) => (t.id === task.id ? updated : t));
      activitiesSignal.value = updatedActivities;
    });

    addToast({
      type: 'info',
      title: nextStatus === 'completed' ? 'Task Completed' : 'Task Reopened',
      message: `"${task.title}" is now marked as ${nextStatus}.`
    });
  } catch (err: any) {
    // Revert optimistic update
    tasksSignal.value = previousTasks;
    addToast({
      type: 'error',
      title: 'Status Update Failed',
      message: err?.message || 'Could not toggle task status.'
    });
  }
}

export async function deleteTaskAction(id: string): Promise<boolean> {
  const target = tasksSignal.value.find((t) => t.id === id);
  const previousTasks = tasksSignal.value;

  // Optimistic removal
  tasksSignal.value = tasksSignal.value.filter((t) => t.id !== id);

  try {
    await taskService.deleteTask(id);
    const updatedActivities = await taskService.getActivities();

    activitiesSignal.value = updatedActivities;

    addToast({
      type: 'warning',
      title: 'Task Deleted',
      message: target ? `"${target.title}" was removed.` : 'Task removed.'
    });

    return true;
  } catch (err: any) {
    tasksSignal.value = previousTasks;
    addToast({
      type: 'error',
      title: 'Delete Failed',
      message: err?.message || 'Could not delete task.'
    });
    return false;
  }
}

export function setTaskFilter(filter: TaskFilterType): void {
  filterTypeSignal.value = filter;
}

export function setTaskSearch(query: string): void {
  searchQuerySignal.value = query;
}

export function setTaskCategory(cat: string): void {
  selectedCategorySignal.value = cat;
}

export function setTaskPriority(pri: string): void {
  selectedPrioritySignal.value = pri;
}

export function setTaskSort(field: TaskSortField, dir?: TaskSortDirection): void {
  batch(() => {
    if (sortFieldSignal.value === field && !dir) {
      sortDirectionSignal.value = sortDirectionSignal.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortFieldSignal.value = field;
      if (dir) sortDirectionSignal.value = dir;
    }
  });
}

export function resetTaskFilters(): void {
  batch(() => {
    filterTypeSignal.value = 'all';
    searchQuerySignal.value = '';
    selectedCategorySignal.value = 'all';
    selectedPrioritySignal.value = 'all';
    sortFieldSignal.value = 'dueDate';
    sortDirectionSignal.value = 'asc';
  });
}

// Initial hydration if in client environment
if (typeof window !== 'undefined') {
  loadTasks();
}
