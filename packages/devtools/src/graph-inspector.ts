/**
 * @license Apache-2.0
 * @aether/devtools - Reactive Graph Topology Inspector
 */

export interface InspectedSignalNode {
  id: string;
  name?: string;
  value: unknown;
  subscribersCount: number;
}

export class GraphInspector {
  private trackedNodes = new Map<string, InspectedSignalNode>();

  registerNode(node: InspectedSignalNode): void {
    this.trackedNodes.set(node.id, node);
  }

  getSnapshot(): InspectedSignalNode[] {
    return Array.from(this.trackedNodes.values());
  }

  clear(): void {
    this.trackedNodes.clear();
  }
}

export const defaultGraphInspector = new GraphInspector();
