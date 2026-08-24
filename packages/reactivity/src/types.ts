/**
 * @license Apache-2.0
 * @aether/reactivity - Types & Core Interfaces
 */

export interface ReactiveNode {
  version: number;
  isDirty: boolean;
  cleanups?: (() => void)[];
}

export interface Subscriber extends ReactiveNode {
  notify(clock: number): void;
  update(): void;
  sources: Set<Dependency>;
}

export interface Dependency extends ReactiveNode {
  subscribers: Set<Subscriber>;
}

export interface Signal<T> {
  (): T;
  value: T;
  set(newValue: T | ((prev: T) => T)): void;
}

export interface ReadonlySignal<T> {
  (): T;
  readonly value: T;
}

export interface Context<T> {
  readonly id: symbol;
  readonly defaultValue?: T;
  Provider(props: { value: T; children: any }): any;
}

export interface Owner {
  parent: Owner | null;
  children: Owner[];
  cleanups: (() => void)[];
  context?: Record<string | symbol, unknown>;
  dispose(): void;
}
