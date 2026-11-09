/**
 * @license Apache-2.0
 * @samrey/runtime - Ambient Module Declarations for .samrey Templates
 */

declare module '*.samrey' {
  const template: (props?: any, scope?: any) => HTMLElement | DocumentFragment;
  export default template;
}
