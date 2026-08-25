/**
 * @license Apache-2.0
 * @samrey/devtools - Owner & Effect Lifecycle Inspector
 */

import { samreyDevToolsBridge } from './bridge.js';

export interface InspectedOwner {
  id: string;
  parentId?: string;
  effectsCount: number;
  cleanupsCount: number;
  disposed: boolean;
  createdAt: number;
  disposedAt?: number;
}

export interface InspectedEffect {
  id: string;
  ownerId?: string;
  name?: string;
  runCount: number;
  lastExecutionMs?: number;
  dependencies: string[];
}

export class OwnerInspector {
  private owners = new Map<string, InspectedOwner>();
  private effects = new Map<string, InspectedEffect>();

  registerOwner(id: string, parentId?: string): void {
    const owner: InspectedOwner = {
      id,
      parentId,
      effectsCount: 0,
      cleanupsCount: 0,
      disposed: false,
      createdAt: Date.now()
    };
    this.owners.set(id, owner);
    samreyDevToolsBridge.emit('owner:create', owner);
  }

  disposeOwner(id: string): void {
    const owner = this.owners.get(id);
    if (!owner) return;

    owner.disposed = true;
    owner.disposedAt = Date.now();
    samreyDevToolsBridge.emit('owner:dispose', { id, disposedAt: owner.disposedAt });
  }

  recordEffectRun(effectId: string, ownerId?: string, durationMs?: number, name?: string): void {
    let effect = this.effects.get(effectId);
    if (!effect) {
      effect = {
        id: effectId,
        ownerId,
        name,
        runCount: 0,
        dependencies: []
      };
      this.effects.set(effectId, effect);

      if (ownerId && this.owners.has(ownerId)) {
        this.owners.get(ownerId)!.effectsCount++;
      }
    }

    effect.runCount++;
    effect.lastExecutionMs = durationMs;
    samreyDevToolsBridge.emit('effect:run', effect);
  }

  getOwners(): InspectedOwner[] {
    return Array.from(this.owners.values());
  }

  getEffects(): InspectedEffect[] {
    return Array.from(this.effects.values());
  }

  clear(): void {
    this.owners.clear();
    this.effects.clear();
  }
}

export const defaultOwnerInspector = new OwnerInspector();
