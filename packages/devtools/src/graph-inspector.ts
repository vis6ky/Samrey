/**
 * @license Apache-2.0
 * @samrey/devtools - Reactive Graph Topology & Signal Inspector
 */

import { samreyDevToolsBridge } from './bridge.js';
import { sanitizePayload } from './sanitizer.js';

export interface InspectedSignalNode {
  id: string;
  name?: string;
  kind?: 'signal' | 'computed' | 'memo' | 'resource';
  value: unknown;
  subscribersCount: number;
  dependenciesCount?: number;
  updatedAt?: number;
}

export class GraphInspector {
  private trackedNodes = new Map<string, InspectedSignalNode>();

  registerNode(node: InspectedSignalNode): void {
    const safeNode: InspectedSignalNode = {
      ...node,
      value: sanitizePayload(node.value),
      updatedAt: Date.now()
    };

    const isNew = !this.trackedNodes.has(node.id);
    this.trackedNodes.set(node.id, safeNode);

    samreyDevToolsBridge.emit(isNew ? 'signal:create' : 'signal:update', safeNode);
  }

  updateNodeValue(id: string, rawValue: unknown, subscribersCount?: number): void {
    const node = this.trackedNodes.get(id);
    if (!node) return;

    node.value = sanitizePayload(rawValue);
    if (typeof subscribersCount === 'number') {
      node.subscribersCount = subscribersCount;
    }
    node.updatedAt = Date.now();

    samreyDevToolsBridge.emit('signal:update', node);
  }

  getNode(id: string): InspectedSignalNode | undefined {
    return this.trackedNodes.get(id);
  }

  getSnapshot(): InspectedSignalNode[] {
    return Array.from(this.trackedNodes.values());
  }

  clear(): void {
    this.trackedNodes.clear();
  }
}

export const defaultGraphInspector = new GraphInspector();
