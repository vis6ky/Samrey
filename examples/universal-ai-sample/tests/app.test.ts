/**
 * @license Apache-2.0
 * Universal AI Sample Application Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ensureMockDom } from '@samrey/ai';
import { signal } from '@samrey/reactivity';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { Header } from '../src/components/Header.js';
import { MetricsDashboard } from '../src/components/MetricsDashboard.js';
import { TaskList, Task } from '../src/components/TaskList.js';
import { TaskForm } from '../src/components/TaskForm.js';
import { UserProfile } from '../src/components/UserProfile.js';
import { App } from '../src/App.js';
import { renderApp } from '../src/server.js';

describe('Universal AI Sample Application Suite', () => {
  beforeEach(() => {
    ensureMockDom();
  });

  describe('Header Component', () => {
    it('initializes with default light theme and toggles reactively', async () => {
      const { container, unmount } = renderTest(() => Header({ initialTheme: 'light' }));
      const root = container as any;

      const headerEl = root.querySelector('.app-header') || root;
      const badge = root.querySelector('.theme-badge');
      const btn = root.querySelector('.btn-theme');

      assert.ok(badge.textContent.includes('LIGHT'), 'Initial theme badge must show LIGHT');
      assert.equal(headerEl.getAttribute('data-theme'), 'light');

      // Click toggle
      fireEvent(btn, 'click');
      await flushReactivity();

      assert.ok(badge.textContent.includes('DARK'), 'Toggled theme badge must show DARK');
      assert.equal(headerEl.getAttribute('data-theme'), 'dark');

      unmount();
    });
  });

  describe('MetricsDashboard Component', () => {
    it('manages reactive counters, derived values, and batched updates', async () => {
      const { container, unmount } = renderTest(() => MetricsDashboard({ initial: 5 }));
      const root = container as any;

      const valCount = root.querySelector('.val-count');
      const valDouble = root.querySelector('.val-double');
      const btnInc = root.querySelector('.btn-inc');
      const btnDec = root.querySelector('.btn-dec');
      const btnBatch = root.querySelector('.btn-batch');
      const btnReset = root.querySelector('.btn-reset');

      assert.equal(valCount.textContent, '5');
      assert.equal(valDouble.textContent, '10');

      // 1. Increment
      fireEvent(btnInc, 'click');
      await flushReactivity();
      assert.equal(valCount.textContent, '6');
      assert.equal(valDouble.textContent, '12');

      // 2. Decrement
      fireEvent(btnDec, 'click');
      await flushReactivity();
      assert.equal(valCount.textContent, '5');
      assert.equal(valDouble.textContent, '10');

      // 3. Batched mutation (+10)
      fireEvent(btnBatch, 'click');
      await flushReactivity();
      assert.equal(valCount.textContent, '15');
      assert.equal(valDouble.textContent, '30');

      // 4. Reset
      fireEvent(btnReset, 'click');
      await flushReactivity();
      assert.equal(valCount.textContent, '0');
      assert.equal(valDouble.textContent, '0');

      unmount();
    });
  });

  describe('TaskList Component', () => {
    it('renders keyed list and executes immutable mutations', async () => {
      const tasks = signal<Task[]>([
        { id: 1, title: 'Test Item 1', completed: false, priority: 'medium' },
        { id: 2, title: 'Test Item 2', completed: true, priority: 'high' }
      ]);

      const { container, unmount } = renderTest(() => TaskList({ tasks }));
      const root = container as any;

      const countEl = root.querySelector('.task-count');
      assert.equal(countEl.textContent, '2');

      let items = root.querySelectorAll('.task-item');
      assert.equal(items.length, 2);

      // Remove second item
      const removeBtns = root.querySelectorAll('.btn-remove');
      assert.equal(removeBtns.length, 2);
      fireEvent(removeBtns[1], 'click');
      await flushReactivity();

      assert.equal(tasks.value.length, 1);
      assert.equal(countEl.textContent, '1');

      unmount();
    });
  });

  describe('TaskForm Component', () => {
    it('validates required fields and adds new tasks upon valid submission', async () => {
      const tasks = signal<Task[]>([]);
      const { container, unmount } = renderTest(() => TaskForm({ tasks }));
      const root = container as any;

      const formEl = root.querySelector('.task-form') || root;
      const titleInput = root.querySelector('.input-title');
      const titleError = root.querySelector('.title-error');
      const submitBtn = root.querySelector('.btn-submit');

      // 1. Submit with empty input
      fireEvent(formEl, 'submit');
      await flushReactivity();

      assert.ok(
        titleError.textContent.includes('required'),
        'Expected empty title validation error'
      );
      assert.equal(tasks.value.length, 0);

      // 2. Input valid title and submit
      titleInput.value = 'Production Samrey Task';
      fireEvent(titleInput, 'input');
      await flushReactivity();

      fireEvent(formEl, 'submit');
      await flushReactivity();

      assert.equal(titleError.textContent, '');
      assert.equal(tasks.value.length, 1);
      assert.equal(tasks.value[0].title, 'Production Samrey Task');

      unmount();
    });
  });

  describe('UserProfile Component', () => {
    it('handles asynchronous resource loading and renders user details', async () => {
      const mockFetch = async () => ({
        id: 'mock-1',
        name: 'Grace Hopper',
        role: 'Computer Scientist',
        email: 'grace@navy.mil',
        status: 'active' as const
      });

      const { container, unmount } = renderTest(() => UserProfile({ fetcher: mockFetch }));
      const root = container as any;

      // Allow async fetch to settle
      await new Promise((r) => setTimeout(r, 80));
      await flushReactivity();

      const userName = root.querySelector('.user-name');
      assert.ok(userName, 'User name element should be present');
      assert.equal(userName.textContent, 'Grace Hopper');

      unmount();
    });
  });

  describe('App Shell & Client Router', () => {
    it('renders application layout and routes', async () => {
      const { container, unmount } = renderTest(() => App({ initialPath: '/' }));
      const root = container as any;

      const header = root.querySelector('.app-header');
      const main = root.querySelector('.main-content');
      const outlet = root.querySelector('.samrey-router-outlet');

      assert.ok(header, 'Header must be mounted');
      assert.ok(main, 'Main content area must be mounted');
      assert.ok(outlet, 'Router outlet must be mounted');

      unmount();
    });
  });

  describe('Server-Side Rendering (SSR)', () => {
    it('renders static HTML string with renderToString', async () => {
      const html = await renderApp('/');

      assert.ok(html.includes('<!DOCTYPE html>'), 'Must produce full DOCTYPE document');
      assert.ok(html.includes('Samrey AI Verification App'), 'Must render application title in SSR output');
      assert.ok(html.includes('<div id="app">'), 'Must contain client hydration anchor');
      assert.ok(html.includes('Theme: LIGHT'), 'Must contain initial theme state');
    });
  });
});
