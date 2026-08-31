/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Navigation Header
 */

import { el, Show, For } from '@samrey/runtime';
import { Signal, signal } from '@samrey/reactivity';
import { icon, IconName } from '../lib/icons.js';

export interface NavTabItem {
  id: string;
  label: string;
  iconName: IconName;
}

export const NAV_ITEMS: NavTabItem[] = [
  { id: 'assistant', label: '🤖 Developer Assistant', iconName: 'sparkles' },
  { id: 'competitive', label: '⚖️ Framework Comparison & Matrix', iconName: 'layers' },
  { id: 'architecture', label: '🏛️ Architecture & Packages', iconName: 'cpu' },
  { id: 'task-studio', label: '🚀 Task Studio (Phase 16 App)', iconName: 'check-circle' },
  { id: 'reactivity', label: 'Reactivity Engine', iconName: 'activity' },
  { id: 'compiler', label: 'Compiler & IR Pipeline', iconName: 'file-code' },
  { id: 'security', label: 'Security Model', iconName: 'shield-check' },
  { id: 'adr', label: 'ADRs', iconName: 'git-pull-request' },
  { id: 'roadmap', label: 'Roadmap & Non-Goals', iconName: 'milestone' },
  { id: 'docs', label: 'Architecture Docs', iconName: 'book-open' }
];

export function Header(props: {
  activeTab: Signal<string>;
  onOpenSearch?: () => void;
}): HTMLElement {
  const isMobileMenuOpen = signal(false);

  const header = el('header', {
    class: 'sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs select-none'
  });

  const container = el('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' });

  // Top Row
  const topRow = el('div', { class: 'flex items-center justify-between h-16' });

  // Brand Logo & Title
  const brandGroup = el('div', {
    class: 'flex items-center space-x-3 cursor-pointer',
    onClick: () => {
      props.activeTab.value = 'competitive';
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  const logoBadge = el('div', {
    class: 'w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm font-mono font-bold text-lg'
  }, 'S');

  const titleBox = el('div', null,
    el('div', { class: 'flex items-center space-x-2' },
      el('span', { class: 'font-bold text-slate-900 tracking-tight text-lg' }, 'Samrey Framework'),
      el('span', { class: 'text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200' }, 'v1.0.0 Stable')
    ),
    el('p', { class: 'text-xs text-slate-500 hidden sm:block' },
      'Production-Grade Frontend Framework Built with Native Samrey Primitives'
    )
  );

  brandGroup.appendChild(logoBadge);
  brandGroup.appendChild(titleBox);
  topRow.appendChild(brandGroup);

  // Right Actions: Search Button + Live Status Badge + Mobile Toggle
  const rightActions = el('div', { class: 'flex items-center space-x-3' });

  if (props.onOpenSearch) {
    const searchBtn = el('button', {
      type: 'button',
      id: 'header-search-btn',
      class: 'flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition',
      onClick: props.onOpenSearch
    },
      icon('search', 'w-3.5 h-3.5 text-slate-500'),
      el('span', null, 'Search docs...'),
      el('kbd', { class: 'hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-slate-300 text-slate-500' }, '⌘K')
    );
    rightActions.appendChild(searchBtn);
  }

  const liveBadge = el('div', {
    class: 'hidden lg:flex items-center space-x-2 text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200'
  },
    el('span', { class: 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse' }),
    el('span', null, 'Zero React · Pure Samrey Engine')
  );
  rightActions.appendChild(liveBadge);

  // Mobile Menu Button
  const mobileMenuBtn = el('button', {
    type: 'button',
    class: 'lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition',
    onClick: () => {
      isMobileMenuOpen.value = !isMobileMenuOpen.value;
    }
  },
    icon('menu', 'w-5 h-5')
  );
  rightActions.appendChild(mobileMenuBtn);

  topRow.appendChild(rightActions);
  container.appendChild(topRow);

  // Desktop Navigation Tabs
  const desktopNav = el('nav', {
    class: 'hidden lg:flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100'
  });

  const tabList = For({
    each: () => NAV_ITEMS,
    key: (item) => item.id,
    children: (item) => {
      const btn = el('button', {
        id: `tab-btn-${item.id}`,
        type: 'button',
        class: () => {
          const isActive = props.activeTab.value === item.id;
          return `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
            isActive
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`;
        },
        onClick: () => {
          props.activeTab.value = item.id;
          if (typeof window !== 'undefined') {
            window.location.hash = item.id;
          }
        }
      },
        icon(item.iconName, 'w-4 h-4'),
        el('span', null, item.label)
      );
      return btn;
    }
  });

  desktopNav.appendChild(tabList);
  container.appendChild(desktopNav);

  // Mobile Drawer (via Samrey Show primitive)
  const mobileDrawer = Show({
    when: () => isMobileMenuOpen.value,
    children: () => {
      const drawer = el('div', { class: 'lg:hidden py-3 border-t border-slate-200 space-y-1 bg-white' });
      for (const item of NAV_ITEMS) {
        const itemBtn = el('button', {
          type: 'button',
          class: () => {
            const isActive = props.activeTab.value === item.id;
            return `w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-left transition ${
              isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`;
          },
          onClick: () => {
            props.activeTab.value = item.id;
            isMobileMenuOpen.value = false;
            if (typeof window !== 'undefined') {
              window.location.hash = item.id;
            }
          }
        },
          icon(item.iconName, 'w-4 h-4'),
          el('span', null, item.label)
        );
        drawer.appendChild(itemBtn);
      }
      return drawer;
    }
  });

  container.appendChild(mobileDrawer);
  header.appendChild(container);

  return header;
}
