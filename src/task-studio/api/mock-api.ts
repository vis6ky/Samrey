/**
 * @license Apache-2.0
 * @samrey/task-studio - Deterministic Mock REST API Server & Data Seed
 */

import { TaskItem, TaskActivityLog } from '../types.js';
import { settings } from '../state/settings.store.js';

function getTodayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-101',
    title: 'Audit topological push-pull signal graph traversal',
    description: 'Verify dynamic dependency untracking and glitch-free evaluation across diamond computed graphs.',
    priority: 'urgent',
    status: 'completed',
    category: 'engineering',
    dueDate: getTodayOffset(-2),
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2,
    tags: ['reactivity', 'signals', 'core']
  },
  {
    id: 'task-102',
    title: 'Implement Zero-Eval ASCII template parser',
    description: 'Construct recursive-descent parser with byte-level lookup tables to eliminate eval and dynamic code execution.',
    priority: 'high',
    status: 'completed',
    category: 'architecture',
    dueDate: getTodayOffset(-1),
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 1,
    tags: ['compiler', 'security', 'parser']
  },
  {
    id: 'task-103',
    title: 'Standard Schema validation bridge for @samrey/forms',
    description: 'Enable synchronous and asynchronous standard schema validation (~v1) with rich field and form-level error tracking.',
    priority: 'high',
    status: 'in-progress',
    category: 'engineering',
    dueDate: getTodayOffset(1),
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000 * 4,
    tags: ['forms', 'standard-schema', 'validation']
  },
  {
    id: 'task-104',
    title: 'Design high-contrast accessible task cards & badges',
    description: 'Ensure 4.5:1 WCAG contrast ratios, complete ARIA descriptions, and fluid layout math.',
    priority: 'medium',
    status: 'todo',
    category: 'design',
    dueDate: getTodayOffset(3),
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    tags: ['ui', 'accessibility', 'design']
  },
  {
    id: 'task-105',
    title: 'Harden SSR secret guard & prototype pollution scrubber',
    description: 'Scrub dangerous prototype keys and redact sensitive credentials from client hydration script payloads.',
    priority: 'urgent',
    status: 'in-progress',
    category: 'security',
    dueDate: getTodayOffset(0),
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 3600000 * 2,
    tags: ['ssr', 'security', 'hardening']
  },
  {
    id: 'task-106',
    title: 'Author Phase 16 Real-World Application Verification Spec',
    description: 'Document comprehensive test evidence, architecture benchmarks, and external consumer validation results.',
    priority: 'medium',
    status: 'todo',
    category: 'documentation',
    dueDate: getTodayOffset(5),
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
    tags: ['docs', 'audit', 'verification']
  }
];

export const INITIAL_ACTIVITIES: TaskActivityLog[] = [
  {
    id: 'act-1',
    taskId: 'task-101',
    taskTitle: 'Audit topological push-pull signal graph traversal',
    action: 'completed',
    timestamp: Date.now() - 86400000 * 2
  },
  {
    id: 'act-2',
    taskId: 'task-102',
    taskTitle: 'Implement Zero-Eval ASCII template parser',
    action: 'completed',
    timestamp: Date.now() - 86400000 * 1
  },
  {
    id: 'act-3',
    taskId: 'task-105',
    taskTitle: 'Harden SSR secret guard & prototype pollution scrubber',
    action: 'updated',
    timestamp: Date.now() - 3600000 * 2
  },
  {
    id: 'act-4',
    taskId: 'task-106',
    taskTitle: 'Author Phase 16 Real-World Application Verification Spec',
    action: 'created',
    timestamp: Date.now() - 3600000 * 12
  }
];

class MockTaskDatabase {
  private tasks: TaskItem[] = JSON.parse(JSON.stringify(INITIAL_TASKS));
  private activities: TaskActivityLog[] = JSON.parse(JSON.stringify(INITIAL_ACTIVITIES));

  private async delay(signal?: AbortSignal): Promise<void> {
    const ms = settings.value.mockLatencyMs;
    if (ms <= 0) return;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(), ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      }
    });
  }

  private checkSimulatedError(): void {
    if (settings.value.simulateErrors && Math.random() < 0.5) {
      throw new Error('[Simulated Backend Error] Intentionally injected failure for resilience testing.');
    }
  }

  async getAllTasks(signal?: AbortSignal): Promise<TaskItem[]> {
    await this.delay(signal);
    this.checkSimulatedError();
    return JSON.parse(JSON.stringify(this.tasks));
  }

  async getTaskById(id: string, signal?: AbortSignal): Promise<TaskItem> {
    await this.delay(signal);
    this.checkSimulatedError();
    const found = this.tasks.find((t) => t.id === id);
    if (!found) {
      throw new Error(`Task not found with ID: ${id}`);
    }
    return JSON.parse(JSON.stringify(found));
  }

  async createTask(data: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>, signal?: AbortSignal): Promise<TaskItem> {
    await this.delay(signal);
    this.checkSimulatedError();

    const id = `task-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const newTask: TaskItem = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      tags: data.tags || [data.category]
    };

    this.tasks.unshift(newTask);
    this.activities.unshift({
      id: `act-${Date.now()}`,
      taskId: newTask.id,
      taskTitle: newTask.title,
      action: 'created',
      timestamp: now
    });

    return JSON.parse(JSON.stringify(newTask));
  }

  async updateTask(id: string, updates: Partial<TaskItem>, signal?: AbortSignal): Promise<TaskItem> {
    await this.delay(signal);
    this.checkSimulatedError();

    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Cannot update non-existent task ID: ${id}`);
    }

    const prev = this.tasks[index]!;
    const wasCompleted = prev.status === 'completed';
    const isCompleted = updates.status === 'completed';

    const updatedTask: TaskItem = {
      ...prev,
      ...updates,
      updatedAt: Date.now()
    };

    this.tasks[index] = updatedTask;

    let action: TaskActivityLog['action'] = 'updated';
    if (!wasCompleted && isCompleted) action = 'completed';
    else if (wasCompleted && updates.status && updates.status !== 'completed') action = 'reopened';

    this.activities.unshift({
      id: `act-${Date.now()}`,
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      action,
      timestamp: Date.now()
    });

    return JSON.parse(JSON.stringify(updatedTask));
  }

  async deleteTask(id: string, signal?: AbortSignal): Promise<{ success: boolean; id: string }> {
    await this.delay(signal);
    this.checkSimulatedError();

    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Cannot delete non-existent task ID: ${id}`);
    }

    const removed = this.tasks.splice(index, 1)[0]!;
    this.activities.unshift({
      id: `act-${Date.now()}`,
      taskId: removed.id,
      taskTitle: removed.title,
      action: 'deleted',
      timestamp: Date.now()
    });

    return { success: true, id };
  }

  async getActivities(signal?: AbortSignal): Promise<TaskActivityLog[]> {
    await this.delay(signal);
    this.checkSimulatedError();
    return JSON.parse(JSON.stringify(this.activities.slice(0, 20)));
  }

  resetToInitial(): void {
    this.tasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
    this.activities = JSON.parse(JSON.stringify(INITIAL_ACTIVITIES));
  }
}

export const mockDb = new MockTaskDatabase();
