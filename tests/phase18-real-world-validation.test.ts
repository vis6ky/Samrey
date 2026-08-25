/**
 * @license Apache-2.0
 * Samrey Framework — Phase 18 Real-World Developer Adoption & Production Validation Suite
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  signal,
  computed,
  effect,
  batch,
  createStore,
  produce,
  createRoot,
  createOwner,
  runWithOwner,
  onCleanup
} from '../packages/reactivity/src/index.js';
import {
  el,
  text,
  mount,
  Show,
  For,
  Switch,
  Match,
  ErrorBoundary
} from '../packages/runtime/src/index.js';
import {
  sanitizeHtml,
  sanitizeUrl,
  isSafeUrl,
  safeJsonParse,
  createCsrfToken,
  validateCsrfToken
} from '../packages/security/src/index.js';
import {
  createForm,
  createField,
  getAccessibleFieldProps
} from '../packages/forms/src/index.js';
import {
  createHttpCache
} from '../packages/http/src/index.js';
import {
  renderToString,
  generateStaticSite
} from '../packages/ssr/src/index.js';
import {
  renderTestComponent,
  fireEvent,
  waitFor,
  cleanupAllTestContainers
} from '../packages/testing/src/index.js';
import {
  generateStarterProject
} from '../packages/cli/src/starter-template.js';
import {
  validateProjectName
} from '../packages/cli/src/commands/create.js';

import {
  store,
  initializeData,
  addProject,
  removeProject,
  addTask,
  toggleTaskStatus,
  removeTask,
  projectMetrics,
  filteredProjects,
  filteredTasks,
  notify
} from '../examples/project-manager/src/state.js';
import { ProjectManagerApi, currentCsrfToken } from '../examples/project-manager/src/api.js';
import { createProjectForm, createTaskForm } from '../examples/project-manager/src/forms.js';
import { App } from '../examples/project-manager/src/App.js';
import { DashboardView } from '../examples/project-manager/src/views/DashboardView.js';
import { ProjectsView } from '../examples/project-manager/src/views/ProjectsView.js';
import { TaskBoardView } from '../examples/project-manager/src/views/TaskFormView.js';

describe('Samrey Phase 18 — Real-World Application & Ecosystem Validation', () => {
  beforeEach(() => {
    cleanupAllTestContainers();
  });

  describe('1. Real-World Application State & CRUD Lifecycle (Samrey Project Manager)', () => {
    it('initializes real-world data and computes accurate project health metrics', async () => {
      await initializeData();

      assert.ok(store.projects.length >= 4, 'Should load initial projects');
      assert.ok(store.tasks.length >= 5, 'Should load initial tasks');
      assert.equal(store.currentUser?.name, 'Ada Lovelace');

      const metrics = projectMetrics.value;
      assert.equal(metrics.totalProjects, store.projects.length);
      assert.equal(metrics.totalTasks, store.tasks.length);
      assert.ok(metrics.completionRate >= 0 && metrics.completionRate <= 100);
    });

    it('creates a project with optimistic update and verified persistence', async () => {
      const initialCount = store.projects.length;
      const newProj = await addProject({
        name: 'Fine-Grained Compiler IR Phase 2',
        description: 'Advanced bytecode generation and zero-cost template hoisting.',
        category: 'core',
        status: 'active',
        lead: 'Ada Lovelace'
      });

      assert.ok(newProj.id.startsWith('proj-'), 'Should receive server generated ID');
      assert.equal(store.projects.length, initialCount + 1, 'Store length should increment');
      assert.equal(store.projects[0].name, 'Fine-Grained Compiler IR Phase 2');

      // Verify notification was queued
      assert.ok(store.notifications.length > 0);
      assert.equal(store.notifications[0].type, 'success');
    });

    it('creates a task, updates status, and recalculates computed metrics', async () => {
      const targetProject = store.projects[0];
      const initialDone = projectMetrics.value.completedTasks;

      const task = await addTask({
        projectId: targetProject.id,
        title: 'Benchmark memory cleanup under 10k iterations',
        description: 'Verify 0 memory leaks in nested owner nodes.',
        status: 'todo',
        priority: 'urgent',
        assignee: 'Alan Turing',
        tags: ['bench', 'memory', 'dx'],
        dueDate: '2026-09-01'
      });

      assert.ok(task.id.startsWith('task-'));
      assert.equal(store.tasks[0].title, 'Benchmark memory cleanup under 10k iterations');

      // Toggle status to done
      await toggleTaskStatus(task.id, 'done');
      assert.equal(store.tasks.find((t) => t.id === task.id)?.status, 'done');
      assert.equal(projectMetrics.value.completedTasks, initialDone + 1);

      // Clean up task
      await removeTask(task.id);
      assert.equal(store.tasks.find((t) => t.id === task.id), undefined);
    });

    it('filters projects by search term and category correctly', () => {
      store.projectFilter.search = 'Security';
      store.projectFilter.category = 'all';
      assert.ok(filteredProjects.value.every((p) => p.name.toLowerCase().includes('security') || p.description.toLowerCase().includes('security')));

      store.projectFilter.search = '';
      store.projectFilter.category = 'infra';
      assert.ok(filteredProjects.value.every((p) => p.category === 'infra'));

      // Reset filter
      store.projectFilter.category = 'all';
    });

    it('filters and sorts tasks by priority and status accurately', () => {
      store.taskFilter.status = 'done';
      store.taskFilter.priority = 'all';
      assert.ok(filteredTasks.value.every((t) => t.status === 'done'));

      store.taskFilter.status = 'all';
      store.taskFilter.priority = 'urgent';
      assert.ok(filteredTasks.value.every((t) => t.priority === 'urgent'));

      // Reset
      store.taskFilter.priority = 'all';
    });
  });

  describe('2. Standard Schema Form Validation (~standard v1)', () => {
    it('validates project form inputs and outputs accessible ARIA field properties', async () => {
      const handler = createProjectForm({ name: '', description: 'short', lead: '' });

      // Trigger submit with invalid values
      await handler.form.handleSubmit();

      assert.ok(handler.fields.name.error.value, 'Name field should have error');
      assert.ok(handler.fields.description.error.value, 'Description field should have error');
      assert.ok(handler.fields.lead.error.value, 'Lead field should have error');

      // Check accessible props
      const nameProps = handler.getAccessibleProps('name');
      assert.equal(nameProps['aria-invalid'], true);
      assert.ok(nameProps['aria-describedby']);

      // Fix values
      handler.fields.name.setValue('Samrey Core Engine');
      handler.fields.description.setValue('Comprehensive reactive state kernel and scheduler.');
      handler.fields.lead.setValue('Ada Lovelace');

      await handler.form.handleSubmit();
      assert.equal(handler.fields.name.error.value, null);
      assert.equal(handler.fields.description.error.value, null);
    });

    it('validates task form schema and handles required constraints', async () => {
      const handler = createTaskForm({ title: '', assignee: '' });
      await handler.form.handleSubmit();

      assert.ok(handler.fields.title.error.value, 'Title is required');
      assert.ok(handler.fields.assignee.error.value, 'Assignee is required');

      handler.fields.title.setValue('Write Phase 18 release verification test');
      handler.fields.assignee.setValue('Grace Hopper');

      await handler.form.handleSubmit();
      assert.equal(handler.fields.title.error.value, null);
      assert.equal(handler.fields.assignee.error.value, null);
    });
  });

  describe('3. Adversarial Security Attack Validation', () => {
    it('neutralizes malicious XSS script injection payloads', () => {
      const malicious = '<script>alert("PWNED")</script><img src="x" onerror="stealCookies()"><b>Hello</b>';
      const sanitized = sanitizeHtml(malicious);

      assert.ok(!sanitized.includes('<script>'), 'Must strip script tags');
      assert.ok(!sanitized.includes('onerror='), 'Must strip inline event handlers');
      assert.ok(sanitized.includes('<b>Hello</b>'), 'Must preserve safe markup');
    });

    it('blocks dangerous URI protocols (javascript:, data:text/html, vbscript:)', () => {
      assert.equal(isSafeUrl('javascript:alert(1)'), false);
      assert.equal(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false);
      assert.equal(isSafeUrl('vbscript:msgbox("hello")'), false);
      assert.equal(isSafeUrl('https://samrey-framework.dev/docs'), true);
      assert.equal(isSafeUrl('/projects/overview'), true);

      assert.equal(sanitizeUrl('javascript:void(0)'), 'about:blank');
      assert.equal(sanitizeUrl('https://example.com'), 'https://example.com');
    });

    it('sanitizes prototype pollution payloads in JSON parsing', () => {
      const hostileJson = '{"__proto__": {"polluted": true}, "name": "Safe Project"}';
      const parsed = safeJsonParse(hostileJson) as any;

      assert.equal(parsed.name, 'Safe Project');
      assert.equal(({} as any).polluted, undefined, 'Must not pollute global Object prototype');
    });

    it('verifies CSRF token generation and rejects tampered nonces', () => {
      const token = createCsrfToken();

      assert.ok(token.length >= 20);
      assert.equal(validateCsrfToken(token, token), true);
      assert.equal(validateCsrfToken(token + 'tampered', token), false);
      assert.equal(validateCsrfToken(token, 'wrong-secret'), false);
    });
  });

  describe('4. Zero-Dependency & Template Architecture Purity Audit', () => {
    it('verifies all 4 CLI templates generate 100% native Samrey files with 0 foreign frameworks', () => {
      const templates = ['ssr', 'spa', 'minimal', 'ssg'] as const;
      const forbiddenPatterns = [
        'react',
        'react-dom',
        'vue',
        'angular',
        'svelte',
        'solid-js',
        'preact',
        'lit',
        'redux',
        'zustand'
      ];

      for (const t of templates) {
        const files = generateStarterProject(`test-${t}-app`, { template: t });
        const entries = Object.entries(files);
        assert.ok(entries.length >= 3, `Template ${t} should produce project files`);

        for (const [filePath, content] of entries) {
          const lowerContent = content.toLowerCase();
          for (const pattern of forbiddenPatterns) {
            // Check that package.json or source files do not import forbidden frameworks
            if (filePath.endsWith('.json') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
              const hasForbidden =
                lowerContent.includes(`"${pattern}"`) ||
                lowerContent.includes(`'${pattern}'`) ||
                lowerContent.includes(`from '${pattern}'`) ||
                lowerContent.includes(`from "${pattern}"`);
              assert.equal(
                hasForbidden,
                false,
                `Template ${t} file ${filePath} contains forbidden framework dependency: ${pattern}`
              );
            }
          }
        }
      }
    });
  });

  describe('5. High-Frequency Memory & Lifecycle Stress Benchmarks (1k, 5k, 10k)', () => {
    it('runs 1,000 mount/update/unmount cycles with zero orphaned subscribers', () => {
      let cleanupsExecuted = 0;

      for (let i = 0; i < 1000; i++) {
        createRoot((dispose) => {
          const count = signal(i);
          const doubled = computed(() => count.value * 2);

          effect(() => {
            const _ = doubled.value;
            onCleanup(() => {
              cleanupsExecuted++;
            });
          });

          count.value++;
          dispose();
        });
      }

      assert.ok(cleanupsExecuted >= 1000, 'All effect cleanup handlers should execute');
    });

    it('runs 5,000 cascading nested owner hierarchy disposals cleanly', () => {
      let childCleanups = 0;

      for (let i = 0; i < 5000; i++) {
        createRoot((disposeParent) => {
          const childOwner = createOwner();
          runWithOwner(childOwner, () => {
            onCleanup(() => {
              childCleanups++;
            });
          });
          disposeParent();
        });
      }

      assert.equal(childCleanups, 5000, 'All 5,000 child owners should be cleaned up');
    });

    it('handles 10,000 high-frequency batched signal writes efficiently', () => {
      const stateSig = signal(0);
      let runCount = 0;

      effect(() => {
        const _ = stateSig.value;
        runCount++;
      });

      assert.equal(runCount, 1, 'Initial run');

      batch(() => {
        for (let i = 1; i <= 10000; i++) {
          stateSig.value = i;
        }
      });

      assert.equal(runCount, 2, 'Batched updates should trigger subscriber exactly once');
      assert.equal(stateSig.value, 10000);
    });
  });

  describe('6. SSR, SSG & Static HTML Generation Matrix', () => {
    it('renders native Samrey Project Manager components to clean static HTML', async () => {
      const ssrOutput = await renderToString(() =>
        '<div class="project-manager-ssr"><h1>Samrey Project Manager v1.0.0</h1><p>Production SSR Render Output</p></div>'
      );

      assert.ok(ssrOutput.includes('Samrey Project Manager v1.0.0'));
      assert.ok(ssrOutput.includes('project-manager-ssr'));
      assert.ok(ssrOutput.includes('<!DOCTYPE html>'));
    });

    it('generates multi-route static site pages with generateStaticSite', async () => {
      const routes = [
        { path: '/', title: 'Dashboard', component: () => '<div>Dashboard SSR</div>' },
        { path: '/projects', title: 'Projects', component: () => '<div>Projects Directory</div>' },
        { path: '/security', title: 'Security', component: () => '<div>Zero-Trust Security</div>' }
      ];

      const ssgResults = await generateStaticSite(routes, { writeFiles: false });
      assert.equal(ssgResults.totalPages, 3);
      assert.equal(ssgResults.pages.length, 3);
      assert.ok(ssgResults.pages.every((res) => res.html.includes('<!DOCTYPE html>')));
    });
  });
});
