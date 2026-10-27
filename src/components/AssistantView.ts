/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant
 *
 * UNIFIED DEVELOPER ASSISTANT EXPERIENCE:
 * Consolidates "Documentation & Recipes" and "Code Help & Fixer" into ONE unified assistant.
 *
 * Single Prominent Input handles:
 * - Concept questions
 * - How-to questions
 * - Implementation requirements
 * - Code debugging & AST repair
 * - Code conversion from foreign frameworks (React, Vue, Svelte, Solid, Redux, etc.)
 * - API questions
 * - Error messages & AETH-xxxx diagnostics
 * - Architecture & structural questions
 *
 * Standardized Response Schema:
 * 1. Answer (Short direct explanation)
 * 2. Approach (Explain how Samrey solves the problem)
 * 3. Implementation (Complete TypeScript/Samrey code with [Copy], [Try in Playground], [Explain], [Ask Follow-up])
 * 4. Why it works (Explain reactive/runtime/lifecycle behavior)
 * 5. Related APIs (Official @samrey/* packages)
 * 6. Verification ("✓ Samrey v1.0.0 Verified" ONLY when validated, or "⚠ Generated solution needs correction")
 */

import { el, Show, For } from '@samrey/runtime';
import { signal, computed } from '@samrey/reactivity';
import { icon } from '../lib/icons.js';
import {
  POPULAR_PROMPTS,
  CATEGORY_FILTERS,
  FAQ_ENTRIES
} from '../data/assistantKnowledge.js';
import type { AssistantAnswer } from '../data/assistantKnowledge.js';
import { SmartAssistantProvider } from '../lib/assistantProvider.js';
import type { ChatMessage, CodeHelpResult } from '../lib/assistantProvider.js';
import { validateSamreyCode, CodeValidationResult } from '../lib/codeValidator.js';
import { PlaygroundModal } from './PlaygroundModal.js';
import { PLAYGROUND_PRESETS } from '../lib/runtimeSandbox.js';

export function AssistantView(): HTMLElement {
  const provider = new SmartAssistantProvider();

  // Unified Query Input State
  const searchQuery = signal<string>('');
  const activeInputMode = signal<'qa' | 'code-help'>('qa');
  const codeInput = signal<string>('');
  const activeCategory = signal<string>('all');
  const isLoading = signal<boolean>(false);
  const loadingStage = signal<string>('Analyzing query & detecting intent...');
  const errorMessage = signal<string | null>(null);

  // Active Output State
  const currentAnswer = signal<AssistantAnswer | null>(null);
  const currentCodeResult = signal<CodeHelpResult | null>(null);
  const conversationHistory = signal<Array<{ query: string; answer: AssistantAnswer }>>([]);
  const followUpText = signal<string>('');
  const isFaqExpanded = signal<boolean>(false);

  // Feedback State
  const feedbackState = signal<'none' | 'helpful' | 'unhelpful'>('none');

  // Playground Modal State
  const isPlaygroundOpen = signal<boolean>(false);
  const playgroundCode = signal<string>('');
  const playgroundTitle = signal<string>('Samrey Playground Runner');

  // Focus helper for the unified input
  const focusSearchInput = () => {
    if (typeof document !== 'undefined') {
      const input = (document.getElementById('assistant-search-input') || document.getElementById('assistant-code-input') || document.getElementById('assistant-unified-input')) as HTMLTextAreaElement | HTMLInputElement | null;
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Keyboard shortcut (/ or Cmd+K)
  if (typeof window !== 'undefined') {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        focusSearchInput();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
  }

  // Active Code Validation Result
  const currentValidation = computed<CodeValidationResult>(() => {
    const code = currentAnswer.value?.tsCodeExample || currentAnswer.value?.completeWorkingExample || currentCodeResult.value?.fixedCode || '';
    return validateSamreyCode(code);
  });

  // Open in Playground
  const openInPlayground = (codeToRun: string, title?: string) => {
    playgroundCode.value = codeToRun;
    if (title) playgroundTitle.value = title;
    isPlaygroundOpen.value = true;
  };

  // Unified Submission Handler: Processes questions, code, errors, requirements
  const handleAsk = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery.value).trim();
    if (!q || isLoading.value) return;

    isLoading.value = true;
    errorMessage.value = null;
    searchQuery.value = q;
    feedbackState.value = 'none';
    currentCodeResult.value = null;
    loadingStage.value = 'Analyzing intent & inspecting Samrey v1.0.0 knowledge...';

    const stageTimer = setTimeout(() => {
      if (isLoading.value) {
        loadingStage.value = 'Synthesizing idiomatic solution, compiling AST, and verifying code...';
      }
    }, 180);

    try {
      // Check if input looks like raw pasted code with no query wrapper
      const looksLikeCode = q.includes('function') || q.includes('import ') || q.includes('const ') || q.includes('class ') || q.includes('=>') || q.includes('{') && q.includes('}');
      const isDebuggingQuery = /\b(why isn't|doesn't update|fix this|broken|bug|not working)\b/i.test(q);

      if (looksLikeCode && (isDebuggingQuery || q.length > 80)) {
        // Run code help engine
        const codeRes = await provider.analyzeCode({
          code: q,
          question: isDebuggingQuery ? q : 'Analyze and fix this Samrey code'
        });
        currentCodeResult.value = codeRes;

        // Also build answer model
        const ans: AssistantAnswer = {
          id: `code-fix-${Date.now()}`,
          query: q,
          category: 'reactivity',
          title: 'Code Analysis & AST Repair',
          shortAnswer: codeRes.problem,
          concept: codeRes.explanation,
          recommendedApi: codeRes.relatedApis?.join(', ') || '@samrey/reactivity, @samrey/runtime',
          whenToUse: 'When debugging reactive state updates, lifecycle bindings, or foreign framework code.',
          implementationSteps: codeRes.changesExplanation || ['Audit reactive subscriptions', 'Apply fine-grained DOM bindings'],
          tsCodeExample: codeRes.fixedCode,
          completeWorkingExample: codeRes.fixedCode,
          codeExplanation: codeRes.explanation,
          commonMistakes: [
            'Evaluating signal .value statically inside el() without accessor closure.',
            'Mutating array/object signals in-place without triggering reactive setters.'
          ],
          relatedApis: codeRes.relatedApis || ['signal', 'computed', 'effect', 'el'],
          docLinks: codeRes.docLinks || [{ label: 'Reactivity Specification', url: '#reactivity' }],
          intentType: 'DEBUG',
          isDirectMatch: true,
          isAiGenerated: codeRes.isAiGenerated,
          provider: codeRes.provider
        };
        currentAnswer.value = ans;

        const history = conversationHistory.value;
        conversationHistory.set([...history, { query: q.slice(0, 60) + '...', answer: ans }]);
      } else {
        // Standard conversational / intent lookup
        const historyPayload: ChatMessage[] = [];
        for (const item of conversationHistory.value) {
          historyPayload.push({ role: 'user', content: item.query });
          historyPayload.push({ role: 'assistant', content: item.answer.shortAnswer });
        }

        const answer = await provider.askQuestion(q, historyPayload);
        currentAnswer.value = answer;

        const history = conversationHistory.value;
        if (history.length === 0 || history[history.length - 1].query !== q) {
          conversationHistory.set([...history, { query: q, answer }]);
        }
      }
    } catch (err: any) {
      errorMessage.value = err?.message || 'Failed to retrieve answer from Samrey Developer Assistant. Please check your query and try again.';
    } finally {
      clearTimeout(stageTimer);
      isLoading.value = false;
    }
  };

  // Direct Code Analysis & AST Repair Handler
  const handleCodeAnalyze = async () => {
    const code = codeInput.value.trim();
    if (!code || isLoading.value) return;

    isLoading.value = true;
    errorMessage.value = null;
    loadingStage.value = 'Analyzing AST, linting rules, and detecting anti-patterns...';

    try {
      const codeRes = await provider.analyzeCode({
        code,
        question: 'Analyze and fix this Samrey code'
      });
      currentCodeResult.value = codeRes;

      const ans: AssistantAnswer = {
        id: `code-fix-${Date.now()}`,
        query: code,
        category: 'reactivity',
        title: 'Code Analysis & AST Repair',
        shortAnswer: codeRes.problem,
        concept: codeRes.explanation,
        recommendedApi: codeRes.relatedApis?.join(', ') || '@samrey/reactivity, @samrey/runtime',
        whenToUse: 'When debugging reactive state updates, lifecycle bindings, or foreign framework code.',
        implementationSteps: codeRes.changesExplanation || ['Audit reactive subscriptions', 'Apply fine-grained DOM bindings'],
        tsCodeExample: codeRes.fixedCode,
        completeWorkingExample: codeRes.fixedCode,
        codeExplanation: codeRes.explanation,
        commonMistakes: [
          'Evaluating signal .value statically inside el() without accessor closure.',
          'Mutating array/object signals in-place without triggering reactive setters.'
        ],
        relatedApis: codeRes.relatedApis || ['signal', 'computed', 'effect', 'el'],
        docLinks: codeRes.docLinks || [{ label: 'Reactivity Specification', url: '#reactivity' }],
        intentType: 'DEBUG',
        isDirectMatch: true,
        isAiGenerated: codeRes.isAiGenerated,
        provider: codeRes.provider
      };
      currentAnswer.value = ans;
    } catch (err: any) {
      errorMessage.value = err?.message || 'Failed to analyze code.';
    } finally {
      isLoading.value = false;
    }
  };

  // Follow-up question submission
  const handleFollowUp = async () => {
    const q = followUpText.value.trim();
    if (!q || isLoading.value) return;
    followUpText.value = '';
    await handleAsk(q);
  };

  // Reset and ask another
  const handleReset = () => {
    feedbackState.value = 'none';
    followUpText.value = '';
    errorMessage.value = null;
    focusSearchInput();
  };

  // Helper: Reusable Code Block with Copy, Try in Playground, Explain, Ask Follow-up
  const createCodeBlock = (codeGetter: () => string, langLabel = 'TypeScript', badgeLabel?: string): HTMLElement => {
    const isCopied = signal<boolean>(false);

    const handleCopy = async () => {
      const text = codeGetter();
      if (!text) return;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          isCopied.value = true;
          setTimeout(() => { isCopied.value = false; }, 2000);
        }
      } catch {
        // Fallback
      }
    };

    return el('div', { class: 'rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md space-y-0' },
      // Top Bar: Lang tag + Action Buttons
      el('div', { class: 'flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 gap-2 text-xs' },
        el('div', { class: 'flex items-center space-x-2' },
          el('div', { class: 'flex space-x-1.5' },
            el('span', { class: 'w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block' }),
            el('span', { class: 'w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block' }),
            el('span', { class: 'w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block' })
          ),
          el('span', { class: 'text-slate-400 font-mono text-[11px] font-medium ml-1' }, langLabel),
          badgeLabel ? el('span', { class: 'px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-mono text-[10px] border border-indigo-700/50' }, badgeLabel) : null
        ),
        // Action Buttons Row: [Copy Code], [▶ Try in Playground], [Explain], [Ask Follow-up]
        el('div', { class: 'flex flex-wrap items-center gap-1.5' },
          el('button', {
            type: 'button',
            'aria-label': 'Copy code to clipboard',
            class: () => `px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
              isCopied.value
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
            }`,
            onClick: handleCopy
          },
            icon(isCopied.value ? 'check' : 'copy', 'w-3.5 h-3.5'),
            el('span', null, () => isCopied.value ? 'Copied!' : 'Copy Code')
          ),
          el('button', {
            type: 'button',
            'aria-label': 'Open code in interactive Samrey Playground',
            class: 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center space-x-1.5 cursor-pointer shadow-xs',
            onClick: () => {
              openInPlayground(codeGetter(), currentAnswer.value?.title || 'Interactive Samrey Sandbox');
            }
          },
            icon('play', 'w-3.5 h-3.5 text-indigo-200'),
            el('span', null, '▶ Try in Playground')
          ),
          el('button', {
            type: 'button',
            'aria-label': 'Scroll to why it works breakdown',
            class: 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer',
            onClick: () => {
              const elWhy = document.getElementById('section-why-it-works');
              if (elWhy) elWhy.scrollIntoView({ behavior: 'smooth' });
            }
          },
            icon('help-circle', 'w-3.5 h-3.5 text-slate-400'),
            el('span', null, 'Explain')
          ),
          el('button', {
            type: 'button',
            'aria-label': 'Focus follow-up input',
            class: 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer',
            onClick: () => {
              const elFollow = document.getElementById('assistant-follow-up-input') as HTMLInputElement | null;
              if (elFollow) {
                elFollow.focus();
                elFollow.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          },
            icon('message-square', 'w-3.5 h-3.5 text-slate-400'),
            el('span', null, 'Ask Follow-up')
          )
        )
      ),
      // Code Text Body
      el('pre', {
        class: 'p-4 sm:p-5 overflow-x-auto font-mono text-xs sm:text-sm text-slate-100 leading-relaxed scrollbar-thin'
      },
        el('code', null, codeGetter)
      )
    );
  };

  // Helper: "Was this helpful?" Feedback Bar
  const createFeedbackBar = (): HTMLElement => {
    return el('div', {
      class: 'p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs'
    },
      Show({
        when: () => feedbackState.value === 'none',
        children: () => el('div', { class: 'flex flex-wrap items-center justify-between gap-3 w-full' },
          el('div', { class: 'flex items-center space-x-2 text-slate-700 font-medium' },
            icon('sparkles', 'w-4 h-4 text-indigo-600'),
            el('span', null, 'Was this answer helpful to your development task?')
          ),
          el('div', { class: 'flex items-center space-x-2' },
            el('button', {
              type: 'button',
              'aria-label': 'Mark answer as helpful',
              class: 'px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-300 font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs',
              onClick: () => { feedbackState.value = 'helpful'; }
            },
              icon('thumbs-up', 'w-3.5 h-3.5 text-emerald-600'),
              el('span', null, 'Yes, helpful')
            ),
            el('button', {
              type: 'button',
              'aria-label': 'Mark answer as not helpful',
              class: 'px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-300 hover:border-rose-300 font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs',
              onClick: () => { feedbackState.value = 'unhelpful'; }
            },
              icon('thumbs-down', 'w-3.5 h-3.5 text-rose-600'),
              el('span', null, 'Needs improvement')
            )
          )
        )
      }),
      Show({
        when: () => feedbackState.value === 'helpful',
        children: () => el('div', { class: 'flex items-center space-x-2 text-emerald-700 font-medium' },
          icon('check-circle', 'w-4 h-4 text-emerald-600'),
          el('span', null, 'Thank you for your feedback! Glad this helped your workflow.')
        )
      }),
      Show({
        when: () => feedbackState.value === 'unhelpful',
        children: () => el('div', { class: 'flex items-center space-x-2 text-slate-600 font-medium' },
          icon('alert-circle', 'w-4 h-4 text-slate-500'),
          el('span', null, 'Thank you for your feedback. We continuously refine the assistant knowledge base.')
        )
      })
    );
  };

  // Main Root Container
  const root = el('div', { class: 'space-y-8 pb-16', id: 'samrey-assistant-view' });

  // 1. Hero Header & Subtitle
  const heroSection = el('div', {
    class: 'relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-10 text-white shadow-xl border border-slate-700'
  },
    el('div', { class: 'relative z-10 max-w-3xl space-y-4' },
      el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-medium' },
        icon('sparkles', 'w-3.5 h-3.5 text-indigo-400'),
        el('span', null, 'Samrey Framework v1.0.0 · Unified Developer Assistant')
      ),
      el('h1', { class: 'text-3xl sm:text-4xl font-extrabold tracking-tight text-white' },
        'SAMREY DEVELOPER ASSISTANT'
      ),
      el('p', { class: 'text-sm sm:text-base text-slate-300 leading-relaxed' },
        'Ask how to build it, understand Samrey concepts, or get your code fixed.'
      ),
      el('div', { class: 'flex flex-wrap items-center gap-3 pt-2' },
        el('button', {
          type: 'button',
          id: 'hero-open-playground-btn',
          class: 'px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 shadow-sm cursor-pointer hover:shadow-md',
          onClick: () => {
            openInPlayground(PLAYGROUND_PRESETS[0].code, 'Interactive Samrey Playground & Runtime Sandbox');
          }
        },
          icon('play', 'w-4 h-4 text-indigo-200'),
          el('span', null, '▶ Open Live Playground')
        ),
        el('button', {
          type: 'button',
          class: 'px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center space-x-2 border border-slate-700 cursor-pointer',
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.location.hash = 'compiler';
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        },
          icon('file-code', 'w-4 h-4 text-cyan-400'),
          el('span', null, 'Compiler & IR Pipeline')
        )
      )
    )
  );
  root.appendChild(heroSection);

  // 2. UNIFIED PRIMARY INPUT PANEL
  const inputPanel = el('div', {
    class: 'p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-md space-y-5'
  });

  // Mode Selection Tabs (Documentation & QA vs Code Help & Repair)
  const modeTabs = el('div', { class: 'flex items-center space-x-2 border-b border-slate-200 pb-3 mb-1' },
    el('button', {
      type: 'button',
      id: 'tab-assistant-qa',
      class: () => `px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center space-x-2 ${
        activeInputMode.value === 'qa'
          ? 'bg-indigo-600 text-white shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
      }`,
      onClick: () => {
        activeInputMode.value = 'qa';
      }
    },
      icon('help-circle', 'w-4 h-4'),
      el('span', null, 'Documentation & QA')
    ),
    el('button', {
      type: 'button',
      id: 'tab-assistant-code-help',
      class: () => `px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center space-x-2 ${
        activeInputMode.value === 'code-help'
          ? 'bg-indigo-600 text-white shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
      }`,
      onClick: () => {
        activeInputMode.value = 'code-help';
      }
    },
      icon('code', 'w-4 h-4'),
      el('span', null, 'Code Help & Repair')
    )
  );
  inputPanel.appendChild(modeTabs);

  // QA Input Section
  const qaSection = el('div', {
    class: () => (activeInputMode.value === 'qa' ? 'space-y-3' : 'hidden')
  });

  const searchInput = el('input', {
    type: 'text',
    id: 'assistant-search-input',
    'aria-label': 'Unified input for questions, requirements, code debugging, and errors',
    placeholder: 'Ask anything about Samrey, describe a requirement, or paste an error...',
    class: 'w-full p-4 sm:p-5 text-sm sm:text-base bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-2xl focus:ring-2 focus:ring-indigo-600/20 transition outline-hidden font-sans text-slate-900 shadow-inner leading-relaxed',
    value: () => searchQuery.value,
    onInput: (e: Event) => {
      searchQuery.value = (e.target as HTMLInputElement).value;
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAsk();
      }
    }
  });
  qaSection.appendChild(searchInput);

  // QA Action Bar: Info hint + Clear + [ Ask Samrey ]
  const actionBar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3' },
    el('div', { class: 'flex items-center space-x-2 text-xs text-slate-500 font-mono' },
      icon('shield-check', 'w-4 h-4 text-emerald-600'),
      el('span', null, 'Auto-detects Concepts, Requirements, Bugs, Foreign APIs & AETH Errors · Zero-Eval Safe')
    ),
    el('div', { class: 'flex items-center space-x-2' },
      Show({
        when: () => searchQuery.value.length > 0,
        children: () => el('button', {
          type: 'button',
          class: 'px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer',
          onClick: () => {
            searchQuery.value = '';
            focusSearchInput();
          }
        }, 'Clear')
      }),
      el('button', {
        id: 'assistant-ask-btn',
        type: 'button',
        'aria-label': 'Ask Samrey Developer Assistant',
        disabled: () => isLoading.value,
        class: 'px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition disabled:opacity-50 flex items-center space-x-2 shadow-md cursor-pointer hover:shadow-lg',
        onClick: () => handleAsk()
      },
        icon('sparkles', 'w-4 h-4 text-indigo-200'),
        el('span', null, () => isLoading.value ? 'Processing...' : 'Ask Samrey')
      )
    )
  );
  qaSection.appendChild(actionBar);
  inputPanel.appendChild(qaSection);

  // Code Help Section
  const codeHelpSection = el('div', {
    class: () => (activeInputMode.value === 'code-help' ? 'space-y-3' : 'hidden')
  });

  const codeTextarea = el('textarea', {
    id: 'assistant-code-input',
    rows: 6,
    'aria-label': 'Code input for analysis and repair',
    placeholder: 'Paste your Samrey or foreign component code here for analysis and automatic repair...',
    class: 'w-full p-4 sm:p-5 text-sm sm:text-base font-mono bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-2xl focus:ring-2 focus:ring-indigo-600/20 transition outline-hidden text-slate-900 shadow-inner resize-y leading-relaxed',
    value: () => codeInput.value,
    onInput: (e: Event) => {
      codeInput.value = (e.target as HTMLTextAreaElement).value;
    },
    onKeyDown: (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCodeAnalyze();
      }
    }
  });
  codeHelpSection.appendChild(codeTextarea);

  // Code Help Action Bar
  const codeActionBar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3' },
    el('div', { class: 'flex items-center space-x-2 text-xs text-slate-500 font-mono' },
      icon('code', 'w-4 h-4 text-indigo-500'),
      el('span', null, 'AST Parser · Detects Stale Closures, In-Place Mutations & Foreign React Hooks')
    ),
    el('div', { class: 'flex items-center space-x-2' },
      Show({
        when: () => codeInput.value.length > 0,
        children: () => el('button', {
          type: 'button',
          class: 'px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer',
          onClick: () => {
            codeInput.value = '';
            focusSearchInput();
          }
        }, 'Clear')
      }),
      el('button', {
        id: 'assistant-code-analyze-btn',
        type: 'button',
        'aria-label': 'Analyze and Fix Code',
        disabled: () => isLoading.value,
        class: 'px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition disabled:opacity-50 flex items-center space-x-2 shadow-md cursor-pointer hover:shadow-lg',
        onClick: () => handleCodeAnalyze()
      },
        icon('sparkles', 'w-4 h-4 text-indigo-200'),
        el('span', null, () => isLoading.value ? 'Analyzing...' : 'Analyze & Fix')
      )
    )
  );
  codeHelpSection.appendChild(codeActionBar);
  inputPanel.appendChild(codeHelpSection);

  // 3. TOPIC FILTERS (All 10 Categories)
  const topicFilterBox = el('div', { class: 'space-y-2 pt-2 border-t border-slate-100' },
    el('label', { class: 'block text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Topic Filters'),
    el('div', {
      role: 'group',
      'aria-label': 'Filter by topic category',
      class: 'flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs'
    },
      For({
        each: () => CATEGORY_FILTERS,
        key: (cat) => cat.id,
        children: (cat) => el('button', {
          type: 'button',
          class: () => {
            const isSelected = activeCategory.value === cat.id;
            return `px-3.5 py-1.5 rounded-xl font-semibold transition whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`;
          },
          onClick: () => {
            activeCategory.value = cat.id;
          }
        }, cat.label)
      })
    )
  );
  inputPanel.appendChild(topicFilterBox);

  // Suggested Quick Prompts Grid
  const promptPresets = [
    { label: '📡 Component Data Transfer', query: 'How do I transfer data between components?' },
    { label: '⚡ DOM Reactivity & Binding', query: 'How do I update the DOM reactively?' },
    { label: '📝 Task Form with Validation', query: 'Create a task form with validation.' },
    { label: '🐛 Debug Signal Not Updating', query: `import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';
export function Broken() {
  const count = signal(0);
  return el('div', null, count.value, el('button', { onClick: () => { count.value++; } }, '+'));
}` },
    { label: '⚛️ Convert React Hooks Code', query: `export function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => { console.log('Count:', count); }, [count]);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}` },
    { label: '🚨 Error Code: AETH-301', query: 'AETH-301' },
    { label: '🏗️ Full Component Architecture', query: 'How should I structure a full Samrey component with local signals and lifecycle?' },
    { label: '🌐 Fetch API & Loading States', query: 'How do I fetch API data?' }
  ];

  const quickPromptsBox = el('div', { class: 'space-y-2 pt-2 border-t border-slate-100' },
    el('label', { class: 'block text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Suggested Questions & Examples'),
    el('div', { class: 'flex flex-wrap gap-2' },
      For({
        each: () => promptPresets,
        key: (p) => p.label,
        children: (p) => el('button', {
          type: 'button',
          class: 'text-xs px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 transition font-medium cursor-pointer',
          onClick: () => {
            searchQuery.value = p.query;
            handleAsk(p.query);
          }
        }, p.label)
      })
    )
  );
  inputPanel.appendChild(quickPromptsBox);

  root.appendChild(inputPanel);

  // 4. LOADING STATE
  const loadingView = Show({
    when: () => isLoading.value,
    children: () => {
      const box = el('div', {
        id: 'assistant-loading-state',
        role: 'status',
        'aria-live': 'polite',
        class: 'p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col items-center justify-center space-y-4'
      });
      box.appendChild(
        el('div', { class: 'relative flex items-center justify-center' },
          el('div', { class: 'w-14 h-14 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin' }),
          el('div', { class: 'absolute' }, icon('sparkles', 'w-6 h-6 text-indigo-600'))
        )
      );
      box.appendChild(
        el('div', { class: 'text-center space-y-1' },
          el('h4', { class: 'text-base font-bold text-slate-900' }, () => loadingStage.value),
          el('p', { class: 'text-xs text-slate-500 font-mono' }, 'Grounded against official @samrey/* packages in v1.0.0')
        )
      );
      return box;
    }
  });
  root.appendChild(loadingView);

  // 5. ERROR BANNER
  const errorView = Show({
    when: () => !isLoading.value && !!errorMessage.value,
    children: () => {
      const box = el('div', {
        id: 'assistant-error-state',
        role: 'alert',
        class: 'p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-900 space-y-3'
      });
      box.appendChild(
        el('div', { class: 'flex items-center space-x-2 font-bold text-sm' },
          icon('alert-octagon', 'w-5 h-5 text-rose-600'),
          el('span', null, 'Query Error')
        )
      );
      box.appendChild(
        el('p', { class: 'text-sm text-rose-800' }, () => errorMessage.value)
      );
      return box;
    }
  });
  root.appendChild(errorView);

  // 6. STANDARDIZED RESPONSE CARD
  const answerView = Show({
    when: () => !isLoading.value && !errorMessage.value && !!currentAnswer.value,
    children: () => {
      const card = el('div', {
        id: 'assistant-answer-card',
        class: 'p-6 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-8 animate-in fade-in duration-300'
      });

      // Top Status Bar: Intent Badge + Category Badge + Verification Pill
      const statusBar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100' },
        el('div', { class: 'flex flex-wrap items-center gap-2' },
          // Intent Badge
          el('span', { class: 'px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-mono font-bold uppercase tracking-wider' },
            () => `INTENT: ${currentAnswer.value?.intentType || 'HOW_TO'}`
          ),
          // Category Pill
          el('span', { class: 'px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold capitalize' },
            () => `Category: ${currentAnswer.value?.category || 'General'}`
          )
        ),
        // Verification Badge
        el('div', {
          class: () => `flex items-center space-x-2 text-xs font-mono px-3 py-1 rounded-full border transition ${
            currentValidation.value.isValid
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`
        },
          icon(currentValidation.value.isValid ? 'check-circle' : 'alert-octagon', 'w-3.5 h-3.5'),
          el('span', { class: 'font-bold' }, () => currentValidation.value.badgeText)
        )
      );
      card.appendChild(statusBar);

      // Section 1: Answer
      const sectionAnswer = el('div', { class: 'space-y-2' },
        el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center space-x-1.5' },
          icon('message-square', 'w-4 h-4 text-indigo-600'),
          el('span', null, '1. Answer')
        ),
        el('h2', { class: 'text-xl sm:text-2xl font-bold text-slate-900' }, () => currentAnswer.value?.title || ''),
        el('p', { class: 'text-sm sm:text-base text-slate-800 font-medium leading-relaxed' },
          () => currentAnswer.value?.shortAnswer || ''
        )
      );
      card.appendChild(sectionAnswer);

      // Foreign Framework Translation Alert (if detected)
      const foreignAlert = Show({
        when: () => currentValidation.value.foreignApis.length > 0 || (currentCodeResult.value?.unsupportedApisFound?.length || 0) > 0,
        children: () => {
          const box = el('div', { class: 'p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-xs' },
            el('div', { class: 'font-bold text-amber-900 flex items-center space-x-1.5' },
              icon('alert-triangle', 'w-4 h-4 text-amber-600'),
              el('span', null, 'Foreign Framework Code Detected — Migrated to Native Samrey Architecture')
            ),
            el('p', { class: 'text-amber-800' },
              'This snippet uses foreign framework APIs (such as React hooks or Vue directives). Samrey components execute ONCE without a Virtual DOM, using fine-grained Signals for reactivity.'
            ),
            el('div', { class: 'space-y-1.5 pt-1' },
              For({
                each: () => currentValidation.value.foreignApis,
                key: (f) => f.name,
                children: (f) => el('div', { class: 'p-2.5 bg-white/90 rounded-xl border border-amber-200 font-mono' },
                  el('span', { class: 'font-bold text-amber-900' }, `Foreign API: ${f.name} (${f.framework})`),
                  el('div', { class: 'text-emerald-800 font-semibold' }, `↳ Samrey Alternative: ${f.samreyAlternative}`)
                )
              })
            )
          );
          return box;
        }
      });
      card.appendChild(foreignAlert);

      // Section 2: Approach
      const sectionApproach = el('div', { class: 'p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2' },
        el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, '2. Approach'),
        el('p', { class: 'text-sm text-slate-700 leading-relaxed' }, () => currentAnswer.value?.concept || ''),
        el('div', { class: 'pt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600' },
          el('span', { class: 'font-bold' }, 'Recommended API:'),
          el('code', { class: 'px-2 py-1 bg-white rounded-lg border border-slate-200 font-bold text-indigo-700' },
            () => currentAnswer.value?.recommendedApi || ''
          )
        )
      );
      card.appendChild(sectionApproach);

      // Section 3: Implementation (TypeScript Code with Action Buttons)
      const sectionImplementation = el('div', { class: 'space-y-3' },
        el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5' },
          icon('code', 'w-4 h-4 text-slate-700'),
          el('span', null, '3. Implementation')
        ),
        createCodeBlock(
          () => currentAnswer.value?.tsCodeExample || currentAnswer.value?.completeWorkingExample || '',
          'TypeScript',
          '@samrey/runtime v1.0.0'
        )
      );
      card.appendChild(sectionImplementation);

      // Section 4: Why it works
      const sectionWhy = el('div', { id: 'section-why-it-works', class: 'p-5 sm:p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3' },
        el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center space-x-1.5' },
          icon('cpu', 'w-4 h-4 text-indigo-600'),
          el('span', null, '4. Why It Works')
        ),
        el('p', { class: 'text-sm text-slate-700 leading-relaxed' },
          () => currentAnswer.value?.codeExplanation || currentAnswer.value?.howItWorks || ''
        ),
        Show({
          when: () => (currentAnswer.value?.commonMistakes?.length || 0) > 0,
          children: () => el('div', { class: 'pt-3 border-t border-indigo-100 space-y-2' },
            el('h4', { class: 'text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center space-x-1.5' },
              icon('alert-triangle', 'w-3.5 h-3.5 text-rose-600'),
              el('span', null, 'Common Mistakes & Pitfalls')
            ),
            el('ul', { class: 'list-disc list-inside space-y-1.5 text-xs text-rose-950 pl-1 font-medium' },
              For({
                each: () => currentAnswer.value?.commonMistakes || [],
                key: (m, i) => `${i}-${m.slice(0, 10)}`,
                children: (mistake) => el('li', { class: 'leading-relaxed' }, mistake)
              })
            )
          )
        })
      );
      card.appendChild(sectionWhy);

      // Section 5: Related APIs
      const sectionApis = Show({
        when: () => (currentAnswer.value?.relatedApis?.length || 0) > 0,
        children: () => {
          const block = el('div', { class: 'space-y-3' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '5. Related APIs'),
            el('div', { class: 'flex flex-wrap gap-2' },
              For({
                each: () => currentAnswer.value?.relatedApis || [],
                key: (a) => a,
                children: (apiName) => el('span', {
                  class: 'px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs font-semibold rounded-xl border border-slate-200 transition'
                }, apiName)
              })
            )
          );
          return block;
        }
      });
      card.appendChild(sectionApis);

      // Section 6: Verification (Rigorous Audit Details)
      const sectionVerification = el('div', {
        class: () => `p-5 rounded-2xl border space-y-3 text-xs ${
          currentValidation.value.isValid
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`
      },
        el('div', { class: 'flex items-center justify-between' },
          el('h3', { class: 'font-bold uppercase tracking-wider flex items-center space-x-1.5' },
            icon(currentValidation.value.isValid ? 'check-circle' : 'alert-octagon', 'w-4 h-4'),
            el('span', null, '6. Verification')
          ),
          el('span', { class: 'font-mono font-bold text-[11px]' }, () => currentValidation.value.badgeText)
        ),
        Show({
          when: () => currentValidation.value.isValid,
          children: () => el('ul', { class: 'space-y-1.5 pl-1 font-medium' },
            For({
              each: () => currentValidation.value.passedChecks,
              key: (c) => c,
              children: (c) => el('li', { class: 'flex items-center space-x-2 text-emerald-900' },
                icon('check', 'w-3.5 h-3.5 text-emerald-600'),
                el('span', null, c)
              )
            })
          )
        }),
        Show({
          when: () => !currentValidation.value.isValid,
          children: () => el('div', { class: 'space-y-2' },
            el('p', { class: 'font-semibold text-rose-900' }, 'Validation detected the following errors in the generated solution:'),
            el('ul', { class: 'list-disc list-inside space-y-1 text-rose-800 font-mono pl-1' },
              For({
                each: () => currentValidation.value.errors,
                key: (e) => e,
                children: (err) => el('li', null, err)
              })
            )
          )
        })
      );
      card.appendChild(sectionVerification);

      // Section 7: Documentation Links
      const sectionDocs = Show({
        when: () => (currentAnswer.value?.docLinks?.length || 0) > 0,
        children: () => {
          const block = el('div', { class: 'pt-4 border-t border-slate-100 space-y-3' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5' },
              icon('book-open', 'w-4 h-4 text-slate-700'),
              el('span', null, 'Relevant Samrey Documentation References')
            ),
            el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              For({
                each: () => currentAnswer.value?.docLinks || [],
                key: (l) => l.url,
                children: (link) => el('a', {
                  href: link.url,
                  class: 'p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl transition flex items-center justify-between text-xs font-semibold text-slate-800 hover:text-indigo-900 group cursor-pointer'
                },
                  el('div', { class: 'space-y-1' },
                    el('span', { class: 'block font-medium' }, link.label),
                    Show({
                      when: () => !!link.sourcePath,
                      children: () => el('span', { class: 'block font-mono text-[10px] text-slate-400' }, link.sourcePath || '')
                    })
                  ),
                  icon('external-link', 'w-4 h-4 text-slate-400 group-hover:text-indigo-600')
                )
              })
            )
          );
          return block;
        }
      });
      card.appendChild(sectionDocs);

      // Feedback Bar
      const feedbackBar = el('div', { class: 'pt-6 border-t border-slate-100' },
        createFeedbackBar()
      );
      card.appendChild(feedbackBar);

      // Follow-up Input Bar + "Ask another question" Button
      const followUpBar = el('div', { class: 'pt-6 border-t border-slate-100 space-y-4' },
        el('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
          el('h4', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Ask a Follow-Up Question'),
          el('button', {
            type: 'button',
            class: 'px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-2 cursor-pointer',
            onClick: handleReset
          },
            icon('search', 'w-3.5 h-3.5 text-indigo-400'),
            el('span', null, 'Ask another question')
          )
        ),
        el('div', { class: 'flex space-x-2' },
          el('input', {
            id: 'assistant-follow-up-input',
            type: 'text',
            'aria-label': 'Follow-up question input',
            placeholder: 'e.g. "How does this compare to React?", "How do I test this with @samrey/testing?"',
            class: 'flex-1 px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-2xl text-xs sm:text-sm outline-hidden text-slate-900 transition shadow-inner',
            value: () => followUpText.value,
            onInput: (e: Event) => {
              followUpText.value = (e.target as HTMLInputElement).value;
            },
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFollowUp();
              }
            }
          }),
          el('button', {
            type: 'button',
            class: 'px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs',
            onClick: handleFollowUp
          }, 'Send')
        )
      );
      card.appendChild(followUpBar);

      return card;
    }
  });
  root.appendChild(answerView);

  // 7. CONVERSATION HISTORY SECTION
  const conversationSection = Show({
    when: () => conversationHistory.value.length > 1,
    children: () => {
      const histContainer = el('div', { class: 'p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4' },
        el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2' },
          icon('clock', 'w-4 h-4 text-slate-600'),
          el('span', null, 'Previous Queries in this Session')
        ),
        el('div', { class: 'space-y-2.5' },
          For({
            each: () => conversationHistory.value,
            key: (h, i) => `${i}-${h.query.slice(0, 15)}`,
            children: (item) => el('div', {
              class: 'p-3.5 bg-slate-50 hover:bg-indigo-50/60 rounded-2xl border border-slate-200/80 transition flex items-center justify-between cursor-pointer',
              onClick: () => {
                currentAnswer.value = item.answer;
                searchQuery.value = item.query;
                feedbackState.value = 'none';
              }
            },
              el('div', { class: 'space-y-1' },
                el('p', { class: 'text-xs sm:text-sm font-semibold text-slate-800' }, `Q: "${item.query.slice(0, 60)}${item.query.length > 60 ? '...' : ''}"`),
                el('p', { class: 'text-xs text-slate-500 line-clamp-1' }, item.answer.shortAnswer)
              ),
              icon('arrow-right', 'w-4 h-4 text-slate-400')
            )
          })
        )
      );
      return histContainer;
    }
  });
  root.appendChild(conversationSection);

  // 8. DEFAULT EMPTY STATE (Topics & FAQ)
  const emptyStateView = Show({
    when: () => !isLoading.value && !currentAnswer.value,
    children: () => {
      const guide = el('div', { class: 'space-y-8' });

      // Topics Grid
      const topicGrid = el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' });
      const topics = [
        {
          title: 'Reactivity & State',
          desc: 'Learn about signal(), computed(), effect(), and createStore(). Single-execution paradigm.',
          prompt: 'How do I create a store?'
        },
        {
          title: 'Fine-Grained DOM Bindings',
          desc: 'Understand native el(), Show(), and For() control flow with zero VDOM overhead.',
          prompt: 'How do I update the DOM reactively?'
        },
        {
          title: 'Component Communication',
          desc: 'Pass typed props, share signals, and inject dependencies with createContext.',
          prompt: 'How do I transfer data between components?'
        },
        {
          title: 'Forms & Standard Schema',
          desc: 'Build type-safe forms with createForm(), field validation, and Zod/Valibot integration.',
          prompt: 'How do I validate a form?'
        },
        {
          title: 'HTTP & Data Fetching',
          desc: 'Fetch data declaratively with createHttpClient() and resource() with reactive loading states.',
          prompt: 'How do I fetch API data?'
        },
        {
          title: 'Router & Navigation',
          desc: 'Configure client-side routing with createRouter(), Route components, and useParams().',
          prompt: 'How do I create a route?'
        },
        {
          title: 'SSR & Hydration',
          desc: 'Stream HTML with renderToString() / renderToStream() and hydrate seamlessly.',
          prompt: 'How do I implement SSR?'
        },
        {
          title: 'Zero-Eval Security',
          desc: 'Learn how Samrey guarantees protection against XSS and template injection.',
          prompt: 'How do I prevent XSS?'
        },
        {
          title: 'Testing & Harness',
          desc: 'Assert component state and simulate events with renderTest() and fireEvent().',
          prompt: 'How do I test a component?'
        }
      ];

      for (const t of topics) {
        const topicCard = el('div', {
          class: 'p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition space-y-3 flex flex-col justify-between'
        },
          el('div', { class: 'space-y-1.5' },
            el('h4', { class: 'text-sm font-bold text-slate-900' }, t.title),
            el('p', { class: 'text-xs text-slate-500 leading-relaxed' }, t.desc)
          ),
          el('button', {
            type: 'button',
            class: 'text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1.5 cursor-pointer pt-2',
            onClick: () => {
              searchQuery.value = t.prompt;
              handleAsk(t.prompt);
            }
          },
            el('span', null, `Try: "${t.prompt}"`),
            icon('arrow-right', 'w-3.5 h-3.5')
          )
        );
        topicGrid.appendChild(topicCard);
      }
      guide.appendChild(topicGrid);

      // FAQ Section
      const faqContainer = el('div', { class: 'p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-5' },
        el('div', { class: 'flex items-center justify-between' },
          el('h3', { class: 'text-base font-bold text-slate-900 flex items-center space-x-2' },
            icon('book-open', 'w-4 h-4 text-slate-700'),
            el('span', null, 'Frequently Asked Developer Questions')
          ),
          el('button', {
            type: 'button',
            class: 'text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer',
            onClick: () => {
              isFaqExpanded.value = !isFaqExpanded.value;
            }
          }, () => isFaqExpanded.value ? 'Collapse FAQ' : 'Expand All')
        ),
        el('div', { class: 'divide-y divide-slate-100 space-y-3 pt-2' },
          For({
            each: () => FAQ_ENTRIES,
            key: (item) => item.question,
            children: (item) => el('div', { class: 'pt-3 space-y-1' },
              el('button', {
                type: 'button',
                class: 'text-left w-full text-sm font-semibold text-slate-800 hover:text-indigo-600 transition flex items-center justify-between cursor-pointer',
                onClick: () => {
                  searchQuery.value = item.question;
                  handleAsk(item.question);
                }
              },
                el('span', null, item.question),
                icon('chevron-right', 'w-4 h-4 text-slate-400')
              ),
              el('p', { class: 'text-xs text-slate-500' }, item.summary)
            )
          })
        )
      );
      guide.appendChild(faqContainer);

      return guide;
    }
  });
  root.appendChild(emptyStateView);

  // 9. PLAYGROUND MODAL
  const playgroundModalNode = PlaygroundModal({
    isOpen: isPlaygroundOpen,
    code: playgroundCode,
    title: playgroundTitle,
    onClose: () => { isPlaygroundOpen.value = false; }
  });
  root.appendChild(playgroundModalNode);

  return root;
}
