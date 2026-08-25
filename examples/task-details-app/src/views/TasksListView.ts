/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Tasks List & Overview View
 */

import { el } from '@samrey/runtime';
import { signal, effect, batch } from '@samrey/reactivity';
import {
  tasks,
  filteredTasks,
  taskStats,
  filter,
  selectTask,
  setStatusFilter,
  setSearchQuery,
  createTask,
  deleteTask
} from '../state.js';
import { isAuthenticated, currentUser } from '../auth.js';
import { showToast } from '../components/NotificationToast.js';
import { validateTaskForm } from '../forms.js';
import type { Task, TaskStatus, TaskPriority } from '../types.js';

export function TasksListView(onNavigate: (route: string) => void): HTMLElement {
  const container = el('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8' });

  // 1. Header & Live Metrics Bar
  const header = el('div', { class: 'flex flex-col md:flex-row md:items-center justify-between gap-4' });

  const headerTitles = el('div', { class: 'space-y-1' });
  const pageTitle = el('h1', { class: 'text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3' }, 'Enterprise Tasks');
  const pageDesc = el('p', { class: 'text-sm text-slate-400' }, 'Interactive task workflow powered by Samrey push-pull fine-grained signals');
  headerTitles.appendChild(pageTitle);
  headerTitles.appendChild(pageDesc);

  const actionGroup = el('div', { class: 'flex items-center gap-3' });
  const newTaskBtn = el('button', {
    class: 'px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-2'
  }, '+ Create Task');
  actionGroup.appendChild(newTaskBtn);

  header.appendChild(headerTitles);
  header.appendChild(actionGroup);

  // 2. Metrics Cards Row
  const metricsRow = el('div', { class: 'grid grid-cols-2 sm:grid-cols-4 gap-4' });

  const totalCard = createMetricCard('Total Tasks', '0', 'text-slate-100', 'bg-slate-900 border-slate-800');
  const inProgressCard = createMetricCard('In Progress', '0', 'text-amber-400', 'bg-slate-900 border-slate-800');
  const completedCard = createMetricCard('Completed', '0', 'text-emerald-400', 'bg-slate-900 border-slate-800');
  const completionCard = createMetricCard('Completion Rate', '0%', 'text-cyan-400', 'bg-slate-900 border-slate-800');

  metricsRow.appendChild(totalCard.el);
  metricsRow.appendChild(inProgressCard.el);
  metricsRow.appendChild(completedCard.el);
  metricsRow.appendChild(completionCard.el);

  effect(() => {
    const stats = taskStats();
    totalCard.valEl.textContent = String(stats.total);
    inProgressCard.valEl.textContent = String(stats.inProgress);
    completedCard.valEl.textContent = String(stats.completed);
    completionCard.valEl.textContent = `${stats.completionRate}%`;
  });

  // 3. Search & Filter Bar
  const filterBar = el('div', {
    class: 'bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4'
  });

  // Status Filter Tabs
  const tabsWrapper = el('div', { class: 'flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50 w-full sm:w-auto overflow-x-auto' });

  const filterTabs: Array<{ id: TaskStatus | 'all'; label: string }> = [
    { id: 'all', label: 'All Tasks' },
    { id: 'todo', label: 'To Do' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' }
  ];

  const tabButtons: HTMLButtonElement[] = [];

  filterTabs.forEach(t => {
    const btn = el('button', {
      class: 'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap'
    }, t.label) as HTMLButtonElement;

    btn.addEventListener('click', () => {
      setStatusFilter(t.id);
    });

    tabsWrapper.appendChild(btn);
    tabButtons.push(btn);
  });

  effect(() => {
    const currentStatus = filter().status;
    filterTabs.forEach((t, i) => {
      const btn = tabButtons[i];
      if (t.id === currentStatus) {
        btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white shadow-md transition-all whitespace-nowrap';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap';
      }
    });
  });

  // Search Input
  const searchInput = el('input', {
    type: 'text',
    placeholder: 'Search tasks by title, tag, description...',
    class: 'w-full sm:w-72 px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all'
  }) as HTMLInputElement;

  searchInput.addEventListener('input', () => {
    setSearchQuery(searchInput.value);
  });

  filterBar.appendChild(tabsWrapper);
  filterBar.appendChild(searchInput);

  // 4. Tasks Grid Container
  const tasksGrid = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' });

  effect(() => {
    tasksGrid.innerHTML = '';
    const list = filteredTasks();

    if (list.length === 0) {
      const emptyBox = el('div', {
        class: 'col-span-full py-16 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 space-y-3'
      });
      const emptyTitle = el('h3', { class: 'text-base font-semibold text-slate-300' }, 'No tasks found');
      const emptySub = el('p', { class: 'text-xs text-slate-500' }, 'Try clearing filters or create a new enterprise task.');
      emptyBox.appendChild(emptyTitle);
      emptyBox.appendChild(emptySub);
      tasksGrid.appendChild(emptyBox);
      return;
    }

    list.forEach(task => {
      const card = createTaskCard(task, onNavigate);
      tasksGrid.appendChild(card);
    });
  });

  // 5. New Task Modal (Built natively with Samrey reactivity)
  const modalOverlay = el('div', {
    class: 'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 hidden animate-fade-in'
  });

  const modalBox = el('div', {
    class: 'bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5'
  });

  const modalHeader = el('div', { class: 'flex items-center justify-between border-b border-slate-800 pb-3' });
  const modalTitle = el('h3', { class: 'text-lg font-bold text-slate-100' }, 'Create New Task');
  const modalClose = el('button', { class: 'text-slate-400 hover:text-slate-200 text-sm font-semibold p-1' }, '✕');
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(modalClose);

  const modalForm = el('form', { class: 'space-y-4' });

  // Title
  const taskTitleGroup = el('div', { class: 'space-y-1.5' });
  const taskTitleLabel = el('label', { class: 'block text-xs font-semibold text-slate-300' }, 'Task Title');
  const taskTitleInput = el('input', {
    type: 'text',
    placeholder: 'e.g. Implement WebAuthn Biometrics',
    class: 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50'
  }) as HTMLInputElement;
  taskTitleGroup.appendChild(taskTitleLabel);
  taskTitleGroup.appendChild(taskTitleInput);

  // Description
  const taskDescGroup = el('div', { class: 'space-y-1.5' });
  const taskDescLabel = el('label', { class: 'block text-xs font-semibold text-slate-300' }, 'Description');
  const taskDescInput = el('textarea', {
    rows: '3',
    placeholder: 'Detailed task goals and deliverables...',
    class: 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50'
  }) as HTMLTextAreaElement;
  taskDescGroup.appendChild(taskDescLabel);
  taskDescGroup.appendChild(taskDescInput);

  // Priority & Due Date
  const metaRow = el('div', { class: 'grid grid-cols-2 gap-3' });

  const priorityGroup = el('div', { class: 'space-y-1.5' });
  const priorityLabel = el('label', { class: 'block text-xs font-semibold text-slate-300' }, 'Priority');
  const prioritySelect = el('select', {
    class: 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50'
  }) as HTMLSelectElement;

  ['low', 'medium', 'high', 'critical'].forEach(p => {
    const opt = el('option', { value: p }, p.toUpperCase());
    prioritySelect.appendChild(opt);
  });
  prioritySelect.value = 'high';
  priorityGroup.appendChild(priorityLabel);
  priorityGroup.appendChild(prioritySelect);

  const dueGroup = el('div', { class: 'space-y-1.5' });
  const dueLabel = el('label', { class: 'block text-xs font-semibold text-slate-300' }, 'Due Date');
  const dueInput = el('input', {
    type: 'date',
    value: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    class: 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50'
  }) as HTMLInputElement;
  dueGroup.appendChild(dueLabel);
  dueGroup.appendChild(dueInput);

  metaRow.appendChild(priorityGroup);
  metaRow.appendChild(dueGroup);

  // Submit button
  const modalSubmit = el('button', {
    type: 'submit',
    class: 'w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md'
  }, 'Create & View Task');

  modalForm.appendChild(taskTitleGroup);
  modalForm.appendChild(taskDescGroup);
  modalForm.appendChild(metaRow);
  modalForm.appendChild(modalSubmit);

  modalBox.appendChild(modalHeader);
  modalBox.appendChild(modalForm);
  modalOverlay.appendChild(modalBox);

  // Modal open/close handlers
  const openModal = () => {
    if (!isAuthenticated()) {
      showToast('Please login to create tasks', 'error');
      onNavigate('/login');
      return;
    }
    modalOverlay.classList.remove('hidden');
  };

  const closeModal = () => {
    modalOverlay.classList.add('hidden');
  };

  newTaskBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = validateTaskForm({
      title: taskTitleInput.value,
      description: taskDescInput.value
    });

    if (!val.isValid) {
      showToast(val.errors.title || val.errors.description || 'Invalid task input', 'error');
      return;
    }

    const created = createTask({
      title: taskTitleInput.value,
      description: taskDescInput.value,
      priority: prioritySelect.value as TaskPriority,
      dueDate: dueInput.value,
      tags: ['Native', 'Enterprise']
    });

    closeModal();
    taskTitleInput.value = '';
    taskDescInput.value = '';
    showToast(`Task "${created.title}" created successfully!`, 'success');
    onNavigate(`/tasks?id=${created.id}`);
  });

  container.appendChild(header);
  container.appendChild(metricsRow);
  container.appendChild(filterBar);
  container.appendChild(tasksGrid);
  container.appendChild(modalOverlay);

  return container;
}

function createMetricCard(label: string, initialVal: string, textCol: string, bgCol: string) {
  const cardEl = el('div', { class: `p-4 rounded-2xl border ${bgCol} shadow-sm space-y-1` });
  const labelEl = el('p', { class: 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider' }, label);
  const valEl = el('p', { class: `text-2xl font-black ${textCol}` }, initialVal);
  cardEl.appendChild(labelEl);
  cardEl.appendChild(valEl);
  return { el: cardEl, valEl };
}

function createTaskCard(task: Task, onNavigate: (route: string) => void): HTMLElement {
  const card = el('div', {
    class: 'bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 shadow-lg space-y-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group'
  });

  // Priority & Status pill
  const topRow = el('div', { class: 'flex items-center justify-between text-xs' });

  let priorityClass = 'bg-slate-800 text-slate-300 border-slate-700';
  if (task.priority === 'critical') priorityClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  else if (task.priority === 'high') priorityClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  else if (task.priority === 'medium') priorityClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';

  const priorityPill = el('span', { class: `px-2.5 py-1 rounded-lg border font-mono uppercase text-[10px] font-bold ${priorityClass}` }, task.priority);

  let statusClass = 'text-slate-400';
  if (task.status === 'completed') statusClass = 'text-emerald-400 font-semibold';
  else if (task.status === 'in-progress') statusClass = 'text-amber-400 font-semibold';

  const statusLabel = el('span', { class: `text-xs ${statusClass}` }, task.status.replace('-', ' ').toUpperCase());

  topRow.appendChild(priorityPill);
  topRow.appendChild(statusLabel);

  // Title & Description
  const title = el('h3', { class: 'text-base font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-2' }, task.title);
  const desc = el('p', { class: 'text-xs text-slate-400 line-clamp-2' }, task.description);

  // Subtask progress
  const completedSubs = task.subtasks.filter(s => s.completed).length;
  const totalSubs = task.subtasks.length;
  const subtaskProgress = el('div', { class: 'space-y-1.5 pt-1' });
  const progressHeader = el('div', { class: 'flex items-center justify-between text-[11px] text-slate-400 font-mono' });
  progressHeader.appendChild(el('span', {}, 'Checklist'));
  progressHeader.appendChild(el('span', {}, `${completedSubs}/${totalSubs}`));

  const progressBarTrack = el('div', { class: 'w-full h-1.5 bg-slate-800 rounded-full overflow-hidden' });
  const pct = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;
  const progressBarFill = el('div', { class: 'h-full bg-cyan-500 transition-all duration-300' });
  progressBarFill.style.width = `${pct}%`;
  progressBarTrack.appendChild(progressBarFill);

  subtaskProgress.appendChild(progressHeader);
  subtaskProgress.appendChild(progressBarTrack);

  // Footer: Assignee & Comments count
  const footer = el('div', { class: 'flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400' });
  const assignee = el('span', { class: 'flex items-center gap-1.5 font-medium text-slate-300' }, `👤 ${task.assignee.name}`);
  const commentsBadge = el('span', { class: 'text-[11px] font-mono text-slate-500' }, `💬 ${task.comments.length}`);

  footer.appendChild(assignee);
  footer.appendChild(commentsBadge);

  card.appendChild(topRow);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(subtaskProgress);
  card.appendChild(footer);

  card.addEventListener('click', () => {
    selectTask(task.id);
    onNavigate(`/tasks?id=${task.id}`);
  });

  return card;
}
