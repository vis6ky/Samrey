/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — State Management & Task Store
 */

import { signal, computed, batch } from '@samrey/reactivity';
import { sanitizeHtml } from '@samrey/security';
import type { Task, Subtask, TaskComment, TaskStatus, TaskPriority, TaskFilter } from './types.js';
import { currentUser } from './auth.js';

// Pre-seeded rich task dataset
const INITIAL_TASKS: Task[] = [
  {
    id: 'tsk-101',
    title: 'Migrate Core Authentication to Native Samrey Signals',
    description: 'Refactor all session and permission guards to use pure glitch-free push-pull signals with built-in CSRF token protection.',
    status: 'in-progress',
    priority: 'critical',
    assignee: {
      id: 'usr-1',
      name: 'Alex Mercer',
      email: 'alex@samrey.dev'
    },
    tags: ['Architecture', 'Security', 'Reactivity'],
    subtasks: [
      { id: 'sub-1', title: 'Implement reactive session state signals', completed: true },
      { id: 'sub-2', title: 'Generate and validate cryptographic CSRF tokens', completed: true },
      { id: 'sub-3', title: 'Add navigation auth guards in router view', completed: false }
    ],
    comments: [
      {
        id: 'cmt-1',
        taskId: 'tsk-101',
        authorId: 'usr-1',
        authorName: 'Alex Mercer',
        authorRole: 'admin',
        content: 'Initial token rotation benchmarks completed. Glitch-free propagation guaranteed under 100ns.',
        createdAt: '2026-08-20T10:15:00Z'
      }
    ],
    dueDate: '2026-09-01',
    createdAt: '2026-08-18T08:00:00Z',
    updatedAt: '2026-08-20T10:15:00Z'
  },
  {
    id: 'tsk-102',
    title: 'Design Task Details View with Interactive Subtask Checklist',
    description: 'Build a high-density, accessible task inspection view displaying status transitions, audit logs, nested checklist items, and live discussion thread.',
    status: 'todo',
    priority: 'high',
    assignee: {
      id: 'usr-2',
      name: 'Elena Rostova',
      email: 'elena@samrey.dev'
    },
    tags: ['UI', 'Forms', 'Components'],
    subtasks: [
      { id: 'sub-4', title: 'Build status toggle segmented controller', completed: false },
      { id: 'sub-5', title: 'Implement dynamic subtask addition & toggle', completed: false },
      { id: 'sub-6', title: 'Connect comment submission form with sanitization', completed: false }
    ],
    comments: [],
    dueDate: '2026-09-05',
    createdAt: '2026-08-19T11:30:00Z',
    updatedAt: '2026-08-19T11:30:00Z'
  },
  {
    id: 'tsk-103',
    title: 'Audit Zero Foreign Framework Runtime Overhead',
    description: 'Verify that the bundled application has zero dependencies on foreign runtime systems (React, Vue, etc.) and operates purely on native DOM bindings.',
    status: 'completed',
    priority: 'medium',
    assignee: {
      id: 'usr-1',
      name: 'Alex Mercer',
      email: 'alex@samrey.dev'
    },
    tags: ['Audit', 'Performance'],
    subtasks: [
      { id: 'sub-7', title: 'Inspect node_modules transitive closures', completed: true },
      { id: 'sub-8', title: 'Verify bundle analyzer output', completed: true }
    ],
    comments: [
      {
        id: 'cmt-2',
        taskId: 'tsk-103',
        authorId: 'usr-1',
        authorName: 'Alex Mercer',
        authorRole: 'admin',
        content: 'Zero external dependencies verified. Bundle size is remarkably lightweight.',
        createdAt: '2026-08-21T16:00:00Z'
      }
    ],
    dueDate: '2026-08-25',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-21T16:00:00Z'
  }
];

// Reactive State Signals
export const tasks = signal<Task[]>([...INITIAL_TASKS]);
export const selectedTaskId = signal<string | null>('tsk-101');
export const filter = signal<TaskFilter>({
  status: 'all',
  priority: 'all',
  searchQuery: ''
});

// Computed Values
export const selectedTask = computed<Task | null>(() => {
  const id = selectedTaskId();
  if (!id) return null;
  return tasks().find(t => t.id === id) ?? null;
});

export const filteredTasks = computed<Task[]>(() => {
  const list = tasks();
  const currentFilter = filter();

  return list.filter(task => {
    if (currentFilter.status !== 'all' && task.status !== currentFilter.status) {
      return false;
    }
    if (currentFilter.priority !== 'all' && task.priority !== currentFilter.priority) {
      return false;
    }
    if (currentFilter.searchQuery.trim()) {
      const q = currentFilter.searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchTag = task.tags.some(tag => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }
    return true;
  });
});

export const taskStats = computed(() => {
  const all = tasks();
  const total = all.length;
  const completed = all.filter(t => t.status === 'completed').length;
  const inProgress = all.filter(t => t.status === 'in-progress').length;
  const todo = all.filter(t => t.status === 'todo').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const criticalCount = all.filter(t => t.priority === 'critical').length;

  return {
    total,
    completed,
    inProgress,
    todo,
    completionRate,
    criticalCount
  };
});

// Task Store Actions
export function selectTask(id: string | null): void {
  selectedTaskId.set(id);
}

export function setStatusFilter(status: TaskStatus | 'all'): void {
  filter.set({ ...filter(), status });
}

export function setSearchQuery(query: string): void {
  filter.set({ ...filter(), searchQuery: query });
}

export function createTask(data: {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  tags?: string[];
}): Task {
  const user = currentUser();
  const sanitizedTitle = sanitizeHtml(data.title.trim());
  const sanitizedDesc = sanitizeHtml(data.description.trim());

  const newTask: Task = {
    id: `tsk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: sanitizedTitle,
    description: sanitizedDesc,
    status: 'todo',
    priority: data.priority,
    assignee: {
      id: user?.id || 'usr-guest',
      name: user?.name || 'Guest User',
      email: user?.email || 'guest@samrey.dev'
    },
    tags: data.tags || ['General'],
    subtasks: [],
    comments: [],
    dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  batch(() => {
    tasks.set([newTask, ...tasks()]);
    selectedTaskId.set(newTask.id);
  });

  return newTask;
}

export function updateTaskStatus(taskId: string, newStatus: TaskStatus): void {
  tasks.set(
    tasks().map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    })
  );
}

export function toggleSubtask(taskId: string, subtaskId: string): void {
  tasks.set(
    tasks().map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.map(s => {
          if (s.id === subtaskId) {
            return { ...s, completed: !s.completed };
          }
          return s;
        });
        return {
          ...t,
          subtasks: updatedSubtasks,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    })
  );
}

export function addSubtask(taskId: string, title: string): void {
  const cleanTitle = sanitizeHtml(title.trim());
  if (!cleanTitle) return;

  const newSubtask: Subtask = {
    id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: cleanTitle,
    completed: false
  };

  tasks.set(
    tasks().map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [...t.subtasks, newSubtask],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    })
  );
}

export function addComment(taskId: string, content: string): void {
  const cleanContent = sanitizeHtml(content.trim());
  if (!cleanContent) return;

  const user = currentUser();
  const newComment: TaskComment = {
    id: `cmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    taskId,
    authorId: user?.id || 'usr-anon',
    authorName: user?.name || 'Anonymous Contributor',
    authorRole: user?.role || 'member',
    content: cleanContent,
    createdAt: new Date().toISOString()
  };

  tasks.set(
    tasks().map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: [...t.comments, newComment],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    })
  );
}

export function deleteTask(taskId: string): void {
  batch(() => {
    tasks.set(tasks().filter(t => t.id !== taskId));
    if (selectedTaskId() === taskId) {
      const remaining = tasks();
      selectedTaskId.set(remaining.length > 0 ? remaining[0].id : null);
    }
  });
}
