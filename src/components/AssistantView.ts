/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant View
 *
 * 100% Native Samrey Component utilizing @samrey/runtime and @samrey/reactivity.
 * Production-Quality UX Pass:
 * 1. Fast, accessible search experience with Cmd+K / / shortcut and clear controls
 * 2. 9 Priority Suggested Questions prominently accessible
 * 3. Reusable Code Blocks with high-contrast styling and interactive Copy buttons
 * 4. "Was this helpful?" feedback control with persistent reactive state
 * 5. "Ask another question" navigation button with focus management
 * 6. Dynamic Related Questions and Related Documentation cards
 * 7. Multi-stage animated loading indicators and resilient error states
 * 8. Full mobile responsiveness, keyboard navigation, and dark/light compatibility
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

export function AssistantView(): HTMLElement {
  const provider = new SmartAssistantProvider();

  // Assistant Mode: Knowledge Q&A / Recipes OR Code Help & Fixer
  const activeTab = signal<'qa' | 'code_help'>('qa');

  // State for Q&A
  const searchQuery = signal<string>('');
  const activeCategory = signal<string>('all');
  const isLoading = signal<boolean>(false);
  const loadingStage = signal<string>('Querying Samrey v1.0.0 Knowledge Base...');
  const errorMessage = signal<string | null>(null);
  const currentAnswer = signal<AssistantAnswer | null>(null);
  const conversationHistory = signal<Array<{ query: string; answer: AssistantAnswer }>>([]);
  const followUpText = signal<string>('');
  const isFaqExpanded = signal<boolean>(false);

  // Feedback State for active answer: 'none' | 'helpful' | 'unhelpful'
  const feedbackState = signal<'none' | 'helpful' | 'unhelpful'>('none');
  const codeFeedbackState = signal<'none' | 'helpful' | 'unhelpful'>('none');

  // State for Code Help & Fixer
  const codeInput = signal<string>(`import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function BrokenCounter() {
  const count = signal(0);
  
  // Notice: count.value evaluated once at initialization
  return el('div', { class: 'space-y-2' },
    el('p', null, count.value),
    el('button', { onClick: () => { count.value++; } }, 'Increment')
  );
}`);
  const codeQuestion = signal<string>("Why isn't my signal updating?");
  const isCodeLoading = signal<boolean>(false);
  const codeErrorMessage = signal<string | null>(null);
  const currentCodeResult = signal<CodeHelpResult | null>(null);

  // Focus helper for search input
  const focusSearchInput = () => {
    if (typeof document !== 'undefined') {
      const input = document.getElementById('assistant-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Keyboard shortcut listener (/ or Cmd+K / Ctrl+K)
  if (typeof window !== 'undefined') {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        activeTab.value = 'qa';
        focusSearchInput();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
  }

  // Submit search query
  const handleSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery.value).trim();
    if (!q || isLoading.value) return;

    isLoading.value = true;
    errorMessage.value = null;
    searchQuery.value = q;
    feedbackState.value = 'none';
    loadingStage.value = 'Querying Samrey v1.0.0 Knowledge Base...';

    // Simulate progressive loading steps for smooth UX
    const stageTimer = setTimeout(() => {
      if (isLoading.value) {
        loadingStage.value = 'Synthesizing idiomatic implementation steps and TypeScript examples...';
      }
    }, 180);

    try {
      const historyPayload: ChatMessage[] = [];
      for (const item of conversationHistory.value) {
        historyPayload.push({ role: 'user', content: item.query });
        historyPayload.push({ role: 'assistant', content: item.answer.shortAnswer });
      }

      const answer = await provider.askQuestion(q, historyPayload);
      currentAnswer.value = answer;

      // Add to conversation history if not duplicate of latest
      const history = conversationHistory.value;
      if (history.length === 0 || history[history.length - 1].query !== q) {
        conversationHistory.set([...history, { query: q, answer }]);
      }
    } catch (err: any) {
      errorMessage.value = err?.message || 'Failed to retrieve answer from Samrey Developer Assistant. Please check your query and try again.';
    } finally {
      clearTimeout(stageTimer);
      isLoading.value = false;
    }
  };

  // Submit follow-up question
  const handleFollowUp = async () => {
    const q = followUpText.value.trim();
    if (!q || isLoading.value) return;
    followUpText.value = '';
    await handleSearch(q);
  };

  // Reset and ask another question
  const handleAskAnother = () => {
    feedbackState.value = 'none';
    followUpText.value = '';
    errorMessage.value = null;
    focusSearchInput();
  };

  // Analyze and Fix Code
  const handleAnalyzeCode = async () => {
    const code = codeInput.value.trim();
    if (!code || isCodeLoading.value) return;

    isCodeLoading.value = true;
    codeErrorMessage.value = null;
    codeFeedbackState.value = 'none';

    try {
      const result = await provider.analyzeCode({
        code,
        question: codeQuestion.value.trim()
      });
      currentCodeResult.value = result;
    } catch (err: any) {
      codeErrorMessage.value = err?.message || 'Failed to analyze code. Please try again.';
    } finally {
      isCodeLoading.value = false;
    }
  };

  // Helper: Reusable syntax code block with copy button
  const createCodeBlock = (codeGetter: () => string, langLabel = 'TypeScript', badgeText?: string): HTMLElement => {
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
        // Fallback for clipboard restrictions
      }
    };

    return el('div', { class: 'rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md space-y-0' },
      // Code Block Header Bar
      el('div', { class: 'flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs' },
        el('div', { class: 'flex items-center space-x-2' },
          el('div', { class: 'flex space-x-1.5' },
            el('span', { class: 'w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block' }),
            el('span', { class: 'w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block' }),
            el('span', { class: 'w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block' })
          ),
          el('span', { class: 'text-slate-400 font-mono text-[11px] font-medium ml-1' }, langLabel),
          badgeText ? el('span', { class: 'px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-mono text-[10px]' }, badgeText) : null
        ),
        el('button', {
          type: 'button',
          'aria-label': 'Copy code to clipboard',
          class: () => `px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
            isCopied.value
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
          }`,
          onClick: handleCopy
        },
          icon(isCopied.value ? 'check' : 'copy', 'w-3.5 h-3.5'),
          el('span', null, () => isCopied.value ? 'Copied!' : 'Copy Code')
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
  const createFeedbackBar = (stateSignal: ReturnType<typeof signal<'none' | 'helpful' | 'unhelpful'>>): HTMLElement => {
    return el('div', {
      class: 'p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs'
    },
      Show({
        when: () => stateSignal.value === 'none',
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
              onClick: () => { stateSignal.value = 'helpful'; }
            },
              icon('thumbs-up', 'w-3.5 h-3.5 text-emerald-600'),
              el('span', null, 'Yes, helpful')
            ),
            el('button', {
              type: 'button',
              'aria-label': 'Mark answer as not helpful',
              class: 'px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-300 hover:border-rose-300 font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs',
              onClick: () => { stateSignal.value = 'unhelpful'; }
            },
              icon('thumbs-down', 'w-3.5 h-3.5 text-rose-600'),
              el('span', null, 'Needs improvement')
            )
          )
        )
      }),
      Show({
        when: () => stateSignal.value === 'helpful',
        children: () => el('div', { class: 'flex items-center space-x-2 text-emerald-700 font-medium' },
          icon('check-circle', 'w-4 h-4 text-emerald-600'),
          el('span', null, 'Thank you for your feedback! Glad this recipe helped your workflow.')
        )
      }),
      Show({
        when: () => stateSignal.value === 'unhelpful',
        children: () => el('div', { class: 'flex items-center space-x-2 text-slate-600 font-medium' },
          icon('alert-circle', 'w-4 h-4 text-slate-500'),
          el('span', null, 'Thank you for your feedback. We continuously refine the Samrey documentation recipes.')
        )
      })
    );
  };

  // Helper: "Ask another question" button
  const createAskAnotherButton = (): HTMLElement => {
    return el('button', {
      type: 'button',
      'aria-label': 'Ask another development question',
      class: 'px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center space-x-2 shadow-xs cursor-pointer',
      onClick: handleAskAnother
    },
      icon('search', 'w-4 h-4 text-indigo-400'),
      el('span', null, 'Ask another question')
    );
  };

  // Container
  const root = el('div', { class: 'space-y-8 pb-16', id: 'samrey-assistant-view' });

  // 1. Hero Header & Introduction
  const heroSection = el('div', {
    class: 'relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-10 text-white shadow-xl border border-slate-700'
  },
    el('div', { class: 'relative z-10 max-w-3xl space-y-4' },
      el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-medium' },
        icon('sparkles', 'w-3.5 h-3.5 text-indigo-400'),
        el('span', null, 'Samrey Framework v1.0.0 Assistant, Recipes & Code Help')
      ),
      el('h1', { class: 'text-3xl sm:text-4xl font-extrabold tracking-tight text-white' },
        'Samrey Developer Assistant'
      ),
      el('p', { class: 'text-sm sm:text-base text-slate-300 leading-relaxed' },
        'Search repository documentation, browse implementation recipes, or paste TypeScript/Samrey code for instant diagnostics, bug fixes, and foreign API warnings.'
      )
    )
  );
  root.appendChild(heroSection);

  // 2. Mode Navigation Tabs
  const modeSwitcher = el('div', {
    role: 'tablist',
    'aria-label': 'Assistant View Modes',
    class: 'flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit max-w-full overflow-x-auto space-x-1.5 shadow-inner'
  },
    el('button', {
      id: 'tab-assistant-qa',
      role: 'tab',
      'aria-selected': () => activeTab.value === 'qa' ? 'true' : 'false',
      'aria-controls': 'samrey-qa-view',
      type: 'button',
      class: () => `px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center space-x-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-hidden ${
        activeTab.value === 'qa'
          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`,
      onClick: () => { activeTab.value = 'qa'; }
    },
      icon('book-open', 'w-4 h-4 text-indigo-600'),
      el('span', null, 'Documentation & Recipes')
    ),
    el('button', {
      id: 'tab-assistant-code-help',
      role: 'tab',
      'aria-selected': () => activeTab.value === 'code_help' ? 'true' : 'false',
      'aria-controls': 'samrey-code-help-view',
      type: 'button',
      class: () => `px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center space-x-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-hidden ${
        activeTab.value === 'code_help'
          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`,
      onClick: () => { activeTab.value = 'code_help'; }
    },
      icon('code', 'w-4 h-4 text-indigo-600'),
      el('span', null, 'Code Help & Fixer'),
      el('span', { class: 'px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold' }, 'NEW')
    )
  );
  root.appendChild(modeSwitcher);

  // ==========================================
  // VIEW A: Documentation & Recipes Search View
  // ==========================================
  const qaContainer = Show({
    when: () => activeTab.value === 'qa',
    children: () => {
      const qaWrapper = el('div', {
        class: 'space-y-8',
        id: 'samrey-qa-view',
        role: 'tabpanel',
        'aria-labelledby': 'tab-assistant-qa'
      });

      // Search & Query Input Box
      const searchContainer = el('div', {
        class: 'p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5'
      });

      // Search Input Row with clear button and keyboard hint
      const inputWrapper = el('div', { class: 'relative flex items-center' });

      const searchIcon = el('div', {
        class: 'absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
      }, icon('search', 'w-5 h-5'));
      inputWrapper.appendChild(searchIcon);

      const searchInput = el('input', {
        id: 'assistant-search-input',
        type: 'text',
        'aria-label': 'Search Samrey framework documentation and implementation recipes',
        placeholder: 'Ask a question (e.g. "How do I validate a form?" or "How do I create a store?")...',
        class: 'w-full pl-12 pr-36 py-4 text-sm sm:text-base bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-2xl focus:ring-2 focus:ring-indigo-600/20 transition outline-hidden font-medium text-slate-900 shadow-inner',
        value: () => searchQuery.value,
        onInput: (e: Event) => {
          searchQuery.value = (e.target as HTMLInputElement).value;
        },
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
          }
        }
      });
      inputWrapper.appendChild(searchInput);

      // Search Actions (Clear button + Submit button)
      const searchButtonsGroup = el('div', { class: 'absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1.5' });

      // Clear button (shown when search text exists)
      const clearBtn = Show({
        when: () => searchQuery.value.length > 0,
        children: () => el('button', {
          type: 'button',
          'aria-label': 'Clear search input',
          class: 'p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer',
          onClick: () => {
            searchQuery.value = '';
            focusSearchInput();
          }
        }, icon('x', 'w-4 h-4'))
      });
      searchButtonsGroup.appendChild(clearBtn);

      const submitButton = el('button', {
        id: 'assistant-submit-btn',
        type: 'button',
        'aria-label': 'Submit search question',
        disabled: () => isLoading.value,
        class: 'px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 flex items-center space-x-1.5 shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600',
        onClick: () => handleSearch()
      },
        icon('sparkles', 'w-4 h-4 text-indigo-400'),
        el('span', null, () => isLoading.value ? 'Searching...' : 'Ask AI')
      );
      searchButtonsGroup.appendChild(submitButton);
      inputWrapper.appendChild(searchButtonsGroup);
      searchContainer.appendChild(inputWrapper);

      // Category Filter Pills
      const categoryPills = el('div', {
        role: 'group',
        'aria-label': 'Filter by topic category',
        class: 'flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs'
      });
      for (const cat of CATEGORY_FILTERS) {
        const pill = el('button', {
          type: 'button',
          class: () => {
            const isSelected = activeCategory.value === cat.id;
            return `px-3.5 py-1.5 rounded-xl font-semibold transition whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-hidden ${
              isSelected
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`;
          },
          onClick: () => {
            activeCategory.value = cat.id;
          }
        }, cat.label);
        categoryPills.appendChild(pill);
      }
      searchContainer.appendChild(categoryPills);

      // Priority Suggested Questions (9 Explicit Questions)
      const promptSuggestions = el('div', { class: 'space-y-3 pt-3 border-t border-slate-100' });
      promptSuggestions.appendChild(
        el('div', { class: 'flex items-center justify-between' },
          el('div', { class: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5' },
            icon('zap', 'w-4 h-4 text-amber-500'),
            el('span', null, 'Suggested Questions & Common Tasks')
          ),
          el('span', { class: 'text-[11px] text-slate-400 font-mono hidden sm:inline' }, 'Press / to focus search')
        )
      );

      const chipsGrid = el('div', { class: 'flex flex-wrap gap-2' });
      for (const promptText of POPULAR_PROMPTS) {
        const chip = el('button', {
          type: 'button',
          class: 'text-left text-xs px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50/80 text-slate-800 hover:text-indigo-900 border border-slate-200/80 hover:border-indigo-300 transition font-medium cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-hidden',
          onClick: () => {
            searchQuery.value = promptText;
            handleSearch(promptText);
          }
        },
          el('span', { class: 'text-indigo-600 mr-1 font-bold' }, '•'),
          el('span', null, promptText)
        );
        chipsGrid.appendChild(chip);
      }
      promptSuggestions.appendChild(chipsGrid);
      searchContainer.appendChild(promptSuggestions);
      qaWrapper.appendChild(searchContainer);

      // Loading State Indicator with Animated Status
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
            el('div', { class: 'text-center space-y-2' },
              el('h4', { class: 'text-base font-bold text-slate-900' }, 'Samrey Developer Assistant'),
              el('p', { class: 'text-xs text-indigo-700 font-mono font-medium animate-pulse' }, () => loadingStage.value)
            )
          );
          return box;
        }
      });
      qaWrapper.appendChild(loadingView);

      // Error State Banner
      const errorView = Show({
        when: () => !isLoading.value && !!errorMessage.value,
        children: () => {
          const box = el('div', {
            id: 'assistant-error-state',
            role: 'alert',
            class: 'p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-900 space-y-4 shadow-sm'
          });
          box.appendChild(
            el('div', { class: 'flex items-center space-x-2.5 font-bold text-base text-rose-900' },
              icon('alert-octagon', 'w-5 h-5 text-rose-600'),
              el('span', null, 'Assistant Response Error')
            )
          );
          box.appendChild(
            el('p', { class: 'text-sm text-rose-800 leading-relaxed' }, () => errorMessage.value)
          );
          box.appendChild(
            el('div', { class: 'flex items-center space-x-3 pt-1' },
              el('button', {
                type: 'button',
                class: 'px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs',
                onClick: () => handleSearch()
              }, 'Retry Search'),
              el('button', {
                type: 'button',
                class: 'px-4 py-2 bg-white hover:bg-rose-100/60 text-rose-800 text-xs font-semibold rounded-xl border border-rose-300 transition cursor-pointer',
                onClick: () => {
                  errorMessage.value = null;
                  focusSearchInput();
                }
              }, 'Clear Error')
            )
          );
          return box;
        }
      });
      qaWrapper.appendChild(errorView);

      // Active Answer View (Strict 12-Section Architecture with Full UX Pass)
      const answerView = Show({
        when: () => !isLoading.value && !errorMessage.value && !!currentAnswer.value,
        children: () => {
          const card = el('div', {
            id: 'assistant-answer-card',
            class: 'p-6 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-lg space-y-8 transition duration-200'
          });

          // Top Status Bar
          const statusBar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100' },
            el('div', { class: 'flex flex-wrap items-center gap-2' },
              el('span', { class: 'px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-mono font-bold uppercase' },
                () => currentAnswer.value?.category || 'GENERAL'
              ),
              el('span', { class: () => `px-3 py-1 rounded-full text-xs font-medium border ${currentAnswer.value?.isRecipe ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : currentAnswer.value?.isDirectMatch ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-indigo-50 text-indigo-800 border-indigo-200'}` },
                () => currentAnswer.value?.isRecipe ? '📋 Implementation Recipe' : currentAnswer.value?.isDirectMatch ? '⚡ Direct Match' : '✨ Grounded Search & AI'
              ),
              el('span', { class: 'text-xs text-slate-500 font-mono hidden md:inline' },
                () => `Q: "${currentAnswer.value?.query}"`
              )
            ),
            el('div', { class: 'flex items-center space-x-3' },
              el('div', { class: 'flex items-center space-x-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200' },
                icon('check-circle', 'w-3.5 h-3.5 text-emerald-600'),
                el('span', null, 'Samrey v1.0.0 Verified')
              ),
              createAskAnotherButton()
            )
          );
          card.appendChild(statusBar);

          // Retrieved Grounded Sources Badges
          const sourcesBadgeBar = Show({
            when: () => !!currentAnswer.value?.sourceFiles && (currentAnswer.value?.sourceFiles?.length || 0) > 0,
            children: () => {
              const bar = el('div', { class: 'flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600' },
                el('span', { class: 'font-semibold text-slate-700 flex items-center space-x-1.5' },
                  icon('book-open', 'w-3.5 h-3.5 text-indigo-600'),
                  el('span', null, 'Verified Repository Sources:')
                ),
                For({
                  each: () => currentAnswer.value?.sourceFiles || [],
                  key: (f) => f,
                  children: (file) => el('span', { class: 'px-2.5 py-0.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 text-[11px]' }, `📄 ${file}`)
                })
              );
              return bar;
            }
          });
          card.appendChild(sourcesBadgeBar);

          // Main Title
          const titleEl = el('h2', { class: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug' },
            () => currentAnswer.value?.title || 'Samrey Solution'
          );
          card.appendChild(titleEl);

          // Section 1: Problem / Short Answer
          const section1 = el('div', { class: 'p-5 sm:p-6 bg-indigo-50/80 border border-indigo-100 rounded-2xl space-y-2' },
            el('div', { class: 'text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center space-x-1.5' },
              icon('sparkles', 'w-4 h-4 text-indigo-600'),
              el('span', null, () => currentAnswer.value?.isRecipe ? '1. Problem' : '1. Short Answer')
            ),
            el('p', { class: 'text-sm sm:text-base text-indigo-950 font-medium leading-relaxed' },
              () => (currentAnswer.value?.problem || currentAnswer.value?.shortAnswer || '')
            )
          );
          card.appendChild(section1);

          // Section 2: Samrey Concept
          const section2 = el('div', { class: 'space-y-2' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' },
              () => currentAnswer.value?.isRecipe ? '2. Samrey Concept' : '2. Core Architectural Concept'
            ),
            el('p', { class: 'text-sm sm:text-base text-slate-700 leading-relaxed' },
              () => (currentAnswer.value?.samreyConcept || currentAnswer.value?.concept || '')
            )
          );
          card.appendChild(section2);

          // Section 3: Recommended Samrey API
          const section3 = el('div', { class: 'p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, '3. Recommended API'),
            el('div', { class: 'text-sm sm:text-base font-mono font-semibold text-slate-900' },
              () => currentAnswer.value?.recommendedApi || ''
            )
          );
          card.appendChild(section3);

          // Section 4: When to Use It
          const section4 = el('div', { class: 'space-y-2' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '4. When to Use'),
            el('p', { class: 'text-sm sm:text-base text-slate-700 leading-relaxed' },
              () => currentAnswer.value?.whenToUse || ''
            )
          );
          card.appendChild(section4);

          // Section 5: Implementation Steps
          const section5 = Show({
            when: () => (currentAnswer.value?.implementationSteps?.length || 0) > 0,
            children: () => {
              const block = el('div', { class: 'space-y-3' },
                el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '5. Implementation Steps'),
                el('ol', { class: 'list-decimal list-inside space-y-2 text-sm text-slate-700 pl-1' },
                  For({
                    each: () => currentAnswer.value?.implementationSteps || [],
                    key: (step, i) => `${i}-${step.slice(0, 10)}`,
                    children: (step) => el('li', { class: 'leading-relaxed font-medium' }, step)
                  })
                )
              );
              return block;
            }
          });
          card.appendChild(section5);

          // Section 6: Implementation / TypeScript Code Example (With Reusable CodeBlock)
          const section6 = el('div', { class: 'space-y-3' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5' },
              icon('code', 'w-4 h-4 text-slate-700'),
              el('span', null, () => currentAnswer.value?.isRecipe ? '6. Implementation' : '6. TypeScript Code Example')
            ),
            createCodeBlock(
              () => currentAnswer.value?.tsCodeExample || '',
              'TypeScript',
              '@samrey/runtime'
            )
          );
          card.appendChild(section6);

          // Section 7: Complete Working Example (With Reusable CodeBlock)
          const section7 = Show({
            when: () => !!currentAnswer.value?.completeWorkingExample,
            children: () => {
              const block = el('div', { class: 'space-y-3' },
                el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '7. Complete Working Component'),
                createCodeBlock(
                  () => currentAnswer.value?.completeWorkingExample || '',
                  'TypeScript',
                  'Executable Example'
                )
              );
              return block;
            }
          });
          card.appendChild(section7);

          // Section 8: How It Works / Code Breakdown
          const section8 = el('div', { class: 'space-y-2' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' },
              () => currentAnswer.value?.isRecipe ? '8. How It Works' : '8. Code Breakdown & Architectural Behavior'
            ),
            el('p', { class: 'text-sm sm:text-base text-slate-700 leading-relaxed' },
              () => currentAnswer.value?.codeExplanation || ''
            )
          );
          card.appendChild(section8);

          // Section 9: Alternative Samrey Approach
          const section9 = Show({
            when: () => !!currentAnswer.value?.alternativeApproach,
            children: () => {
              const block = el('div', { class: 'p-4 sm:p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5' },
                el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-amber-800' }, '9. Alternative Approach'),
                el('p', { class: 'text-sm text-amber-950 leading-relaxed' }, () => currentAnswer.value?.alternativeApproach || '')
              );
              return block;
            }
          });
          card.appendChild(section9);

          // Section 10: Common Mistakes
          const section10 = Show({
            when: () => (currentAnswer.value?.commonMistakes?.length || 0) > 0,
            children: () => {
              const block = el('div', { class: 'p-5 sm:p-6 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3' },
                el('div', { class: 'text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center space-x-1.5' },
                  icon('alert-triangle', 'w-4 h-4 text-rose-600'),
                  el('span', null, '10. Common Mistakes & Pitfalls')
                ),
                el('ul', { class: 'list-disc list-inside space-y-2 text-xs sm:text-sm text-rose-950 pl-1' },
                  For({
                    each: () => currentAnswer.value?.commonMistakes || [],
                    key: (m, i) => `${i}-${m.slice(0, 10)}`,
                    children: (mistake) => el('li', { class: 'leading-relaxed font-medium' }, mistake)
                  })
                )
              );
              return block;
            }
          });
          card.appendChild(section10);

          // Section 11: Related @samrey APIs
          const section11 = Show({
            when: () => (currentAnswer.value?.relatedApis?.length || 0) > 0,
            children: () => {
              const block = el('div', { class: 'space-y-3' },
                el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '11. Related @samrey APIs'),
                el('div', { class: 'flex flex-wrap gap-2' },
                  For({
                    each: () => currentAnswer.value?.relatedApis || [],
                    key: (a) => a,
                    children: (apiName) => el('span', { class: 'px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs font-semibold rounded-xl border border-slate-200 transition' }, apiName)
                  })
                )
              );
              return block;
            }
          });
          card.appendChild(section11);

          // Section 12: Related Documentation Links
          const section12 = Show({
            when: () => (currentAnswer.value?.docLinks?.length || 0) > 0,
            children: () => {
              const block = el('div', { class: 'pt-4 border-t border-slate-100 space-y-3' },
                el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5' },
                  icon('book-open', 'w-4 h-4 text-slate-700'),
                  el('span', null, '12. Relevant Samrey Documentation')
                ),
                el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                  For({
                    each: () => currentAnswer.value?.docLinks || [],
                    key: (l) => l.url,
                    children: (link) => {
                      return el('a', {
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
                      );
                    }
                  })
                )
              );
              return block;
            }
          });
          card.appendChild(section12);

          // Feedback Control: "Was this helpful?"
          const feedbackSection = el('div', { class: 'pt-6 border-t border-slate-100' },
            createFeedbackBar(feedbackState)
          );
          card.appendChild(feedbackSection);

          // Follow-up Input Bar + "Ask another question" Button
          const followUpBar = el('div', { class: 'pt-6 border-t border-slate-100 space-y-4' },
            el('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
              el('h4', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Ask a Follow-Up Question'),
              createAskAnotherButton()
            ),
            el('div', { class: 'flex space-x-2' },
              el('input', {
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
      qaWrapper.appendChild(answerView);

      // Conversation History Section
      const conversationSection = Show({
        when: () => conversationHistory.value.length > 1,
        children: () => {
          const histContainer = el('div', { class: 'p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4' });
          histContainer.appendChild(
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2' },
              icon('clock', 'w-4 h-4 text-slate-600'),
              el('span', null, 'Previous Queries in this Session')
            )
          );

          const list = el('div', { class: 'space-y-2.5' });
          For({
            each: () => conversationHistory.value,
            key: (h, i) => `${i}-${h.query}`,
            children: (item) => {
              return el('div', {
                class: 'p-3.5 bg-slate-50 hover:bg-indigo-50/60 rounded-2xl border border-slate-200/80 transition flex items-center justify-between cursor-pointer',
                onClick: () => {
                  currentAnswer.value = item.answer;
                  searchQuery.value = item.query;
                  feedbackState.value = 'none';
                }
              },
                el('div', { class: 'space-y-1' },
                  el('p', { class: 'text-xs sm:text-sm font-semibold text-slate-800' }, `Q: "${item.query}"`),
                  el('p', { class: 'text-xs text-slate-500 line-clamp-1' }, item.answer.shortAnswer)
                ),
                icon('arrow-right', 'w-4 h-4 text-slate-400')
              );
            }
          });
          histContainer.appendChild(list);
          return histContainer;
        }
      });
      qaWrapper.appendChild(conversationSection);

      // Default Empty State: Getting Started Guide & FAQ
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
                  handleSearch(t.prompt);
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
          const faqContainer = el('div', { class: 'p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-5' });
          faqContainer.appendChild(
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
            )
          );

          const faqList = el('div', { class: 'divide-y divide-slate-100 space-y-3 pt-2' });
          for (const item of FAQ_ENTRIES) {
            const row = el('div', { class: 'pt-3 space-y-1' },
              el('button', {
                type: 'button',
                class: 'text-left w-full text-sm font-semibold text-slate-800 hover:text-indigo-600 transition flex items-center justify-between cursor-pointer',
                onClick: () => {
                  searchQuery.value = item.question;
                  handleSearch(item.question);
                }
              },
                el('span', null, item.question),
                icon('chevron-right', 'w-4 h-4 text-slate-400')
              ),
              el('p', { class: 'text-xs text-slate-500' }, item.summary)
            );
            faqList.appendChild(row);
          }
          faqContainer.appendChild(faqList);
          guide.appendChild(faqContainer);

          return guide;
        }
      });
      qaWrapper.appendChild(emptyStateView);

      return qaWrapper;
    }
  });
  root.appendChild(qaContainer);

  // ==========================================
  // VIEW B: Code Help & Fixer View
  // ==========================================
  const codeHelpContainer = Show({
    when: () => activeTab.value === 'code_help',
    children: () => {
      const codeWrapper = el('div', {
        class: 'space-y-8',
        id: 'samrey-code-help-view',
        role: 'tabpanel',
        'aria-labelledby': 'tab-assistant-code-help'
      });

      // 1. Editor & Controls Panel
      const editorPanel = el('div', { class: 'p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-md space-y-6' });

      // Title & Description
      editorPanel.appendChild(
        el('div', { class: 'space-y-2' },
          el('div', { class: 'flex items-center space-x-2' },
            icon('code', 'w-5 h-5 text-indigo-600'),
            el('h2', { class: 'text-lg sm:text-xl font-bold text-slate-900' }, 'Samrey Code Help & AST Fixer')
          ),
          el('p', { class: 'text-xs sm:text-sm text-slate-600 leading-relaxed' },
            'Paste TypeScript/Samrey code, diagnose signal update bugs, convert requirements, or detect foreign/unsupported APIs with instant correction.'
          )
        )
      );

      // Common Question Presets
      const questionPresets = [
        "Why isn't my signal updating?",
        "Fix this Samrey code.",
        "Convert this requirement into Samrey code.",
        "Create a task form using Samrey.",
        "How should I structure this component?"
      ];

      const questionPresetContainer = el('div', { class: 'flex flex-wrap gap-2' });
      for (const qText of questionPresets) {
        const btn = el('button', {
          type: 'button',
          class: () => `text-xs px-3.5 py-1.5 rounded-xl border transition font-medium cursor-pointer ${
            codeQuestion.value === qText
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-200'
          }`,
          onClick: () => {
            codeQuestion.value = qText;
          }
        }, qText);
        questionPresetContainer.appendChild(btn);
      }

      const questionPresetBox = el('div', { class: 'space-y-2' },
        el('label', { class: 'block text-xs font-bold uppercase tracking-wider text-slate-500' }, '1. Select Goal / Question'),
        questionPresetContainer
      );
      editorPanel.appendChild(questionPresetBox);

      // Custom Question Input
      const questionInputBox = el('div', { class: 'space-y-1' },
        el('input', {
          id: 'assistant-code-question',
          type: 'text',
          'aria-label': 'Custom code goal or question',
          placeholder: 'Or enter custom question/goal...',
          class: 'w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-600 rounded-2xl text-xs sm:text-sm outline-hidden text-slate-900 font-medium shadow-inner',
          value: () => codeQuestion.value,
          onInput: (e: Event) => {
            codeQuestion.value = (e.target as HTMLInputElement).value;
          }
        })
      );
      editorPanel.appendChild(questionInputBox);

      // Common Code Examples Presets
      const codePresets = [
        {
          label: '⚡ Stale Signal Binding Bug',
          question: "Why isn't my signal updating?",
          code: `import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function BrokenCounter() {
  const count = signal(0);
  
  // Bug: count.value evaluated once at initialization
  return el('div', { class: 'space-y-2' },
    el('p', null, count.value),
    el('button', { onClick: () => { count.value++; } }, 'Increment')
  );
}`
        },
        {
          label: '⚛️ Foreign Hooks Translation',
          question: 'Fix this Samrey code.',
          code: `// Foreign hooks pattern to translate:
export function UserStatus({ initialOnline }) {
  const [online, setOnline] = useState(initialOnline);
  useEffect(() => {
    console.log('Online status changed:', online);
  }, [online]);
  return <button onClick={() => setOnline(!online)}>Toggle</button>;
}`
        },
        {
          label: '🔄 In-Place Array Mutation',
          question: "Why isn't my signal updating?",
          code: `import { signal } from '@samrey/reactivity';

export function TodoList() {
  const todos = signal(['Write tests', 'Deploy app']);
  const addTodo = (item) => {
    // Bug: in-place mutation does not trigger signal setter
    todos.value.push(item);
  };
}`
        },
        {
          label: '📝 Task Form Requirement',
          question: 'Create a task form using Samrey.',
          code: `// Requirement:
// Create a task creation form with title, priority (low, medium, high),
// and validation (title required, min 3 chars). Submit to onSave handler.`
        },
        {
          label: '🏗️ Component Architecture',
          question: 'How should I structure this component?',
          code: `// How should I structure a full Samrey component with local signals,
// computed derivations, onMount lifecycle, and clean zero-VDOM el() rendering?`
        }
      ];

      const snippetPresetContainer = el('div', { class: 'flex flex-wrap gap-2' });
      for (const sample of codePresets) {
        const btn = el('button', {
          type: 'button',
          class: 'text-[11px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer',
          onClick: () => {
            codeInput.value = sample.code;
            codeQuestion.value = sample.question;
          }
        }, sample.label);
        snippetPresetContainer.appendChild(btn);
      }

      const snippetPresetsBox = el('div', { class: 'space-y-2' },
        el('div', { class: 'flex items-center justify-between' },
          el('label', { class: 'block text-xs font-bold uppercase tracking-wider text-slate-500' }, '2. Paste TypeScript Code or Load Preset'),
          el('span', { class: 'text-[11px] text-slate-400 font-mono' }, 'Zero-Eval Safe')
        ),
        snippetPresetContainer
      );
      editorPanel.appendChild(snippetPresetsBox);

      // Code Input Textarea Area
      const codeTextarea = el('textarea', {
        id: 'assistant-code-input',
        rows: 10,
        'aria-label': 'TypeScript code input for analysis and repair',
        placeholder: 'Paste your TypeScript or Samrey code here...',
        class: 'w-full p-4 sm:p-5 bg-slate-950 text-emerald-400 font-mono text-xs sm:text-sm rounded-2xl border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden leading-relaxed resize-y shadow-inner',
        value: () => codeInput.value,
        onInput: (e: Event) => {
          codeInput.value = (e.target as HTMLTextAreaElement).value;
        }
      });
      editorPanel.appendChild(codeTextarea);

      // Action Bar: Analyze Button + Clear Button
      const actionBar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3 pt-2' },
        el('div', { class: 'text-xs text-slate-500 font-mono flex items-center space-x-1.5' },
          icon('shield-check', 'w-4 h-4 text-emerald-600'),
          el('span', null, 'Untrusted Code Sanitized & Static AST Checked')
        ),
        el('div', { class: 'flex items-center space-x-2' },
          el('button', {
            type: 'button',
            class: 'px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer',
            onClick: () => {
              codeInput.value = '';
              currentCodeResult.value = null;
            }
          }, 'Clear Code'),
          el('button', {
            id: 'assistant-code-analyze-btn',
            type: 'button',
            disabled: () => isCodeLoading.value,
            class: 'px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 flex items-center space-x-2 shadow-xs cursor-pointer',
            onClick: handleAnalyzeCode
          },
            icon('sparkles', 'w-4 h-4 text-indigo-200'),
            el('span', null, () => isCodeLoading.value ? 'Analyzing AST...' : 'Analyze & Fix Code')
          )
        )
      );
      editorPanel.appendChild(actionBar);
      codeWrapper.appendChild(editorPanel);

      // 2. Loading State Indicator
      const codeLoadingView = Show({
        when: () => isCodeLoading.value,
        children: () => {
          const box = el('div', {
            id: 'code-help-loading-state',
            role: 'status',
            'aria-live': 'polite',
            class: 'p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col items-center justify-center space-y-4'
          });
          box.appendChild(
            el('div', { class: 'relative flex items-center justify-center' },
              el('div', { class: 'w-14 h-14 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin' }),
              el('div', { class: 'absolute' }, icon('code', 'w-6 h-6 text-indigo-600'))
            )
          );
          box.appendChild(
            el('div', { class: 'text-center space-y-1' },
              el('h4', { class: 'text-base font-bold text-slate-900' }, 'Analyzing Code Structure & Detecting APIs...'),
              el('p', { class: 'text-xs text-slate-500 font-mono' }, 'Inspecting reactivity bindings, AST transformations, and zero-eval compliance')
            )
          );
          return box;
        }
      });
      codeWrapper.appendChild(codeLoadingView);

      // 3. Error Banner
      const codeErrorView = Show({
        when: () => !isCodeLoading.value && !!codeErrorMessage.value,
        children: () => {
          const box = el('div', {
            id: 'code-help-error',
            role: 'alert',
            class: 'p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-900 space-y-3'
          });
          box.appendChild(
            el('div', { class: 'flex items-center space-x-2 font-bold text-sm' },
              icon('alert-octagon', 'w-5 h-5 text-rose-600'),
              el('span', null, 'Code Analysis Error')
            )
          );
          box.appendChild(
            el('p', { class: 'text-sm text-rose-800' }, () => codeErrorMessage.value)
          );
          return box;
        }
      });
      codeWrapper.appendChild(codeErrorView);

      // 4. Code Help Result Output Card (With Reusable CodeBlocks and Feedback)
      const resultCardView = Show({
        when: () => !isCodeLoading.value && !codeErrorMessage.value && !!currentCodeResult.value,
        children: () => {
          const card = el('div', {
            id: 'code-help-result',
            class: 'p-6 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-lg space-y-8'
          });

          // Header Status Bar
          const statusBar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100' },
            el('div', { class: 'flex flex-wrap items-center gap-2' },
              el('span', { class: 'px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-mono font-bold' }, 'DIAGNOSIS COMPLETE'),
              el('span', { class: 'px-3 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200' },
                () => `Goal: "${currentCodeResult.value?.question}"`
              )
            ),
            el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200' },
              icon('check-circle', 'w-3.5 h-3.5 text-emerald-600'),
              el('span', null, 'Zero-Eval Safe & Verified')
            )
          );
          card.appendChild(statusBar);

          // 1. Problem Diagnosis Box
          const problemBox = el('div', {
            id: 'code-help-problem',
            class: 'p-5 sm:p-6 bg-indigo-50/80 border border-indigo-100 rounded-2xl space-y-2'
          },
            el('div', { class: 'text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center space-x-1.5' },
              icon('alert-circle', 'w-4 h-4 text-indigo-600'),
              el('span', null, '1. Problem & Diagnosis')
            ),
            el('h3', { class: 'text-base font-bold text-indigo-950' }, () => currentCodeResult.value?.problem || ''),
            el('p', { class: 'text-sm text-indigo-900 leading-relaxed' }, () => currentCodeResult.value?.explanation || '')
          );
          card.appendChild(problemBox);

          // 2. Unsupported & Foreign API Warnings
          const warningsBox = Show({
            when: () => (currentCodeResult.value?.unsupportedApisFound?.length || 0) > 0 || (currentCodeResult.value?.warnings?.length || 0) > 0,
            children: () => {
              const box = el('div', {
                id: 'code-help-warnings',
                class: 'p-5 sm:p-6 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3'
              });
              box.appendChild(
                el('div', { class: 'text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center space-x-1.5' },
                  icon('alert-triangle', 'w-4 h-4 text-amber-600'),
                  el('span', null, '2. Unsupported / Foreign API Warnings')
                )
              );

              const warningsList = el('div', { class: 'space-y-2' });
              For({
                each: () => currentCodeResult.value?.unsupportedApisFound || [],
                key: (w) => w.detectedApi,
                children: (w) => {
                  return el('div', { class: 'p-3.5 bg-white/90 border border-amber-200 rounded-xl space-y-1 text-xs' },
                    el('div', { class: 'font-mono font-bold text-amber-900' }, `Detected API: ${w.detectedApi}`),
                    el('p', { class: 'text-amber-800' }, w.description),
                    el('div', { class: 'text-emerald-800 font-semibold pt-1' }, `💡 Official Samrey Alternative: ${w.samreyAlternative}`)
                  );
                }
              });
              box.appendChild(warningsList);
              return box;
            }
          });
          card.appendChild(warningsBox);

          // 3. Fixed Samrey Code Block with Reusable CodeBlock
          const codeSection = el('div', { class: 'space-y-3' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5' },
              icon('code', 'w-4 h-4 text-slate-700'),
              el('span', null, '3. Corrected & Idiomatic Samrey Code')
            ),
            createCodeBlock(
              () => currentCodeResult.value?.fixedCode || '',
              'TypeScript',
              'Corrected Samrey Code'
            )
          );
          card.appendChild(codeSection);

          // 4. Explanation of Changes
          const changesSection = Show({
            when: () => (currentCodeResult.value?.changesExplanation?.length || 0) > 0,
            children: () => {
              const block = el('div', {
                id: 'code-help-changes',
                class: 'space-y-3'
              },
                el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '4. Explanation of Changes'),
                el('ul', { class: 'list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-700 pl-1' },
                  For({
                    each: () => currentCodeResult.value?.changesExplanation || [],
                    key: (c, i) => `${i}-${c.slice(0, 10)}`,
                    children: (change) => el('li', { class: 'leading-relaxed font-medium' }, change)
                  })
                )
              );
              return block;
            }
          });
          card.appendChild(changesSection);

          // 5. Architectural Breakdown
          const explanationSection = el('div', {
            id: 'code-help-explanation',
            class: 'p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-2'
          },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, '5. Samrey Architectural Concept'),
            el('p', { class: 'text-sm text-slate-700 leading-relaxed' },
              () => currentCodeResult.value?.explanation || ''
            )
          );
          card.appendChild(explanationSection);

          // 6. Related APIs & Documentation Links
          const docSection = el('div', {
            id: 'code-help-doc-links',
            class: 'pt-4 border-t border-slate-100 space-y-4'
          },
            el('div', { class: 'space-y-2' },
              el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '6. Relevant Samrey APIs'),
              el('div', { class: 'flex flex-wrap gap-2' },
                For({
                  each: () => currentCodeResult.value?.relatedApis || [],
                  key: (a) => a,
                  children: (apiName) => el('span', { class: 'px-3 py-1 bg-slate-100 text-slate-800 font-mono text-xs font-semibold rounded-xl border border-slate-200' }, apiName)
                })
              )
            ),
            Show({
              when: () => (currentCodeResult.value?.docLinks?.length || 0) > 0,
              children: () => {
                const docBlock = el('div', { class: 'space-y-2' },
                  el('h4', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Documentation References'),
                  el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                    For({
                      each: () => currentCodeResult.value?.docLinks || [],
                      key: (l) => l.url,
                      children: (link) => {
                        return el('a', {
                          href: link.url,
                          class: 'p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl transition flex items-center justify-between text-xs font-semibold text-slate-800 hover:text-indigo-900 group cursor-pointer'
                        },
                          el('div', { class: 'space-y-0.5' },
                            el('span', { class: 'block font-medium' }, link.label),
                            Show({
                              when: () => !!link.sourcePath,
                              children: () => el('span', { class: 'block font-mono text-[10px] text-slate-400' }, link.sourcePath || '')
                            })
                          ),
                          icon('external-link', 'w-4 h-4 text-slate-400 group-hover:text-indigo-600')
                        );
                      }
                    })
                  )
                );
                return docBlock;
              }
            })
          );
          card.appendChild(docSection);

          // Feedback Bar for Code Help
          const feedbackSection = el('div', { class: 'pt-6 border-t border-slate-100' },
            createFeedbackBar(codeFeedbackState)
          );
          card.appendChild(feedbackSection);

          return card;
        }
      });
      codeWrapper.appendChild(resultCardView);

      return codeWrapper;
    }
  });
  root.appendChild(codeHelpContainer);

  return root;
}
