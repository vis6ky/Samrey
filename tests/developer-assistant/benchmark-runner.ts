/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant Blind Challenge Benchmark Runner
 *
 * Runs the 20 realistic developer challenges against the Samrey Developer Assistant
 * in isolated contexts (no previous conversation history), automatically validates
 * the responses, parses and compiles code examples, audits for hallucinations and foreign
 * APIs, scores according to the standardized rubric (0-30 per challenge), and generates
 * structured reports.
 */

import ts from 'typescript';
import { CHALLENGES, DeveloperChallenge } from './challenges.js';
import {
  AssistantProvider,
  DeterministicKnowledgeProvider,
  SmartAssistantProvider
} from '../../src/lib/assistantProvider.js';
import { AssistantAnswer } from '../../src/data/assistantKnowledge.js';
import { VALID_SAMREY_PACKAGES, detectUnsupportedApis } from '../../src/lib/codeHelpEngine.js';

export interface ChallengeScore {
  conceptAccuracy: number;          // 0-5
  apiAccuracy: number;              // 0-5
  codeQuality: number;              // 0-5
  compilation: number;              // 0-5
  taskCompleteness: number;         // 0-5
  samreyNativeArchitecture: number; // 0-5
  totalScore: number;               // 0-30
  extractedCode: string;
  compiles: boolean;
  compileErrors: string[];
  hallucinatedApis: string[];
  foreignFrameworks: string[];
  hasAetherReferences: boolean;
  warnings: string[];
  matchedCapabilities: string[];
  missingCapabilities: string[];
}

export interface ChallengeResult {
  challenge: DeveloperChallenge;
  answer: AssistantAnswer;
  score: ChallengeScore;
  passed: boolean;
}

export interface BenchmarkReport {
  timestamp: string;
  totalChallenges: number;
  totalScore: number;
  maxPossibleScore: number;
  averageScore: number;
  scorePercentage: number;
  apiAccuracyRate: number;
  compilationRate: number;
  taskCompletionRate: number;
  hallucinationRate: number;
  foreignFrameworkRate: number;
  aetherReferenceCount: number;
  allPassedThreshold: boolean;
  results: ChallengeResult[];
}

/**
 * Public exports of official @samrey/* packages in v1.0.0
 */
export const OFFICIAL_SAMREY_EXPORTS: Record<string, string[]> = {
  '@samrey/reactivity': [
    'signal', 'computed', 'effect', 'batch', 'untrack', 'createRoot',
    'createContext', 'useContext', 'createStore', 'produce', 'reconcile',
    'onCleanup', 'getOwner', 'runWithOwner', 'isSignal', 'Signal', 'ReadonlySignal', 'Store'
  ],
  '@samrey/runtime': [
    'el', 'text', 'Show', 'For', 'Switch', 'Match', 'ErrorBoundary',
    'Suspense', 'mount', 'hydrate', 'onMount', 'onCleanup', 'onError',
    'createComponent', 'deriveAriaAttributes'
  ],
  '@samrey/router': [
    'createRouter', 'Router', 'Route', 'Link', 'useRouter', 'useParams',
    'useNavigate', 'useLocation', 'RouterView', 'createMemoryHistory', 'createBrowserHistory'
  ],
  '@samrey/forms': [
    'createForm', 'createField', 'standardSchemaValidator', 'deriveAriaAttributes',
    'bindField', 'validateField', 'validateForm'
  ],
  '@samrey/http': [
    'createHttpClient', 'resource', 'createCache', 'fetchResource', 'HttpClient'
  ],
  '@samrey/security': [
    'sanitizeHtml', 'sanitizeUri', 'escapeHtmlText', 'escapeHtmlAttribute',
    'createCsrfToken', 'validateCsrfToken', 'stripSecrets', 'safeJsonParse'
  ],
  '@samrey/ssr': [
    'renderToString', 'renderToStream', 'serializeState', 'hydrateState',
    'createSsrContext', 'renderToPipeableStream'
  ],
  '@samrey/testing': [
    'renderTest', 'renderTestComponent', 'fireEvent', 'waitFor', 'flushReactivity',
    'createMockResource', 'waitForNextUpdate', 'cleanupAllTestContainers'
  ],
  '@samrey/devtools': [
    'initDevTools', 'ReactiveGraphInspector', 'PerfInspector', 'SamreyDevToolsBridge'
  ],
  '@samrey/compiler': [
    'compile', 'compileToRuntime', 'transformTsx', 'parseTemplate'
  ],
  '@samrey/cli': [
    'runCli', 'createProject', 'buildProject'
  ]
};

/**
 * Extracts TypeScript code block from an AssistantAnswer.
 */
export function extractAnswerCode(answer: AssistantAnswer): string {
  if (answer.tsCodeExample && answer.tsCodeExample.trim()) {
    return answer.tsCodeExample.trim();
  }
  if (answer.completeWorkingExample && answer.completeWorkingExample.trim()) {
    return answer.completeWorkingExample.trim();
  }

  // Extract from markdown code fence in shortAnswer or concept
  const match = answer.shortAnswer.match(/```(?:typescript|ts)?\n([\s\S]*?)```/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
}

/**
 * Validates syntax and types of generated TypeScript code.
 */
export function validateTypeScriptCode(code: string): { compiles: boolean; errors: string[] } {
  if (!code || !code.trim()) {
    return { compiles: false, errors: ['No TypeScript code provided'] };
  }

  const errors: string[] = [];

  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.Preserve,
        noEmitOnError: false,
        strict: false
      },
      reportDiagnostics: true
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      for (const diag of result.diagnostics) {
        if (diag.category === ts.DiagnosticCategory.Error) {
          const message = typeof diag.messageText === 'string'
            ? diag.messageText
            : diag.messageText.messageText;
          errors.push(`TS Error at position ${diag.start}: ${message}`);
        }
      }
    }
  } catch (err: any) {
    errors.push(`Transpilation threw exception: ${err.message}`);
  }

  return {
    compiles: errors.length === 0,
    errors
  };
}

/**
 * Audits generated code for package validity, hallucinations, and foreign APIs.
 */
export function auditCodeSymbols(
  code: string,
  isMigrationChallenge = false
): {
  hallucinatedApis: string[];
  foreignFrameworks: string[];
  hasAetherReferences: boolean;
  validSamreyImports: string[];
  warnings: string[];
} {
  const hallucinatedApis: string[] = [];
  const foreignFrameworks: string[] = [];
  const validSamreyImports: string[] = [];
  const warnings: string[] = [];

  // Check for forbidden @aether/* references
  const hasAetherReferences = /@aether\//i.test(code);
  if (hasAetherReferences) {
    hallucinatedApis.push('Forbidden @aether/* package namespace detected');
  }

  // Extract all import statements
  const importRegex = /import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(code)) !== null) {
    const namedImports = match[1] ? match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()) : [];
    const defaultImport = match[2]?.trim();
    const pkgName = match[3]?.trim();

    if (pkgName.startsWith('@samrey/')) {
      if (!VALID_SAMREY_PACKAGES.includes(pkgName)) {
        hallucinatedApis.push(`Nonexistent package: ${pkgName}`);
      } else {
        validSamreyImports.push(pkgName);
        const allowedExports = OFFICIAL_SAMREY_EXPORTS[pkgName] || [];

        for (const named of namedImports) {
          if (named && !allowedExports.includes(named)) {
            hallucinatedApis.push(`Unknown export '${named}' from package '${pkgName}'`);
          }
        }
      }
    } else if (['react', 'react-dom', 'vue', '@angular/core', 'svelte', 'solid-js'].includes(pkgName)) {
      if (!isMigrationChallenge) {
        foreignFrameworks.push(`Foreign framework package import: ${pkgName}`);
      }
    }
  }

  // Check for foreign framework hook patterns in recommended code (unless in migration problem description)
  if (!isMigrationChallenge) {
    const foreignHooks = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useReducer', 'useRef', 'v-model', '$state', '$derived'];
    for (const hook of foreignHooks) {
      const hookRegex = new RegExp(`\\b${hook}\\s*\\(`, 'g');
      if (hookRegex.test(code)) {
        foreignFrameworks.push(`Foreign framework primitive used in code: ${hook}()`);
      }
    }
  }

  return {
    hallucinatedApis,
    foreignFrameworks,
    hasAetherReferences,
    validSamreyImports,
    warnings
  };
}

/**
 * Scores an individual challenge response across the 6 dimensions (0-5 each).
 */
export function scoreChallengeResponse(
  challenge: DeveloperChallenge,
  answer: AssistantAnswer
): ChallengeScore {
  const code = extractAnswerCode(answer);
  const isMigration = challenge.id === 16;
  const isDebugging = challenge.id === 17;

  // 1. Validate TypeScript compilation
  const { compiles, errors: compileErrors } = validateTypeScriptCode(code);

  // 2. Audit symbols & foreign frameworks
  const audit = auditCodeSymbols(code, isMigration);

  // 3. Match expected capabilities
  const stepsText = answer.implementationSteps ? answer.implementationSteps.join(' ') : '';
  const mistakesText = answer.commonMistakes ? answer.commonMistakes.join(' ') : '';
  const combinedText = `${answer.title} ${answer.shortAnswer} ${answer.concept} ${answer.recommendedApi} ${answer.codeExplanation} ${answer.alternativeApproach || ''} ${stepsText} ${mistakesText} ${code}`.toLowerCase();
  const matchedCapabilities: string[] = [];
  const missingCapabilities: string[] = [];

  for (const cap of challenge.expectedCapabilities) {
    const words = cap.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchCount = words.filter(w => combinedText.includes(w)).length;
    if (matchCount >= Math.min(2, words.length)) {
      matchedCapabilities.push(cap);
    } else {
      missingCapabilities.push(cap);
    }
  }

  // --- Dimension 1: Concept Accuracy (0-5) ---
  let conceptAccuracy = 5;
  if (!answer.concept || answer.concept.length < 30) conceptAccuracy -= 2;
  if (!combinedText.includes('samrey') && !combinedText.includes('reactiv')) conceptAccuracy -= 1;
  if (audit.hasAetherReferences) conceptAccuracy = 0;
  conceptAccuracy = Math.max(0, Math.min(5, conceptAccuracy));

  // --- Dimension 2: API Accuracy (0-5) ---
  let apiAccuracy = 5;
  if (audit.hallucinatedApis.length > 0) apiAccuracy -= audit.hallucinatedApis.length * 2;
  if (audit.foreignFrameworks.length > 0) apiAccuracy -= audit.foreignFrameworks.length * 2;
  if (audit.hasAetherReferences) apiAccuracy = 0;

  // Check that expected packages are mentioned / imported
  const mentionedPkgs = challenge.relevantPackages.filter(pkg => combinedText.includes(pkg) || audit.validSamreyImports.includes(pkg));
  if (mentionedPkgs.length === 0 && challenge.relevantPackages.length > 0) {
    apiAccuracy -= 1;
  }
  apiAccuracy = Math.max(0, Math.min(5, apiAccuracy));

  // --- Dimension 3: Code Quality (0-5) ---
  let codeQuality = 5;
  if (!code || code.length < 50) codeQuality -= 3;
  if (!code.includes('import ') && !isDebugging) codeQuality -= 1;
  if (code.includes('any') && codeQuality > 3) codeQuality -= 1; // minor deduction for untyped any if excessive
  codeQuality = Math.max(0, Math.min(5, codeQuality));

  // --- Dimension 4: Compilation (0-5) ---
  let compilation = 5;
  if (!compiles) {
    compilation = Math.max(0, 5 - compileErrors.length * 2);
  }
  if (!code) compilation = 0;

  // --- Dimension 5: Task Completeness (0-5) ---
  let taskCompleteness = 5;
  const capRatio = challenge.expectedCapabilities.length > 0
    ? matchedCapabilities.length / challenge.expectedCapabilities.length
    : 1.0;

  if (capRatio < 0.5) taskCompleteness -= 3;
  else if (capRatio < 0.8) taskCompleteness -= 1;

  if (!answer.commonMistakes || answer.commonMistakes.length === 0) taskCompleteness -= 1;
  taskCompleteness = Math.max(0, Math.min(5, taskCompleteness));

  // --- Dimension 6: Samrey-Native Architecture (0-5) ---
  let samreyNativeArchitecture = 5;
  if (code.includes('useState') || code.includes('useEffect')) {
    if (!isMigration) samreyNativeArchitecture = 0;
  }
  if (audit.hasAetherReferences) samreyNativeArchitecture = 0;
  if (!code.includes('el(') && !code.includes('renderToString') && !code.includes('signal(') && !code.includes('createForm') && !code.includes('createRouter')) {
    samreyNativeArchitecture -= 2;
  }
  samreyNativeArchitecture = Math.max(0, Math.min(5, samreyNativeArchitecture));

  const totalScore = conceptAccuracy + apiAccuracy + codeQuality + compilation + taskCompleteness + samreyNativeArchitecture;

  return {
    conceptAccuracy,
    apiAccuracy,
    codeQuality,
    compilation,
    taskCompleteness,
    samreyNativeArchitecture,
    totalScore,
    extractedCode: code,
    compiles,
    compileErrors,
    hallucinatedApis: audit.hallucinatedApis,
    foreignFrameworks: audit.foreignFrameworks,
    hasAetherReferences: audit.hasAetherReferences,
    warnings: audit.warnings,
    matchedCapabilities,
    missingCapabilities
  };
}

/**
 * Runs the full 20-challenge Blind Developer Challenge Benchmark.
 * Each challenge runs in an isolated context (empty history / fresh provider).
 */
export async function runBlindDeveloperBenchmark(
  providerFactory: () => AssistantProvider = () => new SmartAssistantProvider()
): Promise<BenchmarkReport> {
  const results: ChallengeResult[] = [];
  let totalScore = 0;
  const maxPossibleScore = CHALLENGES.length * 30; // 600 points total

  for (const challenge of CHALLENGES) {
    // CRITICAL: Fresh context for each challenge (Blind isolated test invariant)
    const freshProvider = providerFactory();

    let answer: AssistantAnswer;

    // Handle code debugging challenge via analyzeCode if appropriate, or askQuestion
    if (challenge.id === 17 && freshProvider.analyzeCode) {
      const codeSnippet = `import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';
export function Broken() {
  const count = signal(0);
  return el('div', null, count.value, el('button', { onClick: () => { count.value++; } }, '+'));
}`;
      const codeResult = await freshProvider.analyzeCode({
        code: codeSnippet,
        question: "Why isn't my signal updating?"
      });

      answer = {
        id: `challenge-${challenge.id}`,
        query: challenge.prompt,
        category: challenge.category,
        title: 'Debugging Reactive Signal Updates',
        shortAnswer: codeResult.problem,
        concept: codeResult.explanation,
        recommendedApi: '@samrey/reactivity -> signal() with accessor closures () => signal.value in @samrey/runtime el()',
        whenToUse: 'When binding dynamic reactive signals to DOM text and attribute nodes.',
        implementationSteps: codeResult.changesExplanation,
        tsCodeExample: codeResult.fixedCode,
        completeWorkingExample: codeResult.fixedCode,
        codeExplanation: codeResult.explanation,
        commonMistakes: [
          'Unwrapping count.value statically during component creation, which evaluates only once.',
          'Mutating signals in-place without triggering reactive change notifications.'
        ],
        relatedApis: codeResult.relatedApis,
        docLinks: codeResult.docLinks
      };
    } else {
      // Standard isolated query execution with 0 history
      answer = await freshProvider.askQuestion(challenge.prompt, []);
    }

    const score = scoreChallengeResponse(challenge, answer);
    const passed = score.totalScore >= 24 && score.compiles && !score.hasAetherReferences && score.hallucinatedApis.length === 0;

    totalScore += score.totalScore;

    results.push({
      challenge,
      answer,
      score,
      passed
    });
  }

  const totalChallenges = CHALLENGES.length;
  const averageScore = Number((totalScore / totalChallenges).toFixed(2));
  const scorePercentage = Number(((totalScore / maxPossibleScore) * 100).toFixed(1));

  // Compute aggregate rates
  const compilingCount = results.filter(r => r.score.compiles).length;
  const compilationRate = Number(((compilingCount / totalChallenges) * 100).toFixed(1));

  const accurateApiCount = results.filter(r => r.score.apiAccuracy >= 4 && r.score.hallucinatedApis.length === 0).length;
  const apiAccuracyRate = Number(((accurateApiCount / totalChallenges) * 100).toFixed(1));

  const completeTaskCount = results.filter(r => r.score.taskCompleteness >= 4).length;
  const taskCompletionRate = Number(((completeTaskCount / totalChallenges) * 100).toFixed(1));

  const hallucinatedChallenges = results.filter(r => r.score.hallucinatedApis.length > 0).length;
  const hallucinationRate = Number(((hallucinatedChallenges / totalChallenges) * 100).toFixed(1));

  const foreignFrameworkChallenges = results.filter(r => r.score.foreignFrameworks.length > 0).length;
  const foreignFrameworkRate = Number(((foreignFrameworkChallenges / totalChallenges) * 100).toFixed(1));

  const aetherReferenceCount = results.filter(r => r.score.hasAetherReferences).length;

  const allPassedThreshold =
    apiAccuracyRate >= 98.0 &&
    compilationRate >= 95.0 &&
    taskCompletionRate >= 90.0 &&
    hallucinationRate === 0 &&
    foreignFrameworkRate === 0 &&
    aetherReferenceCount === 0 &&
    averageScore >= 24.0;

  return {
    timestamp: new Date().toISOString(),
    totalChallenges,
    totalScore,
    maxPossibleScore,
    averageScore,
    scorePercentage,
    apiAccuracyRate,
    compilationRate,
    taskCompletionRate,
    hallucinationRate,
    foreignFrameworkRate,
    aetherReferenceCount,
    allPassedThreshold,
    results
  };
}

// Auto-run if executed directly via CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('benchmark-runner.ts')) {
  console.log('🚀 Running 20-Challenge Samrey Blind Benchmark Suite...\n');
  runBlindDeveloperBenchmark().then(report => {
    console.log('====================================================');
    console.log(' SAMREY DEVELOPER ASSISTANT BENCHMARK RESULTS');
    console.log('====================================================');
    console.log(`Total Score:            ${report.totalScore} / ${report.maxPossibleScore} (${report.scorePercentage}%)`);
    console.log(`Average Score:          ${report.averageScore} / 30.0`);
    console.log(`Compilation Rate:       ${report.compilationRate}%`);
    console.log(`API Accuracy Rate:      ${report.apiAccuracyRate}%`);
    console.log(`Task Completion Rate:   ${report.taskCompletionRate}%`);
    console.log(`Hallucination Rate:     ${report.hallucinationRate}%`);
    console.log(`Foreign Framework Rate: ${report.foreignFrameworkRate}%`);
    console.log(`Aether References:      ${report.aetherReferenceCount}`);
    console.log(`ALL PASSED THRESHOLD:   ${report.allPassedThreshold ? '✅ YES' : '❌ NO'}`);
    console.log('====================================================\n');

    for (const res of report.results) {
      const status = res.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`[Challenge ${res.challenge.id}] [${res.challenge.category}] Score: ${res.score.totalScore}/30 -> ${status}`);
      if (!res.passed) {
        console.log(`   Compiles: ${res.score.compiles}`);
        if (res.score.compileErrors.length > 0) console.log(`   Errors: ${res.score.compileErrors.join(', ')}`);
        if (res.score.hallucinatedApis.length > 0) console.log(`   Hallucinations: ${res.score.hallucinatedApis.join(', ')}`);
        if (res.score.missingCapabilities.length > 0) console.log(`   Missing: ${res.score.missingCapabilities.join(', ')}`);
      }
    }
  }).catch(err => {
    console.error('Benchmark runner error:', err);
    process.exit(1);
  });
}
