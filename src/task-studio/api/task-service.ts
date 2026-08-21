/**
 * @license Apache-2.0
 * @aether/task-studio - Task Data Service with @aether/http
 */

import { TaskItem, TaskActivityLog, TaskFormValues } from '../types.js';
import { mockDb } from './mock-api.js';

export interface TaskFilterParams {
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
}

export class TaskService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTtlMs = 15000;

  async getTasks(params?: TaskFilterParams, options: { signal?: AbortSignal; bypassCache?: boolean } = {}): Promise<TaskItem[]> {
    const cacheKey = `tasks-${JSON.stringify(params || {})}`;
    const now = Date.now();

    if (!options.bypassCache && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (now - entry.timestamp < this.cacheTtlMs) {
        return JSON.parse(JSON.stringify(entry.data));
      }
    }

    const all = await mockDb.getAllTasks(options.signal);
    let filtered = all;

    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (params?.category && params.category !== 'all') {
      filtered = filtered.filter((t) => t.category === params.category);
    }

    if (params?.priority && params.priority !== 'all') {
      filtered = filtered.filter((t) => t.priority === params.priority);
    }

    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter((t) => t.status === params.status);
    }

    this.cache.set(cacheKey, { data: filtered, timestamp: now });
    return filtered;
  }

  async getTask(id: string, options: { signal?: AbortSignal } = {}): Promise<TaskItem> {
    return mockDb.getTaskById(id, options.signal);
  }

  async createTask(formValues: TaskFormValues, options: { signal?: AbortSignal } = {}): Promise<TaskItem> {
    this.invalidateCache();
    return mockDb.createTask(
      {
        title: formValues.title,
        description: formValues.description,
        priority: formValues.priority,
        category: formValues.category,
        dueDate: formValues.dueDate,
        status: 'todo',
        tags: [formValues.category]
      },
      options.signal
    );
  }

  async updateTask(id: string, updates: Partial<TaskItem>, options: { signal?: AbortSignal } = {}): Promise<TaskItem> {
    this.invalidateCache();
    return mockDb.updateTask(id, updates, options.signal);
  }

  async toggleTaskStatus(task: TaskItem, options: { signal?: AbortSignal } = {}): Promise<TaskItem> {
    this.invalidateCache();
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    return mockDb.updateTask(task.id, { status: nextStatus }, options.signal);
  }

  async deleteTask(id: string, options: { signal?: AbortSignal } = {}): Promise<{ success: boolean; id: string }> {
    this.invalidateCache();
    return mockDb.deleteTask(id, options.signal);
  }

  async getActivities(options: { signal?: AbortSignal } = {}): Promise<TaskActivityLog[]> {
    return mockDb.getActivities(options.signal);
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  resetDatabase(): void {
    this.invalidateCache();
    mockDb.resetToInitial();
  }
}

export const taskService = new TaskService();
