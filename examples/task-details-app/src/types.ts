/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Type Definitions
 */

export type UserRole = 'admin' | 'member' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  csrfToken: string;
  expiresAt: number;
}

export type TaskStatus = 'todo' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: {
    id: string;
    name: string;
    email: string;
  };
  tags: string[];
  subtasks: Subtask[];
  comments: TaskComment[];
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilter {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  searchQuery: string;
}
