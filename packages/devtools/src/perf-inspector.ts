/**
 * @license Apache-2.0
 * @samrey/devtools - Performance & Render Timings Inspector
 */

import { samreyDevToolsBridge } from './bridge.js';

export interface InspectedPerfMetric {
  name: string;
  durationMs: number;
  category: 'render' | 'effect' | 'batch' | 'hydration' | 'network';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceInspector {
  private metrics: InspectedPerfMetric[] = [];
  private maxMetrics = 200;

  recordMetric(name: string, durationMs: number, category: InspectedPerfMetric['category'], metadata?: Record<string, unknown>): void {
    const metric: InspectedPerfMetric = {
      name,
      durationMs,
      category,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    samreyDevToolsBridge.emit('perf:measure', metric);
  }

  getMetrics(category?: InspectedPerfMetric['category']): InspectedPerfMetric[] {
    if (category) {
      return this.metrics.filter((m) => m.category === category);
    }
    return this.metrics;
  }

  getAverageDuration(category?: InspectedPerfMetric['category']): number {
    const subset = this.getMetrics(category);
    if (subset.length === 0) return 0;
    const sum = subset.reduce((acc, m) => acc + m.durationMs, 0);
    return sum / subset.length;
  }

  clear(): void {
    this.metrics.length = 0;
  }
}

export const defaultPerformanceInspector = new PerformanceInspector();
