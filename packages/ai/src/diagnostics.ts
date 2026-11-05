/**
 * @license Apache-2.0
 * @samrey/ai - Diagnostic & Error Repair Engine
 */

import { ERROR_REGISTRY, SamreyErrorCode, ErrorDefinition } from '@samrey/compiler';

export interface DiagnosticDiagnosis {
  code?: string;
  title: string;
  explanation: string;
  suggestion: string;
  suggestedFix?: string;
  documentationLink?: string;
}

export function diagnoseError(errorMessage: string, sourceCode?: string): DiagnosticDiagnosis {
  const msg = errorMessage || '';

  // 1. Check for SAMREY-XXX error code in message
  const codeMatch = msg.match(/SAMREY-\d{3}/i) || msg.match(/AETH-\d{3}/i);
  if (codeMatch) {
    const rawCode = codeMatch[0].toUpperCase();
    const normalizedCode = rawCode.replace('AETH-', 'SAMREY-') as SamreyErrorCode;
    const def = ERROR_REGISTRY[normalizedCode] || ERROR_REGISTRY[rawCode];

    if (def) {
      return {
        code: def.code,
        title: def.title,
        explanation: def.defaultExplanation,
        suggestion: def.defaultSuggestion,
        suggestedFix: generateQuickFix(def.code, sourceCode, msg),
        documentationLink: `https://github.com/vis6ky/Samrey#${def.code.toLowerCase()}`
      };
    }
  }

  // 2. React Hooks in Samrey error
  if (msg.includes('useState') || msg.includes('useEffect') || msg.includes('React hook')) {
    return {
      title: 'Foreign React Hook Usage in Samrey',
      explanation: 'React hooks rely on a Virtual DOM re-rendering runtime with component call stack ordering. Samrey uses compile-time static template hoisting and fine-grained signals.',
      suggestion: 'Replace useState() with signal(), and useEffect() with effect() from @samrey/reactivity.',
      suggestedFix: `// Instead of: const [count, setCount] = useState(0);\nimport { signal } from '@samrey/reactivity';\nconst count = signal(0);\ncount.value++;`
    };
  }

  // 3. Stale closure or missing .value
  if (msg.includes('is not a function') && msg.includes('signal')) {
    return {
      title: 'Signal Invocation as Function',
      explanation: 'In Samrey, signals are not getter functions (like in Solid). Signals are objects with a .value accessor.',
      suggestion: 'Access the signal value using ".value" instead of calling it as a function "()".',
      suggestedFix: `// Replace count() with count.value`
    };
  }

  // 4. Default fallback diagnosis
  return {
    title: 'General Samrey Error',
    explanation: msg,
    suggestion: 'Verify that all reactive state uses @samrey/reactivity primitives and all DOM templates follow Samrey syntax.',
    documentationLink: 'https://github.com/vis6ky/Samrey'
  };
}

function generateQuickFix(code: string, sourceCode?: string, errorMsg?: string): string | undefined {
  if (code === 'SAMREY-108') {
    // Show / For as template tag
    return `// In Samrey, Show and For are component functions, NOT template markup.\n// Replace <Show when={...}>...</Show> with:\nShow({\n  when: () => condition.value,\n  children: () => ActiveContent(),\n  fallback: () => FallbackContent()\n});`;
  }

  if (code === 'SAMREY-101') {
    // Unclosed tag
    const tagMatch = errorMsg?.match(/tag\s+<([a-zA-Z0-9_-]+)>/i);
    if (tagMatch) {
      return `Add closing </${tagMatch[1]}> tag or self-close <${tagMatch[1]} />.`;
    }
    return 'Ensure all opening HTML tags have corresponding closing tags.';
  }

  if (code === 'SAMREY-102') {
    // Unterminated expression
    return 'Add a matching closing brace "}" to terminate the interpolation expression.';
  }

  return undefined;
}

export const diagnoseCompilerError = diagnoseError;

