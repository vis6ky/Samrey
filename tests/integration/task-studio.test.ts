/**
 * @license Apache-2.0
 * @gati/tests - Gati Task Studio Integration & External Consumer Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { signal, computed, effect, batch } from '../../packages/reactivity/src/index.js';
import { createForm, StandardSchemaV1 } from '../../packages/forms/src/index.js';
import { sanitizeHtmlString, sanitizeUri, safeJsonParse, escapeJsonStringForScript } from '../../packages/security/src/index.js';
import { createRouter } from '../../packages/router/src/index.js';
import { HttpClient } from '../../packages/http/src/index.js';
import { taskSchema } from '../../src/task-studio/components/TaskForm.js';
import { taskService } from '../../src/task-studio/api/task-service.js';
import {
  tasksState,
  loadTasks,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  toggleTaskStatusAction,
  setTaskFilter,
  setTaskCategory,
  setTaskPriority,
  setTaskSort,
  setTaskSearch,
  resetTaskFilters
} from '../../src/task-studio/state/tasks.store.js';
import { TaskItem, TaskFormValues } from '../../src/task-studio/types.js';

describe('Gati Task Studio - End-to-End Application & Consumer Audit', () => {
  it('1. Task Store State Initialization & Computed Stats', async () => {
    taskService.resetDatabase();
    resetTaskFilters();
    await loadTasks();

    const tasks = tasksState.tasks.value;
    assert.ok(tasks.length >= 6, `Expected at least 6 initial seed tasks, got ${tasks.length}`);

    const stats = tasksState.stats.value;
    assert.equal(stats.totalTasks, tasks.length);
    assert.equal(stats.completedTasks + stats.pendingTasks, stats.totalTasks);
    assert.ok(stats.completionPercentage >= 0 && stats.completionPercentage <= 100);
  });

  it('2. Filtering, Category, Priority, and Search Computations', async () => {
    taskService.resetDatabase();
    resetTaskFilters();
    await loadTasks();

    // Test Search
    setTaskSearch('topological');
    let filtered = tasksState.filteredTasks.value;
    assert.ok(filtered.length > 0, 'Search should find tasks matching "topological"');
    for (const t of filtered) {
      const match = t.title.toLowerCase().includes('topological') || t.description.toLowerCase().includes('topological');
      assert.ok(match, `Task ${t.id} must match search`);
    }

    // Reset search, test Priority Filter
    setTaskSearch('');
    setTaskPriority('urgent');
    filtered = tasksState.filteredTasks.value;
    for (const t of filtered) {
      assert.equal(t.priority, 'urgent');
    }

    // Test Status Filter (completed)
    setTaskPriority('all');
    setTaskFilter('completed');
    filtered = tasksState.filteredTasks.value;
    for (const t of filtered) {
      assert.equal(t.status, 'completed');
    }

    resetTaskFilters();
  });

  it('3. CRUD Operations & State Reactivity', async () => {
    taskService.resetDatabase();
    resetTaskFilters();
    await loadTasks();

    const initialCount = tasksState.tasks.value.length;

    // Create
    const newTaskValues: TaskFormValues = {
      title: 'Automated Test Task for Phase 16 Validation',
      description: 'Comprehensive test checking fine-grained push-pull propagation.',
      priority: 'urgent',
      category: 'engineering',
      dueDate: '2026-12-31'
    };

    const created = await createTaskAction(newTaskValues);
    assert.ok(created, 'Task creation action must succeed');
    assert.equal(tasksState.tasks.value.length, initialCount + 1);

    // Toggle Status
    const prevStatus = created.status;
    await toggleTaskStatusAction(created);
    const updated = tasksState.tasks.value.find((t) => t.id === created.id);
    assert.ok(updated);
    assert.notEqual(updated.status, prevStatus);

    // Update Fields
    await updateTaskAction(created.id, {
      title: 'Renamed Automated Test Task',
      description: 'Updated description.',
      priority: 'low',
      category: 'documentation',
      dueDate: '2027-01-01'
    });
    const modified = tasksState.tasks.value.find((t) => t.id === created.id);
    assert.equal(modified?.title, 'Renamed Automated Test Task');
    assert.equal(modified?.priority, 'low');

    // Delete
    await deleteTaskAction(created.id);
    assert.equal(tasksState.tasks.value.length, initialCount);
    assert.equal(tasksState.tasks.value.some((t) => t.id === created.id), false);
  });

  it('4. Standard Schema (~v1) Validation Integration', () => {
    // Valid input
    const valid = taskSchema['~standard'].validate({
      title: 'Valid Task Title',
      description: 'Valid description.',
      priority: 'high',
      category: 'security',
      dueDate: '2026-10-15'
    });
    assert.ok('value' in valid, 'Expected validation to succeed for valid payload');

    // Invalid input: Title too short
    const invalidShort = taskSchema['~standard'].validate({
      title: 'ab',
      priority: 'high',
      category: 'security',
      dueDate: '2026-10-15'
    });
    assert.ok('issues' in invalidShort, 'Expected validation issues for short title');

    // Invalid input: Bad date format
    const invalidDate = taskSchema['~standard'].validate({
      title: 'Good Title Here',
      priority: 'high',
      category: 'security',
      dueDate: '15/10/2026'
    });
    assert.ok('issues' in invalidDate, 'Expected validation issues for bad date format');
  });

  it('5. Security Defenses: XSS, Unsafe URIs, and Script Breakout', () => {
    // XSS Sanitizer
    const xssPayload = '<img src=x onerror=alert(1)><b>Safe</b><script>eval()</script>';
    const sanitizedHtml = sanitizeHtmlString(xssPayload);
    assert.ok(!sanitizedHtml.includes('<script>'), 'Must strip script tags');
    assert.ok(!sanitizedHtml.includes('onerror'), 'Must strip inline event handlers');
    assert.ok(sanitizedHtml.includes('<b>Safe</b>'), 'Must preserve safe tags');

    // URI Sanitizer
    assert.equal(sanitizeUri('javascript:alert(1)'), 'about:blank');
    assert.equal(sanitizeUri('data:text/html,<script>alert(1)</script>'), 'about:blank');
    assert.equal(sanitizeUri('https://example.com/safe'), 'https://example.com/safe');

    // Prototype Pollution
    const polluted = safeJsonParse('{"__proto__": {"polluted": true}, "name": "Safe"}');
    assert.equal((Object.prototype as any).polluted, undefined);
    assert.equal(polluted.name, 'Safe');

    // SSR Script Breakout Escaping
    const breakoutPayload = '{"comment": "</script><script>alert(1)</script>"}';
    const escaped = escapeJsonStringForScript(breakoutPayload);
    assert.ok(!escaped.includes('</script>'), 'Must escape script closing tags');
    assert.ok(escaped.includes('\\u003c/script\\u003e'), 'Must safely encode script tags');
  });

  it('6. Router Navigation & Parameter Extraction', () => {
    const routes = [
      { path: '/', component: () => 'dashboard' },
      { path: '/tasks', component: () => 'tasks' },
      { path: '/tasks/:id', component: () => 'task-detail' }
    ];

    const router = createRouter(routes, '/tasks');
    assert.equal(router.currentPath.value, '/tasks');

    router.navigate('/tasks/task-102');
    assert.equal(router.currentPath.value, '/tasks/task-102');
    assert.equal(router.currentParams.value.id, 'task-102');
  });
});
