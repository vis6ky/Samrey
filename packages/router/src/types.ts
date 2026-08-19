/**
 * @license Apache-2.0
 * @aether/router - Types
 */

import { ReadonlySignal } from '@aether/reactivity';

export interface RouteRecord<TData = unknown> {
  path: string;
  component: () => unknown;
  loader?: (ctx: { params: Record<string, string>; query: URLSearchParams }) => Promise<TData> | TData;
}

export interface RouteMatch<TData = unknown> {
  route: RouteRecord<TData>;
  params: Record<string, string>;
  pathname: string;
}

export interface RouterInstance {
  currentPath: ReadonlySignal<string>;
  currentParams: ReadonlySignal<Record<string, string>>;
  navigate: (to: string) => void;
  match: (pathname: string) => RouteMatch | null;
}
