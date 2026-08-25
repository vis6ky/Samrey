/**
 * @license Apache-2.0
 * Samrey Project Manager — Type Contracts & Standard Schema Definitions
 * 100% Native Samrey Independent Consumer Application
 */

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  tags: string[];
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'infra' | 'frontend' | 'security' | 'tooling';
  status: 'active' | 'archived' | 'planned';
  lead: string;
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'engineer' | 'viewer';
  avatarUrl: string;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

export interface SecurityAuditResult {
  xssAttemptsPrevented: number;
  dangerousUrlsBlocked: number;
  prototypePollutionsScrubbed: number;
  csrfTokensValidated: number;
  lastAuditTimestamp: number;
}

export interface ProjectFilterState {
  search: string;
  category: string;
  status: string;
  sortBy: 'name' | 'createdAt' | 'tasks';
  sortDirection: 'asc' | 'desc';
}

export interface TaskFilterState {
  search: string;
  status: string;
  priority: string;
  assignee: string;
  sortBy: 'dueDate' | 'priority' | 'createdAt' | 'title';
  sortDirection: 'asc' | 'desc';
}
