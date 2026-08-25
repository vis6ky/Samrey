/**
 * @license Apache-2.0
 * @samrey/devtools - Component Hierarchy & Tree Inspector
 */

import { aetherDevToolsBridge } from './bridge.js';
import { sanitizePayload } from './sanitizer.js';

export interface InspectedComponent {
  id: string;
  name: string;
  parentId?: string;
  props: Record<string, unknown>;
  renderCount: number;
  mountTime: number;
  lastUpdateTime?: number;
  childrenIds: string[];
}

export class ComponentInspector {
  private components = new Map<string, InspectedComponent>();

  registerComponent(component: Omit<InspectedComponent, 'renderCount' | 'mountTime' | 'childrenIds'>): void {
    const existing = this.components.get(component.id);
    const safeProps = sanitizePayload(component.props) as Record<string, unknown>;

    if (existing) {
      existing.name = component.name;
      existing.props = safeProps;
      existing.renderCount++;
      existing.lastUpdateTime = Date.now();
      aetherDevToolsBridge.emit('component:update', existing);
      return;
    }

    const node: InspectedComponent = {
      id: component.id,
      name: component.name,
      parentId: component.parentId,
      props: safeProps,
      renderCount: 1,
      mountTime: Date.now(),
      childrenIds: []
    };

    this.components.set(node.id, node);

    if (node.parentId && this.components.has(node.parentId)) {
      const parent = this.components.get(node.parentId)!;
      if (!parent.childrenIds.includes(node.id)) {
        parent.childrenIds.push(node.id);
      }
    }

    aetherDevToolsBridge.emit('component:mount', node);
  }

  unmountComponent(id: string): void {
    const comp = this.components.get(id);
    if (!comp) return;

    if (comp.parentId && this.components.has(comp.parentId)) {
      const parent = this.components.get(comp.parentId)!;
      parent.childrenIds = parent.childrenIds.filter((childId) => childId !== id);
    }

    this.components.delete(id);
    aetherDevToolsBridge.emit('component:unmount', { id, name: comp.name });
  }

  getComponent(id: string): InspectedComponent | undefined {
    return this.components.get(id);
  }

  getTree(): InspectedComponent[] {
    return Array.from(this.components.values());
  }

  getRootComponents(): InspectedComponent[] {
    return Array.from(this.components.values()).filter((c) => !c.parentId);
  }

  clear(): void {
    this.components.clear();
  }
}

export const defaultComponentInspector = new ComponentInspector();
