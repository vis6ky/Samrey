/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant View
 *
 * 100% Native Samrey Component utilizing @samrey/runtime and @samrey/reactivity.
 * Zero foreign frameworks.
 */

import { el, Show, For } from '@samrey/runtime';
import { signal, computed, effect } from '@samrey/reactivity';
import { icon } from '../lib/icons.js';
import { renderMarkdown } from '../lib/markdown.js';
import {
  POPULAR_PROMPTS,
  CATEGORY_FILTERS,
  FAQ_ENTRIES,
  AssistantAnswer
} from '../data/assistantKnowledge.js';
import { SmartAssistantProvider, ChatMessage } from '../lib/assistantProvider.js';

export function AssistantView(): HTMLElement {
  const provider = new SmartAssistantProvider();

  // State
  const searchQuery = signal<string>('');
  const activeCategory = signal<string>('all');
  const isLoading = signal<boolean>(false);
  const errorMessage = signal<string | null>(null);
  const currentAnswer = signal<AssistantAnswer | null>(null);
  const conversationHistory = signal<Array<{ query: string; answer: AssistantAnswer }>>([]);
  const followUpText = signal<string>('');
  const isFaqExpanded = signal<boolean>(false);

  // Submit search query
  const handleSearch = async (queryText?: string) => {
    const q = (queryText || searchQuery.value).trim();
    if (!q || isLoading.value) return;

    isLoading.value = true;
    errorMessage.value = null;
    searchQuery.value = q;

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
      errorMessage.value = err?.message || 'Failed to retrieve answer from Samrey Developer Assistant. Please try again.';
    } finally {
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

  // Container
  const root = el('div', { class: 'space-y-8 pb-16', id: 'samrey-assistant-view' });

  // 1. Hero Header & Introduction
  const heroSection = el('div', {
    class: 'relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-10 text-white shadow-xl border border-slate-700'
  },
    el('div', { class: 'relative z-10 max-w-3xl space-y-4' },
      el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-medium' },
        icon('sparkles', 'w-3.5 h-3.5 text-indigo-400'),
        el('span', null, 'Samrey Framework v1.0.0 Assistant & Knowledge Search')
      ),
      el('h1', { class: 'text-3xl sm:text-4xl font-extrabold tracking-tight text-white' },
        'Samrey Developer Assistant'
      ),
      el('p', { class: 'text-sm sm:text-base text-slate-300 leading-relaxed' },
        'Ask natural-language questions about reactive state, fine-grained DOM bindings, schema forms, type-safe routing, zero-eval security, SSR streaming, or AETH error codes. Grounded strictly on official @samrey/* packages.'
      )
    )
  );
  root.appendChild(heroSection);

  // 2. Search & Query Input Box
  const searchContainer = el('div', {
    class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4'
  });

  const inputWrapper = el('div', { class: 'relative flex items-center' });

  const searchIcon = el('div', {
    class: 'absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
  }, icon('search', 'w-5 h-5'));
  inputWrapper.appendChild(searchIcon);

  const searchInput = el('input', {
    id: 'assistant-search-input',
    type: 'text',
    placeholder: 'Ask a question (e.g. "How do I validate a form?" or "How do I create a reactive store?")...',
    class: 'w-full pl-12 pr-28 py-3.5 text-sm sm:text-base bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 focus:border-slate-900 rounded-xl focus:ring-2 focus:ring-slate-900/20 transition outline-hidden font-medium text-slate-900',
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

  const submitButton = el('button', {
    id: 'assistant-submit-btn',
    type: 'button',
    disabled: () => isLoading.value,
    class: 'absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-medium transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer',
    onClick: () => handleSearch()
  },
    icon('sparkles', 'w-4 h-4 text-indigo-400'),
    el('span', null, () => isLoading.value ? 'Searching...' : 'Ask AI')
  );
  inputWrapper.appendChild(submitButton);
  searchContainer.appendChild(inputWrapper);

  // Category Filter Pills
  const categoryPills = el('div', { class: 'flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs' });
  for (const cat of CATEGORY_FILTERS) {
    const pill = el('button', {
      type: 'button',
      class: () => {
        const isSelected = activeCategory.value === cat.id;
        return `px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
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

  // Quick Prompt Suggestion Chips
  const promptSuggestions = el('div', { class: 'space-y-2 pt-2 border-t border-slate-100' });
  promptSuggestions.appendChild(
    el('div', { class: 'text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1' },
      icon('zap', 'w-3.5 h-3.5 text-amber-500'),
      el('span', null, 'Popular Samrey Developer Questions')
    )
  );

  const chipsGrid = el('div', { class: 'flex flex-wrap gap-2' });
  for (const promptText of POPULAR_PROMPTS) {
    const chip = el('button', {
      type: 'button',
      class: 'text-left text-xs px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 transition font-medium cursor-pointer',
      onClick: () => {
        searchQuery.value = promptText;
        handleSearch(promptText);
      }
    }, promptText);
    chipsGrid.appendChild(chip);
  }
  promptSuggestions.appendChild(chipsGrid);
  searchContainer.appendChild(promptSuggestions);
  root.appendChild(searchContainer);

  // 3. Loading State Indicator
  const loadingView = Show({
    when: () => isLoading.value,
    children: () => {
      const box = el('div', {
        id: 'assistant-loading-state',
        class: 'p-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-4'
      });
      box.appendChild(
        el('div', { class: 'relative flex items-center justify-center' },
          el('div', { class: 'w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin' }),
          el('div', { class: 'absolute' }, icon('sparkles', 'w-5 h-5 text-indigo-600'))
        )
      );
      box.appendChild(
        el('div', { class: 'text-center space-y-1' },
          el('h4', { class: 'text-base font-semibold text-slate-900' }, 'Querying Samrey v1.0.0 Knowledge Base...'),
          el('p', { class: 'text-xs text-slate-500 font-mono' }, 'Synthesizing idiomatic implementation steps and TypeScript examples')
        )
      );
      return box;
    }
  });
  root.appendChild(loadingView);

  // 4. Error State Banner
  const errorView = Show({
    when: () => !isLoading.value && !!errorMessage.value,
    children: () => {
      const box = el('div', {
        id: 'assistant-error-state',
        class: 'p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-3'
      });
      box.appendChild(
        el('div', { class: 'flex items-center space-x-2 font-bold text-sm' },
          icon('alert-octagon', 'w-5 h-5 text-rose-600'),
          el('span', null, 'Assistant Error')
        )
      );
      box.appendChild(
        el('p', { class: 'text-sm text-rose-800' }, () => errorMessage.value)
      );
      box.appendChild(
        el('button', {
          type: 'button',
          class: 'px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition',
          onClick: () => handleSearch()
        }, 'Retry Request')
      );
      return box;
    }
  });
  root.appendChild(errorView);

  // 5. Active Answer View (Strict 12-Section Architecture)
  const answerView = Show({
    when: () => !isLoading.value && !errorMessage.value && !!currentAnswer.value,
    children: () => {
      const ans = currentAnswer.value!;
      const card = el('div', {
        id: 'assistant-answer-card',
        class: 'p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-md space-y-8 transition'
      });

      // Top Status Bar
      const statusBar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100' },
        el('div', { class: 'flex flex-wrap items-center gap-2' },
          el('span', { class: 'px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-mono font-bold' },
            () => currentAnswer.value?.category.toUpperCase() || 'GENERAL'
          ),
          el('span', { class: () => `px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentAnswer.value?.isDirectMatch ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-indigo-50 text-indigo-800 border-indigo-200'}` },
            () => currentAnswer.value?.isDirectMatch ? '⚡ Direct Exact Match' : '✨ Grounded Search & AI'
          ),
          el('span', { class: 'text-xs text-slate-500 hidden sm:inline' },
            () => `Query: "${currentAnswer.value?.query}"`
          )
        ),
        el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200' },
          icon('check-circle', 'w-3.5 h-3.5 text-emerald-600'),
          el('span', null, 'Official Samrey v1.0.0 Verified')
        )
      );
      card.appendChild(statusBar);

      // Retrieved Grounded Sources Badges
      const sourcesBadgeBar = Show({
        when: () => !!currentAnswer.value?.sourceFiles && (currentAnswer.value?.sourceFiles?.length || 0) > 0,
        children: () => {
          const bar = el('div', { class: 'flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600' },
            el('span', { class: 'font-semibold text-slate-700 flex items-center space-x-1' },
              icon('book-open', 'w-3 h-3 text-indigo-600'),
              el('span', null, 'Indexed Sources:')
            ),
            For({
              each: () => currentAnswer.value?.sourceFiles || [],
              key: (f) => f,
              children: (file) => el('span', { class: 'px-2 py-0.5 bg-white border border-slate-300 rounded-md font-mono text-slate-800 text-[11px]' }, `📄 ${file}`)
            })
          );
          return bar;
        }
      });
      card.appendChild(sourcesBadgeBar);

      // Main Title
      const titleEl = el('h2', { class: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight' },
        () => currentAnswer.value?.title || 'Samrey Solution'
      );
      card.appendChild(titleEl);

      // Section 1: Short Answer
      const section1 = el('div', { class: 'p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2' },
        el('div', { class: 'text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center space-x-1.5' },
          icon('sparkles', 'w-4 h-4 text-indigo-600'),
          el('span', null, '1. Short Answer')
        ),
        el('p', { class: 'text-sm sm:text-base text-indigo-950 font-medium leading-relaxed' },
          () => currentAnswer.value?.shortAnswer || ''
        )
      );
      card.appendChild(section1);

      // Section 2: Concept
      const section2 = el('div', { class: 'space-y-2' },
        el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '2. Core Architectural Concept'),
        el('p', { class: 'text-sm text-slate-700 leading-relaxed' },
          () => currentAnswer.value?.concept || ''
        )
      );
      card.appendChild(section2);

      // Section 3: Recommended Samrey API
      const section3 = el('div', { class: 'p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1' },
        el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, '3. Recommended Samrey API'),
        el('div', { class: 'text-sm font-mono font-semibold text-slate-900' },
          () => currentAnswer.value?.recommendedApi || ''
        )
      );
      card.appendChild(section3);

      // Section 4: When to Use It
      const section4 = el('div', { class: 'space-y-2' },
        el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '4. When to Use It'),
        el('p', { class: 'text-sm text-slate-700 leading-relaxed' },
          () => currentAnswer.value?.whenToUse || ''
        )
      );
      card.appendChild(section4);

      // Section 5: Step-by-Step Implementation
      const section5 = el('div', { class: 'space-y-3' },
        el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '5. Step-by-Step Implementation'),
        el('ol', { class: 'list-decimal list-inside space-y-2 text-sm text-slate-700' },
          For({
            each: () => currentAnswer.value?.implementationSteps || [],
            key: (step, i) => `${i}-${step.slice(0, 10)}`,
            children: (step) => el('li', { class: 'leading-relaxed' }, step)
          })
        )
      );
      card.appendChild(section5);

      // Section 6: TypeScript Code Example
      const section6 = el('div', { class: 'space-y-2' },
        el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '6. TypeScript Code Example'),
        el('div', null,
          () => {
            const code = currentAnswer.value?.tsCodeExample || '';
            const markdown = `\`\`\`typescript\n${code}\n\`\`\``;
            return renderMarkdown(markdown, { enableCopyCode: true });
          }
        )
      );
      card.appendChild(section6);

      // Section 7: Complete Working Example (When Available)
      const section7 = Show({
        when: () => !!currentAnswer.value?.completeWorkingExample,
        children: () => {
          const block = el('div', { class: 'space-y-2' },
            el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '7. Complete Working Example'),
            el('div', null,
              () => {
                const code = currentAnswer.value?.completeWorkingExample || '';
                const markdown = `\`\`\`typescript\n${code}\n\`\`\``;
                return renderMarkdown(markdown, { enableCopyCode: true });
              }
            )
          );
          return block;
        }
      });
      card.appendChild(section7);

      // Section 8: Code Explanation
      const section8 = el('div', { class: 'space-y-2' },
        el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '8. Code Explanation & Architectural Breakdown'),
        el('p', { class: 'text-sm text-slate-700 leading-relaxed' },
          () => currentAnswer.value?.codeExplanation || ''
        )
      );
      card.appendChild(section8);

      // Section 9: Alternative Approach
      const section9 = Show({
        when: () => !!currentAnswer.value?.alternativeApproach,
        children: () => {
          const block = el('div', { class: 'p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1' },
            el('h3', { class: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, '9. Alternative Samrey Approach & Tradeoffs'),
            el('p', { class: 'text-sm text-slate-700 leading-relaxed' },
              () => currentAnswer.value?.alternativeApproach || ''
            )
          );
          return block;
        }
      });
      card.appendChild(section9);

      // Section 10: Common Mistakes
      const section10 = el('div', { class: 'p-5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2' },
        el('div', { class: 'text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center space-x-1.5' },
          icon('alert-triangle', 'w-4 h-4 text-amber-600'),
          el('span', null, '10. Common Mistakes & Pitfalls to Avoid')
        ),
        el('ul', { class: 'list-disc list-inside space-y-1.5 text-sm text-amber-950' },
          For({
            each: () => currentAnswer.value?.commonMistakes || [],
            key: (m, i) => `${i}-${m.slice(0, 10)}`,
            children: (mistake) => el('li', { class: 'leading-relaxed' }, mistake)
          })
        )
      );
      card.appendChild(section10);

      // Section 11: Related @samrey APIs
      const section11 = el('div', { class: 'space-y-2' },
        el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '11. Related @samrey APIs'),
        el('div', { class: 'flex flex-wrap gap-2' },
          For({
            each: () => currentAnswer.value?.relatedApis || [],
            key: (api) => api,
            children: (api) => el('span', { class: 'px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-semibold border border-slate-200' }, api)
          })
        )
      );
      card.appendChild(section11);

      // Section 12: Documentation Links
      const section12 = el('div', { class: 'pt-4 border-t border-slate-100 space-y-2' },
        el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500' }, '12. Relevant Samrey Documentation'),
        el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' },
          For({
            each: () => currentAnswer.value?.docLinks || [],
            key: (l) => l.url + l.label,
            children: (link) => el('a', {
              href: link.url,
              class: 'flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 transition group'
            },
              el('div', { class: 'flex items-center space-x-2 min-w-0' },
                icon('book-open', 'w-4 h-4 text-indigo-600 shrink-0'),
                el('div', { class: 'truncate' },
                  el('span', { class: 'text-xs font-semibold block group-hover:text-indigo-700' }, link.label),
                  Show({
                    when: () => !!link.sourcePath,
                    children: () => el('span', { class: 'text-[11px] font-mono text-slate-500 block truncate' }, link.sourcePath || '')
                  })
                )
              ),
              icon('chevron-right', 'w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0')
            )
          })
        )
      );
      card.appendChild(section12);

      // Follow-Up Question Input Box
      const followUpSection = el('div', { class: 'pt-6 border-t border-slate-200 space-y-3' },
        el('div', { class: 'flex items-center space-x-2 text-xs font-semibold text-slate-700 uppercase tracking-wider' },
          icon('sparkles', 'w-3.5 h-3.5 text-indigo-600'),
          el('span', null, 'Ask a Follow-Up Question')
        ),
        el('div', { class: 'flex items-center space-x-2' },
          el('input', {
            id: 'assistant-followup-input',
            type: 'text',
            placeholder: 'Need more clarification on this answer? Ask a follow-up...',
            class: 'flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 outline-hidden',
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
            id: 'assistant-followup-btn',
            type: 'button',
            class: 'px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer',
            onClick: () => handleFollowUp()
          }, 'Send')
        )
      );
      card.appendChild(followUpSection);

      return card;
    }
  });
  root.appendChild(answerView);

  // 6. Empty State (Landing Guide & FAQ)
  const emptyStateView = Show({
    when: () => !isLoading.value && !errorMessage.value && !currentAnswer.value,
    children: () => {
      const guide = el('div', {
        id: 'assistant-empty-state',
        class: 'space-y-8'
      });

      // Topic Cards Grid
      const topicGrid = el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-6' });

      const topics = [
        {
          title: '⚡ Fine-Grained Reactivity',
          desc: 'Signals, computed derivations, and deep proxy stores without Virtual DOM overhead or stale closure bugs.',
          prompt: 'How do I create a reactive store?'
        },
        {
          title: '🛡️ Zero-Eval Security',
          desc: 'Automatic compile-time XSS defenses, protocol validators, safe hydration, and CSRF token lifecycles.',
          prompt: 'How do I prevent XSS?'
        },
        {
          title: '📋 Schema-Driven Forms',
          desc: 'Full Standard Schema support (Zod/Valibot) with automated ARIA derivation and touch-state tracking.',
          prompt: 'How do I validate a form?'
        }
      ];

      for (const t of topics) {
        const topicCard = el('div', {
          class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between'
        },
          el('div', { class: 'space-y-2' },
            el('h3', { class: 'text-base font-bold text-slate-900' }, t.title),
            el('p', { class: 'text-xs text-slate-600 leading-relaxed' }, t.desc)
          ),
          el('button', {
            type: 'button',
            class: 'mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer flex items-center space-x-1',
            onClick: () => {
              searchQuery.value = t.prompt;
              handleSearch(t.prompt);
            }
          },
            el('span', null, `Try: "${t.prompt}"`),
            icon('arrow-right', 'w-3 h-3')
          )
        );
        topicGrid.appendChild(topicCard);
      }
      guide.appendChild(topicGrid);

      // FAQ Section
      const faqContainer = el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4' });
      faqContainer.appendChild(
        el('div', { class: 'flex items-center justify-between' },
          el('h3', { class: 'text-base font-bold text-slate-900 flex items-center space-x-2' },
            icon('book-open', 'w-4 h-4 text-slate-700'),
            el('span', null, 'Frequently Asked Developer Questions')
          ),
          el('button', {
            type: 'button',
            class: 'text-xs text-slate-500 hover:text-slate-900 font-medium',
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
  root.appendChild(emptyStateView);

  return root;
}
