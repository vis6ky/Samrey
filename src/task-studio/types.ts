/**
 * @license Apache-2.0
 * @gati/task-studio - Domain & Application Types
 */

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export type TaskCategory = 'engineering' | 'design' | 'security' | 'architecture' | 'documentation';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  dueDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export type TaskFilterType = 'all' | 'active' | 'completed' | 'high-priority' | 'overdue';

export type TaskSortField = 'dueDate' | 'priority' | 'title' | 'createdAt';

export type TaskSortDirection = 'asc' | 'desc';

export interface TaskActivityLog {
  id: string;
  taskId: string;
  taskTitle: string;
  action: 'created' | 'updated' | 'completed' | 'deleted' | 'reopened';
  timestamp: number;
}

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
}

export interface AppSettings {
  mockLatencyMs: number;
  simulateErrors: boolean;
  defaultPriority: TaskPriority;
  defaultCategory: TaskCategory;
  storageMode: 'memory' | 'local';
}
