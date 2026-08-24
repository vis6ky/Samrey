/**
 * @license Apache-2.0
 * Gati Project Manager — Reactive State Store & Computed Derivations
 * Powered 100% by @gati/reactivity (signals, computed, store, produce, reconcile, batch)
 */

import { signal, computed, createStore, batch, produce } from '@gati/reactivity';
import { Project, Task, AuthUser, NotificationItem, ProjectFilterState, TaskFilterState } from './types.js';
import { ProjectManagerApi, currentCsrfToken } from './api.js';

export interface AppState {
  projects: Project[];
  tasks: Task[];
  activeProjectId: string | null;
  currentUser: AuthUser | null;
  notifications: NotificationItem[];
  projectFilter: ProjectFilterState;
  taskFilter: TaskFilterState;
  isLoading: boolean;
  activeModal: 'new-project' | 'new-task' | 'security-check' | null;
}

export const store = createStore<AppState>({
  projects: [],
  tasks: [],
  activeProjectId: null,
  currentUser: null,
  notifications: [],
  projectFilter: {
    search: '',
    category: 'all',
    status: 'all',
    sortBy: 'name',
    sortDirection: 'asc'
  },
  taskFilter: {
    search: '',
    status: 'all',
    priority: 'all',
    assignee: 'all',
    sortBy: 'dueDate',
    sortDirection: 'asc'
  },
  isLoading: false,
  activeModal: null
});

export const projectStore = store;

// Signals for UI toggles
export const isSidebarCollapsed = signal<boolean>(false);
export const globalSearchQuery = signal<string>('');

// Toast Notifications Helper
export function notify(type: NotificationItem['type'], title: string, message: string) {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const item: NotificationItem = { id, type, title, message, timestamp: Date.now() };

  produce(store, (draft) => {
    draft.notifications.unshift(item);
    if (draft.notifications.length > 5) draft.notifications.pop();
  });

  // Auto-dismiss after 4 seconds
  if (typeof setTimeout !== 'undefined') {
    setTimeout(() => {
      dismissNotification(id);
    }, 4000);
  }
}

export function dismissNotification(id: string) {
  produce(store, (draft) => {
    draft.notifications = draft.notifications.filter((n) => n.id !== id);
  });
}

// Data Fetching & Sync Operations
export async function initializeData() {
  produce(store, (draft) => { draft.isLoading = true; });
  try {
    const [user, projects, tasks] = await Promise.all([
      ProjectManagerApi.getCurrentUser(),
      ProjectManagerApi.getProjects(),
      ProjectManagerApi.getTasks()
    ]);

    batch(() => {
      produce(store, (draft) => {
        draft.currentUser = user;
        draft.projects = projects;
        draft.tasks = tasks;
        draft.isLoading = false;
      });
    });
  } catch (err: any) {
    produce(store, (draft) => { draft.isLoading = false; });
    notify('error', 'Data Load Failed', err.message || 'Could not load data.');
  }
}

// Project Operations with Optimistic UI
export async function addProject(data: Omit<Project, 'id' | 'createdAt'>) {
  const tempId = `temp-${Date.now()}`;
  const optimisticProj: Project = {
    ...data,
    id: tempId,
    createdAt: new Date().toISOString(),
    taskCount: 0,
    completedTaskCount: 0
  };

  // Optimistic insert
  produce(store, (draft) => {
    draft.projects.unshift(optimisticProj);
  });

  try {
    const created = await ProjectManagerApi.createProject(data, currentCsrfToken);
    produce(store, (draft) => {
      const idx = draft.projects.findIndex((p) => p.id === tempId);
      if (idx !== -1) draft.projects[idx] = created;
    });
    notify('success', 'Project Created', `Project "${created.name}" is now active.`);
    return created;
  } catch (err: any) {
    // Rollback
    produce(store, (draft) => {
      draft.projects = draft.projects.filter((p) => p.id !== tempId);
    });
    notify('error', 'Project Creation Failed', err.message);
    throw err;
  }
}

export async function removeProject(id: string) {
  const previous = [...store.projects];
  produce(store, (draft) => {
    draft.projects = draft.projects.filter((p) => p.id !== id);
    draft.tasks = draft.tasks.filter((t) => t.projectId !== id);
  });

  try {
    await ProjectManagerApi.deleteProject(id, currentCsrfToken);
    notify('info', 'Project Deleted', 'Project and associated tasks removed.');
  } catch (err: any) {
    produce(store, (draft) => { draft.projects = previous; });
    notify('error', 'Delete Failed', err.message);
  }
}

// Task Operations with Optimistic UI
export async function addTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  const tempId = `temp-task-${Date.now()}`;
  const optimisticTask: Task = {
    ...data,
    id: tempId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  produce(store, (draft) => {
    draft.tasks.unshift(optimisticTask);
    const p = draft.projects.find((proj) => proj.id === data.projectId);
    if (p) p.taskCount = (p.taskCount || 0) + 1;
  });

  try {
    const created = await ProjectManagerApi.createTask(data, currentCsrfToken);
    produce(store, (draft) => {
      const idx = draft.tasks.findIndex((t) => t.id === tempId);
      if (idx !== -1) draft.tasks[idx] = created;
    });
    notify('success', 'Task Created', `Task "${created.title}" added.`);
    return created;
  } catch (err: any) {
    produce(store, (draft) => {
      draft.tasks = draft.tasks.filter((t) => t.id !== tempId);
      const p = draft.projects.find((proj) => proj.id === data.projectId);
      if (p && p.taskCount) p.taskCount--;
    });
    notify('error', 'Task Creation Failed', err.message);
    throw err;
  }
}

export async function toggleTaskStatus(id: string, nextStatus: Task['status']) {
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return;
  const prevStatus = task.status;

  produce(store, (draft) => {
    draft.tasks = draft.tasks.map((t) => (t.id === id ? { ...t, status: nextStatus } : t));
  });

  try {
    await ProjectManagerApi.updateTaskStatus(id, nextStatus, currentCsrfToken);
    notify('info', 'Task Updated', `Task moved to ${nextStatus.replace('_', ' ')}.`);
  } catch (err: any) {
    produce(store, (draft) => {
      draft.tasks = draft.tasks.map((t) => (t.id === id ? { ...t, status: prevStatus } : t));
    });
    notify('error', 'Status Update Failed', err.message);
  }
}

export async function removeTask(id: string) {
  const previous = [...store.tasks];
  produce(store, (draft) => {
    draft.tasks = draft.tasks.filter((t) => t.id !== id);
  });

  try {
    await ProjectManagerApi.deleteTask(id, currentCsrfToken);
    notify('info', 'Task Deleted', 'Task removed successfully.');
  } catch (err: any) {
    produce(store, (draft) => { draft.tasks = previous; });
    notify('error', 'Task Delete Failed', err.message);
  }
}

// Computed Derivations & Metrics
export const projectMetrics = computed(() => {
  const totalProjects = store.projects.length;
  const totalTasks = store.tasks.length;
  const completedTasks = store.tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = store.tasks.filter((t) => t.status === 'in_progress').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalProjects,
    totalTasks,
    completedTasks,
    inProgressTasks,
    completionRate
  };
});

// Filtered Projects Selector
export const filteredProjects = computed(() => {
  const { search, category, status, sortBy, sortDirection } = store.projectFilter;
  let list = [...store.projects];

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  if (category !== 'all') {
    list = list.filter((p) => p.category === category);
  }

  if (status !== 'all') {
    list = list.filter((p) => p.status === status);
  }

  list.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
    else if (sortBy === 'tasks') cmp = (a.taskCount || 0) - (b.taskCount || 0);

    return sortDirection === 'asc' ? cmp : -cmp;
  });

  return list;
});

// Filtered Tasks Selector
export const filteredTasks = computed(() => {
  const { search, status, priority, assignee, sortBy, sortDirection } = store.taskFilter;
  let list = [...store.tasks];

  if (store.activeProjectId) {
    list = list.filter((t) => t.projectId === store.activeProjectId);
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  if (status !== 'all') {
    list = list.filter((t) => t.status === status);
  }

  if (priority !== 'all') {
    list = list.filter((t) => t.priority === priority);
  }

  if (assignee !== 'all') {
    list = list.filter((t) => t.assignee === assignee);
  }

  list.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortBy === 'dueDate') cmp = a.dueDate.localeCompare(b.dueDate);
    else if (sortBy === 'priority') {
      const pWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
      cmp = (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
    } else if (sortBy === 'createdAt') {
      cmp = a.createdAt.localeCompare(b.createdAt);
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  return list;
});
