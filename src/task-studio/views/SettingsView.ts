/**
 * @license Apache-2.0
 * @samrey/task-studio - Application Settings View
 */

import { el } from '@samrey/runtime';
import { settings, updateSettings, resetSettings } from '../state/settings.store.js';
import { taskService } from '../api/task-service.js';
import { loadTasks } from '../state/tasks.store.js';
import { addToast } from '../state/toast.store.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { TaskPriority, TaskCategory } from '../types.js';

export interface SettingsViewProps {
  onNavigate: (path: string) => void;
}

export function SettingsView(props: SettingsViewProps): HTMLElement {
  const container = el('div', { class: 'flex flex-col space-y-6 max-w-3xl mx-auto w-full select-none' });

  // 1. Header
  const header = el(
    'div',
    null,
    el('h1', { class: 'text-2xl font-extrabold text-slate-900 tracking-tight' }, 'Task Studio Settings'),
    el('p', { class: 'text-xs text-slate-500 mt-0.5' }, 'Configure runtime behavior, simulated latency, and local state persistence.')
  );
  container.appendChild(header);

  // 2. Network & Latency Simulation Card
  const networkCard = Card(
    {
      title: 'HTTP & Latency Simulation',
      subtitle: 'Simulate real-world asynchronous API latency and error handling'
    },
    el(
      'div',
      { class: 'space-y-4 text-xs' },
      // Latency Selector
      el(
        'div',
        { class: 'flex flex-col space-y-2' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Simulated Mock API Latency:'),
        el(
          'div',
          { class: 'flex flex-wrap gap-2' },
          ...[0, 100, 200, 500, 1000].map((ms) => {
            const isSelected = () => settings.value.mockLatencyMs === ms;
            return el(
              'button',
              {
                type: 'button',
                class: () => {
                  const sel = isSelected();
                  const base = 'px-3 py-1.5 rounded-lg border font-mono text-xs transition cursor-pointer';
                  if (sel) {
                    return `${base} bg-slate-900 text-white border-slate-900 font-bold`;
                  }
                  return `${base} bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100`;
                },
                onClick: () => {
                  updateSettings({ mockLatencyMs: ms });
                  addToast({
                    type: 'info',
                    title: 'Latency Updated',
                    message: `Mock latency set to ${ms}ms.`
                  });
                }
              },
              `${ms}ms`
            );
          })
        )
      ),

      // Error Simulation Toggle
      el(
        'div',
        { class: 'pt-3 border-t border-slate-100 flex items-center justify-between' },
        el(
          'div',
          null,
          el('span', { class: 'font-semibold text-slate-700 block' }, 'Simulate Backend Failure (50% Error Rate)'),
          el('span', { class: 'text-slate-400 text-[11px]' }, 'Inject random network errors to test error boundaries and retries.')
        ),
        el(
          'button',
          {
            type: 'button',
            class: () => {
              const active = settings.value.simulateErrors;
              return `w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                active ? 'bg-rose-600' : 'bg-slate-300'
              }`;
            },
            onClick: () => {
              const next = !settings.value.simulateErrors;
              updateSettings({ simulateErrors: next });
              addToast({
                type: next ? 'warning' : 'info',
                title: next ? 'Error Simulation Enabled' : 'Error Simulation Disabled',
                message: next ? 'Backend requests will now randomly fail.' : 'Backend requests will succeed normally.'
              });
            }
          },
          el('span', {
            class: () => {
              const active = settings.value.simulateErrors;
              return `absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                active ? 'translate-x-6' : ''
              }`;
            }
          })
        )
      )
    )
  );
  container.appendChild(networkCard);

  // 3. Defaults & Preferences Card
  const defaultsCard = Card(
    {
      title: 'Default Task Attributes',
      subtitle: 'Presets applied when composing new tasks'
    },
    el(
      'div',
      { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs' },
      el(
        'div',
        { class: 'flex flex-col space-y-1.5' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Default Priority'),
        el(
          'select',
          {
            class: 'px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg',
            value: () => settings.value.defaultPriority,
            onChange: (e: Event) => {
              updateSettings({ defaultPriority: (e.target as HTMLSelectElement).value as TaskPriority });
            }
          },
          el('option', { value: 'urgent' }, 'Urgent'),
          el('option', { value: 'high' }, 'High'),
          el('option', { value: 'medium' }, 'Medium'),
          el('option', { value: 'low' }, 'Low')
        )
      ),
      el(
        'div',
        { class: 'flex flex-col space-y-1.5' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Default Category'),
        el(
          'select',
          {
            class: 'px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg',
            value: () => settings.value.defaultCategory,
            onChange: (e: Event) => {
              updateSettings({ defaultCategory: (e.target as HTMLSelectElement).value as TaskCategory });
            }
          },
          el('option', { value: 'engineering' }, 'Engineering'),
          el('option', { value: 'architecture' }, 'Architecture'),
          el('option', { value: 'security' }, 'Security'),
          el('option', { value: 'design' }, 'Design'),
          el('option', { value: 'documentation' }, 'Documentation')
        )
      )
    )
  );
  container.appendChild(defaultsCard);

  // 4. Reset & Diagnostics Card
  const resetCard = Card(
    {
      title: 'Database & Environment Reset',
      subtitle: 'Restore seed data and reset all mock states'
    },
    el(
      'div',
      { class: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs' },
      el(
        'div',
        null,
        el('p', { class: 'text-slate-600 font-medium' }, 'Reset Mock Database to Seed State'),
        el('p', { class: 'text-slate-400 text-[11px]' }, 'Restores original sample tasks, clears caches, and resets timeline.')
      ),
      Button(
        {
          variant: 'danger',
          size: 'sm',
          onClick: async () => {
            taskService.resetDatabase();
            resetSettings();
            await loadTasks();
            addToast({
              type: 'info',
              title: 'Database Reset',
              message: 'Sample tasks have been restored to their initial seed state.'
            });
          }
        },
        'Reset Seed Data'
      )
    )
  );
  container.appendChild(resetCard);

  return container;
}
