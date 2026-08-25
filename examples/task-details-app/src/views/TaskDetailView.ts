/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Comprehensive Task Details View
 */

import { el } from '@samrey/runtime';
import { signal, effect, batch } from '@samrey/reactivity';
import {
  tasks,
  selectedTaskId,
  selectedTask,
  updateTaskStatus,
  toggleSubtask,
  addSubtask,
  addComment,
  deleteTask
} from '../state.js';
import { isAuthenticated, currentUser } from '../auth.js';
import { showToast } from '../components/NotificationToast.js';
import type { TaskStatus, TaskPriority } from '../types.js';

export function TaskDetailView(onNavigate: (route: string) => void): HTMLElement {
  const container = el('div', { class: 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6' });

  // Navigation Back Button
  const topNav = el('div', { class: 'flex items-center justify-between' });
  const backBtn = el('button', {
    class: 'px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2'
  }, '← Back to All Tasks');
  backBtn.addEventListener('click', () => onNavigate('/'));
  topNav.appendChild(backBtn);

  const viewBody = el('div', { class: 'space-y-6' });

  effect(() => {
    viewBody.innerHTML = '';
    const task = selectedTask();

    if (!task) {
      const notFoundBox = el('div', {
        class: 'bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4'
      });
      const title = el('h3', { class: 'text-xl font-bold text-slate-200' }, 'Task Not Found');
      const desc = el('p', { class: 'text-sm text-slate-400' }, 'The requested task may have been removed or does not exist.');
      const homeBtn = el('button', {
        class: 'px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl'
      }, 'Return to Task Board');
      homeBtn.addEventListener('click', () => onNavigate('/'));

      notFoundBox.appendChild(title);
      notFoundBox.appendChild(desc);
      notFoundBox.appendChild(homeBtn);
      viewBody.appendChild(notFoundBox);
      return;
    }

    // Grid Layout: Left Main Column (70%) + Right Metadata Column (30%)
    const mainGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-8' });

    // LEFT COLUMN: Details, Checklist, Discussion
    const leftCol = el('div', { class: 'lg:col-span-2 space-y-6' });

    // 1. Task Header Box
    const headerBox = el('div', { class: 'bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4' });

    const statusRow = el('div', { class: 'flex items-center justify-between gap-4 flex-wrap' });

    // Status Selector Pill Bar
    const statusPillBar = el('div', { class: 'flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60' });
    const statuses: Array<{ id: TaskStatus; label: string }> = [
      { id: 'todo', label: 'To Do' },
      { id: 'in-progress', label: 'In Progress' },
      { id: 'completed', label: 'Completed' }
    ];

    statuses.forEach(st => {
      const isCurrent = task.status === st.id;
      let activeColor = 'bg-cyan-600 text-white';
      if (st.id === 'completed') activeColor = 'bg-emerald-600 text-white';
      if (st.id === 'in-progress') activeColor = 'bg-amber-600 text-white';

      const btn = el('button', {
        class: `px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isCurrent ? activeColor : 'text-slate-400 hover:text-slate-200'}`
      }, st.label);

      btn.addEventListener('click', () => {
        updateTaskStatus(task.id, st.id);
        showToast(`Task status updated to "${st.label}"`, 'info');
      });

      statusPillBar.appendChild(btn);
    });

    // Delete Task Button
    const delBtn = el('button', {
      class: 'px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors'
    }, 'Delete Task');
    delBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
        deleteTask(task.id);
        showToast('Task deleted successfully', 'info');
        onNavigate('/');
      }
    });

    statusRow.appendChild(statusPillBar);
    statusRow.appendChild(delBtn);

    const taskTitle = el('h1', { class: 'text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-snug' }, task.title);
    const taskDesc = el('p', { class: 'text-sm text-slate-300 leading-relaxed' }, task.description);

    headerBox.appendChild(statusRow);
    headerBox.appendChild(taskTitle);
    headerBox.appendChild(taskDesc);

    // 2. Subtask Checklist Box
    const subtaskBox = el('div', { class: 'bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4' });
    const subHeader = el('div', { class: 'flex items-center justify-between' });
    const subTitle = el('h3', { class: 'text-base font-bold text-slate-100 flex items-center gap-2' }, 'Checklist Deliverables');

    const completedCount = task.subtasks.filter(s => s.completed).length;
    const subCount = el('span', { class: 'text-xs font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20' }, `${completedCount}/${task.subtasks.length} Completed`);

    subHeader.appendChild(subTitle);
    subHeader.appendChild(subCount);

    const subtaskList = el('div', { class: 'space-y-2' });

    task.subtasks.forEach(sub => {
      const item = el('div', {
        class: `p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${sub.completed ? 'bg-slate-800/40 border-slate-800 opacity-70' : 'bg-slate-800/80 border-slate-700/70'}`
      });

      const labelWrapper = el('label', { class: 'flex items-center gap-3 flex-1 cursor-pointer' });
      const check = el('input', {
        type: 'checkbox',
        class: 'w-4 h-4 rounded text-cyan-600 bg-slate-700 border-slate-600 focus:ring-cyan-500 cursor-pointer'
      }) as HTMLInputElement;
      check.checked = sub.completed;

      check.addEventListener('change', () => {
        toggleSubtask(task.id, sub.id);
      });

      const text = el('span', {
        class: `text-sm font-medium ${sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}`
      }, sub.title);

      labelWrapper.appendChild(check);
      labelWrapper.appendChild(text);
      item.appendChild(labelWrapper);
      subtaskList.appendChild(item);
    });

    // Add new subtask input form
    const addSubForm = el('form', { class: 'flex items-center gap-2 pt-2' });
    const addSubInput = el('input', {
      type: 'text',
      placeholder: 'Add new subtask item...',
      class: 'flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50'
    }) as HTMLInputElement;

    const addSubBtn = el('button', {
      type: 'submit',
      class: 'px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm'
    }, '+ Add');

    addSubForm.appendChild(addSubInput);
    addSubForm.appendChild(addSubBtn);

    addSubForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!addSubInput.value.trim()) return;
      addSubtask(task.id, addSubInput.value);
      addSubInput.value = '';
    });

    subtaskBox.appendChild(subHeader);
    subtaskBox.appendChild(subtaskList);
    subtaskBox.appendChild(addSubForm);

    // 3. Discussion / Activity Stream Box
    const commentBox = el('div', { class: 'bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5' });
    const commentHeader = el('h3', { class: 'text-base font-bold text-slate-100' }, `Discussion Thread (${task.comments.length})`);
    const commentList = el('div', { class: 'space-y-3' });

    if (task.comments.length === 0) {
      const emptyCmt = el('p', { class: 'text-xs text-slate-500 italic py-2' }, 'No comments yet on this task. Start the conversation below.');
      commentList.appendChild(emptyCmt);
    } else {
      task.comments.forEach(cmt => {
        const cmtEl = el('div', { class: 'p-3.5 bg-slate-800/70 border border-slate-700/60 rounded-xl space-y-1.5' });
        const cmtTop = el('div', { class: 'flex items-center justify-between text-xs' });
        const authorPill = el('div', { class: 'flex items-center gap-2' });
        const avatar = el('span', { class: 'w-5 h-5 rounded bg-cyan-600/30 text-cyan-400 font-bold text-[10px] flex items-center justify-center' }, cmt.authorName.slice(0, 1));
        const authorName = el('span', { class: 'font-semibold text-slate-200' }, cmt.authorName);
        const roleBadge = el('span', { class: 'text-[9px] uppercase font-mono text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded' }, cmt.authorRole);

        authorPill.appendChild(avatar);
        authorPill.appendChild(authorName);
        authorPill.appendChild(roleBadge);

        const timeStr = new Date(cmt.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const cmtTime = el('span', { class: 'text-[10px] text-slate-500 font-mono' }, timeStr);

        cmtTop.appendChild(authorPill);
        cmtTop.appendChild(cmtTime);

        const cmtContent = el('p', { class: 'text-xs text-slate-300 leading-relaxed' }, cmt.content);

        cmtEl.appendChild(cmtTop);
        cmtEl.appendChild(cmtContent);
        commentList.appendChild(cmtEl);
      });
    }

    // Comment Input Box
    const addCommentForm = el('form', { class: 'space-y-3 pt-2 border-t border-slate-800' });
    const commentInput = el('textarea', {
      rows: '2',
      placeholder: 'Write a response or update...',
      class: 'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50'
    }) as HTMLTextAreaElement;

    const commentSubmit = el('button', {
      type: 'submit',
      class: 'px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm'
    }, 'Post Comment');

    addCommentForm.appendChild(commentInput);
    addCommentForm.appendChild(commentSubmit);

    addCommentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!commentInput.value.trim()) return;
      if (!isAuthenticated()) {
        showToast('Please login to post comments', 'error');
        onNavigate('/login');
        return;
      }
      addComment(task.id, commentInput.value);
      commentInput.value = '';
      showToast('Comment posted', 'success');
    });

    commentBox.appendChild(commentHeader);
    commentBox.appendChild(commentList);
    commentBox.appendChild(addCommentForm);

    leftCol.appendChild(headerBox);
    leftCol.appendChild(subtaskBox);
    leftCol.appendChild(commentBox);

    // RIGHT COLUMN: Metadata & Diagnostics
    const rightCol = el('div', { class: 'space-y-6' });

    const metaCard = el('div', { class: 'bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5' });
    const metaTitle = el('h3', { class: 'text-sm font-bold text-slate-200 uppercase tracking-wider' }, 'Task Properties');

    // Priority
    const priorityGroup = el('div', { class: 'space-y-1' });
    const priorityLabel = el('span', { class: 'text-[11px] text-slate-400 font-semibold uppercase' }, 'Priority');
    let priorityClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (task.priority === 'critical') priorityClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    const priorityVal = el('div', { class: `inline-block px-2.5 py-1 rounded-lg border text-xs font-bold font-mono uppercase ${priorityClass}` }, task.priority);
    priorityGroup.appendChild(priorityLabel);
    priorityGroup.appendChild(document.createElement('br'));
    priorityGroup.appendChild(priorityVal);

    // Assignee
    const assigneeGroup = el('div', { class: 'space-y-1' });
    const assigneeLabel = el('span', { class: 'text-[11px] text-slate-400 font-semibold uppercase' }, 'Assigned Engineer');
    const assigneeVal = el('div', { class: 'flex items-center gap-2 p-2 bg-slate-800/80 rounded-xl border border-slate-700/60' });
    const assigneeAv = el('div', { class: 'w-6 h-6 rounded bg-cyan-600 text-white font-bold text-xs flex items-center justify-center' }, task.assignee.name.slice(0, 1));
    const assigneeName = el('span', { class: 'text-xs font-semibold text-slate-200' }, task.assignee.name);
    assigneeVal.appendChild(assigneeAv);
    assigneeVal.appendChild(assigneeName);
    assigneeGroup.appendChild(assigneeLabel);
    assigneeGroup.appendChild(assigneeVal);

    // Due Date
    const dueGroup = el('div', { class: 'space-y-1' });
    const dueLabel = el('span', { class: 'text-[11px] text-slate-400 font-semibold uppercase' }, 'Target Delivery');
    const dueVal = el('p', { class: 'text-xs text-slate-200 font-mono bg-slate-800/60 p-2 rounded-xl border border-slate-700/50' }, `📅 ${task.dueDate}`);
    dueGroup.appendChild(dueLabel);
    dueGroup.appendChild(dueVal);

    // Tags
    const tagsGroup = el('div', { class: 'space-y-1.5' });
    const tagsLabel = el('span', { class: 'text-[11px] text-slate-400 font-semibold uppercase' }, 'Architecture Tags');
    const tagsList = el('div', { class: 'flex flex-wrap gap-1.5' });
    task.tags.forEach(t => {
      const tagPill = el('span', { class: 'px-2 py-0.5 bg-slate-800 border border-slate-700 text-cyan-400 rounded-md text-[10px] font-mono' }, `#${t}`);
      tagsList.appendChild(tagPill);
    });
    tagsGroup.appendChild(tagsLabel);
    tagsGroup.appendChild(tagsList);

    // Timestamps
    const timeGroup = el('div', { class: 'space-y-1 pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono' });
    const createdP = el('p', {}, `Created: ${new Date(task.createdAt).toLocaleString()}`);
    const updatedP = el('p', {}, `Updated: ${new Date(task.updatedAt).toLocaleString()}`);
    timeGroup.appendChild(createdP);
    timeGroup.appendChild(updatedP);

    metaCard.appendChild(metaTitle);
    metaCard.appendChild(priorityGroup);
    metaCard.appendChild(assigneeGroup);
    metaCard.appendChild(dueGroup);
    metaCard.appendChild(tagsGroup);
    metaCard.appendChild(timeGroup);

    rightCol.appendChild(metaCard);

    mainGrid.appendChild(leftCol);
    mainGrid.appendChild(rightCol);

    viewBody.appendChild(mainGrid);
  });

  container.appendChild(topNav);
  container.appendChild(viewBody);

  return container;
}
