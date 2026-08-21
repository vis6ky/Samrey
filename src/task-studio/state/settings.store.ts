/**
 * @license Apache-2.0
 * @aether/task-studio - Reactive Application Settings Store
 */

import { signal, ReadonlySignal } from '@aether/reactivity';
import { AppSettings } from '../types.js';

const initialSettings: AppSettings = {
  mockLatencyMs: 200,
  simulateErrors: false,
  defaultPriority: 'medium',
  defaultCategory: 'engineering',
  storageMode: 'memory'
};

const settingsSignal = signal<AppSettings>(initialSettings);

export const settings: ReadonlySignal<AppSettings> = settingsSignal;

export function updateSettings(partial: Partial<AppSettings>): void {
  settingsSignal.value = {
    ...settingsSignal.value,
    ...partial
  };
}

export function resetSettings(): void {
  settingsSignal.value = { ...initialSettings };
}
