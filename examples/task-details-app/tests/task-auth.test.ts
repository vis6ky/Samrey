/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Comprehensive Test Suite
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  currentSession,
  isAuthenticated,
  currentUser,
  currentCsrfToken,
  login,
  register,
  logout
} from '../src/auth.js';

import {
  tasks,
  selectedTaskId,
  selectedTask,
  filteredTasks,
  taskStats,
  createTask,
  updateTaskStatus,
  addSubtask,
  toggleSubtask,
  addComment,
  deleteTask,
  setStatusFilter,
  setSearchQuery,
  selectTask
} from '../src/state.js';

import {
  validateLoginForm,
  validateRegisterForm,
  validateTaskForm
} from '../src/forms.js';

import { validateCsrfToken } from '@samrey/security';

describe('Samrey Task & Authentication System Tests', () => {
  beforeEach(() => {
    logout();
    setStatusFilter('all');
    setSearchQuery('');
  });

  describe('1. Form Validation Schemas', () => {
    it('validates login form requirements', () => {
      const invalid = validateLoginForm({ email: 'bad', password: '123' });
      assert.strictEqual(invalid.isValid, false);
      assert.ok(invalid.errors.email);
      assert.ok(invalid.errors.password);

      const valid = validateLoginForm({ email: 'alex@samrey.dev', password: 'Password123!' });
      assert.strictEqual(valid.isValid, true);
      assert.strictEqual(Object.keys(valid.errors).length, 0);
    });

    it('validates registration form requirements and password confirmation', () => {
      const mismatched = validateRegisterForm({
        name: 'A',
        email: 'invalid-email',
        password: 'pass',
        confirmPassword: 'other'
      });
      assert.strictEqual(mismatched.isValid, false);
      assert.ok(mismatched.errors.name);
      assert.ok(mismatched.errors.email);
      assert.ok(mismatched.errors.password);
      assert.ok(mismatched.errors.confirmPassword);

      const valid = validateRegisterForm({
        name: 'Jane Doe',
        email: 'jane@samrey.dev',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      });
      assert.strictEqual(valid.isValid, true);
    });

    it('validates task creation form', () => {
      const empty = validateTaskForm({ title: '', description: '' });
      assert.strictEqual(empty.isValid, false);
      assert.ok(empty.errors.title);
      assert.ok(empty.errors.description);

      const valid = validateTaskForm({
        title: 'Complete security audit',
        description: 'Run automated vulnerability checkers'
      });
      assert.strictEqual(valid.isValid, true);
    });
  });

  describe('2. Authentication Workflows (Register, Login, Logout)', () => {
    it('authenticates seeded users and creates reactive session tokens', async () => {
      assert.strictEqual(isAuthenticated(), false);
      assert.strictEqual(currentUser(), null);

      const res = await login({
        email: 'alex@samrey.dev',
        password: 'Password123!'
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.session);
      assert.strictEqual(isAuthenticated(), true);
      assert.strictEqual(currentUser()?.email, 'alex@samrey.dev');
      assert.strictEqual(currentUser()?.role, 'admin');
      assert.ok(currentCsrfToken().length > 0);
      assert.strictEqual(validateCsrfToken(res.session!.csrfToken, currentCsrfToken()), true);
    });

    it('rejects invalid login credentials gracefully', async () => {
      const res = await login({
        email: 'alex@samrey.dev',
        password: 'WrongPassword!'
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(isAuthenticated(), false);
      assert.strictEqual(res.error, 'Invalid email or password.');
    });

    it('registers new accounts with automatic session provisioning', async () => {
      const randomEmail = `user-${Date.now()}@samrey.dev`;
      const regRes = await register({
        name: 'David Lightman',
        email: randomEmail,
        password: 'WargamesPassword123!'
      });

      assert.strictEqual(regRes.success, true);
      assert.strictEqual(regRes.user?.email, randomEmail);
      assert.strictEqual(isAuthenticated(), true);
      assert.strictEqual(currentUser()?.name, 'David Lightman');

      // Duplicate email registration should fail
      const dupRes = await register({
        name: 'Duplicate David',
        email: randomEmail,
        password: 'AnotherPassword!'
      });
      assert.strictEqual(dupRes.success, false);
      assert.strictEqual(dupRes.error, 'An account with this email address already exists.');
    });

    it('destroys active session on logout', async () => {
      await login({ email: 'alex@samrey.dev', password: 'Password123!' });
      assert.strictEqual(isAuthenticated(), true);

      logout();
      assert.strictEqual(isAuthenticated(), false);
      assert.strictEqual(currentUser(), null);
      assert.strictEqual(currentSession(), null);
      assert.strictEqual(currentCsrfToken(), '');
    });
  });

  describe('3. Task Details & Reactive State Operations', () => {
    beforeEach(async () => {
      await login({ email: 'alex@samrey.dev', password: 'Password123!' });
    });

    it('creates new tasks and updates reactive metrics and selection', () => {
      const initialCount = tasks().length;
      const initialStats = taskStats();

      const newTask = createTask({
        title: 'Setup Automated CI Pipeline',
        description: 'Configure GitHub Actions for package testing and release gating.',
        priority: 'high',
        dueDate: '2026-09-15',
        tags: ['DevOps', 'CI']
      });

      assert.strictEqual(tasks().length, initialCount + 1);
      assert.strictEqual(selectedTaskId(), newTask.id);
      assert.strictEqual(selectedTask()?.title, 'Setup Automated CI Pipeline');

      const updatedStats = taskStats();
      assert.strictEqual(updatedStats.total, initialStats.total + 1);
      assert.strictEqual(updatedStats.todo, initialStats.todo + 1);
    });

    it('transitions task status reactively and recalculates completion metrics', () => {
      const task = createTask({
        title: 'Benchmark Native Signal Propagation',
        description: 'Verify sub-microsecond reactive updates',
        priority: 'critical',
        dueDate: '2026-08-30'
      });

      assert.strictEqual(task.status, 'todo');

      // Update to in-progress
      updateTaskStatus(task.id, 'in-progress');
      let found = tasks().find(t => t.id === task.id);
      assert.strictEqual(found?.status, 'in-progress');

      // Update to completed
      updateTaskStatus(task.id, 'completed');
      found = tasks().find(t => t.id === task.id);
      assert.strictEqual(found?.status, 'completed');

      const stats = taskStats();
      assert.ok(stats.completed >= 1);
    });

    it('adds and toggles subtask checklist items', () => {
      const task = createTask({
        title: 'Implement Dark Mode Theme Engine',
        description: 'CSS variables and reactive theme signals',
        priority: 'medium',
        dueDate: '2026-09-20'
      });

      assert.strictEqual(task.subtasks.length, 0);

      addSubtask(task.id, 'Create CSS variables palette');
      addSubtask(task.id, 'Wire theme switcher button');

      const updated = tasks().find(t => t.id === task.id);
      assert.strictEqual(updated?.subtasks.length, 2);
      assert.strictEqual(updated?.subtasks[0].completed, false);
      assert.strictEqual(updated?.subtasks[1].completed, false);

      const subId = updated!.subtasks[0].id;
      toggleSubtask(task.id, subId);

      const afterToggle = tasks().find(t => t.id === task.id);
      assert.strictEqual(afterToggle?.subtasks[0].completed, true);
      assert.strictEqual(afterToggle?.subtasks[1].completed, false);
    });

    it('posts comments with XSS sanitization and author attribution', () => {
      const task = createTask({
        title: 'Sanitize User Submissions',
        description: 'Ensure malicious script tags are stripped',
        priority: 'high',
        dueDate: '2026-09-10'
      });

      // Post comment with potential XSS payload
      addComment(task.id, 'LGTM! <script>alert("xss")</script> Ready for merge.');

      const updated = tasks().find(t => t.id === task.id);
      assert.strictEqual(updated?.comments.length, 1);
      const cmt = updated!.comments[0];
      assert.strictEqual(cmt.authorName, 'Alex Mercer');
      assert.strictEqual(cmt.authorRole, 'admin');
      // Verify <script> tag is sanitized
      assert.strictEqual(cmt.content.includes('<script>'), false);
      assert.strictEqual(cmt.content.includes('LGTM!'), true);
    });

    it('filters tasks by status and search queries', () => {
      setStatusFilter('in-progress');
      const inProg = filteredTasks();
      inProg.forEach(t => assert.strictEqual(t.status, 'in-progress'));

      setStatusFilter('all');
      setSearchQuery('Migrate Core');
      const searchRes = filteredTasks();
      assert.ok(searchRes.length >= 1);
      assert.ok(searchRes[0].title.includes('Migrate Core'));
    });

    it('deletes tasks and updates selection fallback', () => {
      const task = createTask({
        title: 'Temporary Task to Delete',
        description: 'Testing deletion cycle',
        priority: 'low',
        dueDate: '2026-08-31'
      });

      selectTask(task.id);
      assert.strictEqual(selectedTaskId(), task.id);

      deleteTask(task.id);
      const exists = tasks().some(t => t.id === task.id);
      assert.strictEqual(exists, false);
      assert.notStrictEqual(selectedTaskId(), task.id);
    });
  });
});
