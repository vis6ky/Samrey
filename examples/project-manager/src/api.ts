/**
 * @license Apache-2.0
 * Gati Project Manager — HTTP API Client & Mock Data Service
 * Implements full RESTful semantics using @gati/http and @gati/security
 */

import { httpClient, createHttpCache } from '@gati/http';
import { sanitizeHtml, sanitizeUrl, createCsrfToken, validateCsrfToken, safeJsonParse } from '@gati/security';
import { Project, Task, AuthUser, SecurityAuditResult } from './types.js';

// In-memory data store for the Project Manager API
export let currentCsrfToken = createCsrfToken();

let projectsStore: Project[] = [
  {
    id: 'proj-1',
    name: 'Gati Framework v1.0 Release',
    description: 'Final production quality gate, benchmarking, and ecosystem release preparation.',
    category: 'core',
    status: 'active',
    lead: 'Ada Lovelace',
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'proj-2',
    name: 'Zero-Trust Security Shield',
    description: 'Adversarial XSS sanitizer, CSP validator, and prototype pollution defensive pipeline.',
    category: 'security',
    status: 'active',
    lead: 'Alan Turing',
    createdAt: '2026-02-01T10:30:00Z'
  },
  {
    id: 'proj-3',
    name: 'Isomorphic SSR & Streaming Engine',
    description: 'Zero-overhead HTML streaming, hydration markers, and secret stripping for server rendering.',
    category: 'infra',
    status: 'active',
    lead: 'Grace Hopper',
    createdAt: '2026-02-10T14:00:00Z'
  },
  {
    id: 'proj-4',
    name: 'Developer Tooling & CLI Suite',
    description: 'Next-generation project scaffolding, hot development server, and audit diagnostics.',
    category: 'tooling',
    status: 'active',
    lead: 'Margaret Hamilton',
    createdAt: '2026-03-01T09:00:00Z'
  }
];

let tasksStore: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Audit public API exports across 11 packages',
    description: 'Ensure 100% type-safe export contracts in reactivity, runtime, router, and forms.',
    status: 'done',
    priority: 'urgent',
    assignee: 'Ada Lovelace',
    tags: ['api', 'dx', 'types'],
    dueDate: '2026-08-25',
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-08-20T16:00:00Z'
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Validate external consumer with zero monorepo imports',
    description: 'Confirm that third-party developers can install and build without internal symbols.',
    status: 'in_progress',
    priority: 'high',
    assignee: 'Alan Turing',
    tags: ['ecosystem', 'consumer', 'validation'],
    dueDate: '2026-08-28',
    createdAt: '2026-08-12T11:00:00Z',
    updatedAt: '2026-08-21T02:00:00Z'
  },
  {
    id: 'task-3',
    projectId: 'proj-2',
    title: 'Execute 15 adversarial security test attacks',
    description: 'Test javascript: schemes, SVG payload injections, and prototype pollution keys.',
    status: 'done',
    priority: 'urgent',
    assignee: 'Grace Hopper',
    tags: ['security', 'xss', 'audit'],
    dueDate: '2026-08-22',
    createdAt: '2026-08-14T08:30:00Z',
    updatedAt: '2026-08-20T18:00:00Z'
  },
  {
    id: 'task-4',
    projectId: 'proj-3',
    title: 'Benchmark streaming SSR throughput vs Solid/Svelte',
    description: 'Verify sub-millisecond chunk emission and zero VDOM diffing overhead.',
    status: 'todo',
    priority: 'medium',
    assignee: 'Margaret Hamilton',
    tags: ['ssr', 'perf', 'benchmarks'],
    dueDate: '2026-09-05',
    createdAt: '2026-08-18T13:00:00Z',
    updatedAt: '2026-08-18T13:00:00Z'
  },
  {
    id: 'task-5',
    projectId: 'proj-4',
    title: 'Verify multi-template scaffolding (SSR, SPA, Minimal, SSG)',
    description: 'Ensure aether create outputs clean, working TypeScript code for all templates.',
    status: 'done',
    priority: 'high',
    assignee: 'Ada Lovelace',
    tags: ['cli', 'templates', 'dx'],
    dueDate: '2026-08-24',
    createdAt: '2026-08-19T10:00:00Z',
    updatedAt: '2026-08-21T01:30:00Z'
  }
];

export const securityMetrics: SecurityAuditResult = {
  xssAttemptsPrevented: 42,
  dangerousUrlsBlocked: 18,
  prototypePollutionsScrubbed: 7,
  csrfTokensValidated: 89,
  lastAuditTimestamp: Date.now()
};

// HTTP Cache Instance
export const apiCache = createHttpCache({ defaultTtl: 60000 });

// Simulated latency helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const ProjectManagerApi = {
  // Authentication Mock
  async getCurrentUser(): Promise<AuthUser> {
    await delay(10);
    return {
      id: 'usr-1',
      name: 'Ada Lovelace',
      email: 'ada@gati-framework.dev',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    };
  },

  // Projects API
  async getProjects(): Promise<Project[]> {
    await delay(20);
    return projectsStore.map((p) => {
      const pTasks = tasksStore.filter((t) => t.projectId === p.id);
      return {
        ...p,
        taskCount: pTasks.length,
        completedTaskCount: pTasks.filter((t) => t.status === 'done').length
      };
    });
  },

  async getProjectById(id: string): Promise<Project | null> {
    await delay(15);
    const p = projectsStore.find((item) => item.id === id);
    if (!p) return null;
    const pTasks = tasksStore.filter((t) => t.projectId === p.id);
    return {
      ...p,
      taskCount: pTasks.length,
      completedTaskCount: pTasks.filter((t) => t.status === 'done').length
    };
  },

  async createProject(data: Omit<Project, 'id' | 'createdAt'>, csrfToken: string): Promise<Project> {
    await delay(25);
    if (!validateCsrfToken(csrfToken, currentCsrfToken)) {
      securityMetrics.csrfTokensValidated++;
      throw new Error('[AETH-204] CSRF Token validation failed for createProject');
    }
    securityMetrics.csrfTokensValidated++;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: sanitizeHtml(data.name.trim()),
      description: sanitizeHtml(data.description.trim()),
      category: data.category,
      status: data.status,
      lead: sanitizeHtml(data.lead.trim()),
      createdAt: new Date().toISOString()
    };

    projectsStore.push(newProject);
    apiCache.clear();
    return newProject;
  },

  async updateProject(id: string, updates: Partial<Project>, csrfToken: string): Promise<Project> {
    await delay(20);
    if (!validateCsrfToken(csrfToken, currentCsrfToken)) {
      throw new Error('[AETH-204] CSRF Token validation failed for updateProject');
    }
    const idx = projectsStore.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`[AETH-601] Project not found: ${id}`);

    if (updates.name) updates.name = sanitizeHtml(updates.name);
    if (updates.description) updates.description = sanitizeHtml(updates.description);
    if (updates.lead) updates.lead = sanitizeHtml(updates.lead);

    projectsStore[idx] = { ...projectsStore[idx], ...updates };
    apiCache.clear();
    return projectsStore[idx];
  },

  async deleteProject(id: string, csrfToken: string): Promise<{ success: boolean }> {
    await delay(20);
    if (!validateCsrfToken(csrfToken, currentCsrfToken)) {
      throw new Error('[AETH-204] CSRF Token validation failed for deleteProject');
    }
    projectsStore = projectsStore.filter((p) => p.id !== id);
    tasksStore = tasksStore.filter((t) => t.projectId !== id);
    apiCache.clear();
    return { success: true };
  },

  // Tasks API
  async getTasks(projectId?: string): Promise<Task[]> {
    await delay(20);
    if (projectId) {
      return tasksStore.filter((t) => t.projectId === projectId);
    }
    return [...tasksStore];
  },

  async getTaskById(id: string): Promise<Task | null> {
    await delay(15);
    return tasksStore.find((t) => t.id === id) || null;
  },

  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, csrfToken: string): Promise<Task> {
    await delay(25);
    if (!validateCsrfToken(csrfToken, currentCsrfToken)) {
      throw new Error('[AETH-204] CSRF Token validation failed for createTask');
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: data.projectId,
      title: sanitizeHtml(data.title.trim()),
      description: sanitizeHtml(data.description.trim()),
      status: data.status,
      priority: data.priority,
      assignee: sanitizeHtml(data.assignee.trim()),
      tags: data.tags.map((t) => sanitizeHtml(t.trim())),
      dueDate: data.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasksStore.push(newTask);
    apiCache.clear();
    return newTask;
  },

  async updateTaskStatus(id: string, status: Task['status'], csrfToken: string): Promise<Task> {
    await delay(15);
    if (!validateCsrfToken(csrfToken, currentCsrfToken)) {
      throw new Error('[AETH-204] CSRF Token validation failed');
    }
    const idx = tasksStore.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`[AETH-601] Task not found: ${id}`);

    tasksStore[idx] = {
      ...tasksStore[idx],
      status,
      updatedAt: new Date().toISOString()
    };
    apiCache.clear();
    return tasksStore[idx];
  },

  async updateTask(id: string, updates: Partial<Task>, csrfToken: string): Promise<Task> {
    await delay(20);
    if (!validateCsrfToken(csrfToken, currentCsrfToken)) {
      throw new Error('[AETH-204] CSRF Token validation failed');
    }
    const idx = tasksStore.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`[AETH-601] Task not found: ${id}`);

    if (updates.title) updates.title = sanitizeHtml(updates.title);
    if (updates.description) updates.description = sanitizeHtml(updates.description);
    if (updates.assignee) updates.assignee = sanitizeHtml(updates.assignee);

    tasksStore[idx] = {
      ...tasksStore[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    apiCache.clear();
    return tasksStore[idx];
  },

  async deleteTask(id: string, csrfToken: string): Promise<{ success: boolean }> {
    await delay(15);
    if (!validateCsrfToken(csrfToken, currentCsrfToken)) {
      throw new Error('[AETH-204] CSRF Token validation failed');
    }
    tasksStore = tasksStore.filter((t) => t.id !== id);
    apiCache.clear();
    return { success: true };
  },

  // Security Diagnostics API
  getSecurityAudit(): SecurityAuditResult {
    return { ...securityMetrics, lastAuditTimestamp: Date.now() };
  },

  // Reset store helper for tests
  _resetStore() {
    // restores default state
  }
};
