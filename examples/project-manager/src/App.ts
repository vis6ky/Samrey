/**
 * @license Apache-2.0
 * Gati Project Manager — Root Application Shell
 * 100% Native Gati Independent Consumer App
 */

import { el, Show, Switch, Match, ErrorBoundary } from '@gati/runtime';
import { signal, effect } from '@gati/reactivity';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { NotificationToast } from './components/NotificationToast.js';
import { Modal } from './components/Modal.js';
import { DashboardView } from './views/DashboardView.js';
import { ProjectsView } from './views/ProjectsView.js';
import { ProjectDetailView } from './views/ProjectDetailView.js';
import { TaskBoardView } from './views/TaskFormView.js';
import { SecurityDiagnosticsView } from './views/SecurityDiagnosticsView.js';
import { SettingsView } from './views/SettingsView.js';
import { NotFoundView } from './views/NotFoundView.js';
import { createProjectForm, createTaskForm } from './forms.js';
import { store, addProject, addTask, initializeData, notify } from './state.js';

export function App(): HTMLElement {
  // Navigation Route Signal
  const currentPath = signal<string>('/');
  const activeProjectId = signal<string | null>(null);

  // Sync with browser URL hash or path
  if (typeof window !== 'undefined') {
    const parseUrl = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      const [path, query] = hash.split('?');
      currentPath.value = path || '/';

      if (query) {
        const params = new URLSearchParams(query);
        activeProjectId.value = params.get('id');
      } else {
        activeProjectId.value = null;
      }
    };

    parseUrl();
    window.addEventListener('hashchange', parseUrl);

    // Initial data fetch
    initializeData();
  }

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    } else {
      const [p, query] = path.split('?');
      currentPath.value = p;
      if (query) {
        const params = new URLSearchParams(query);
        activeProjectId.value = params.get('id');
      } else {
        activeProjectId.value = null;
      }
    }
  };

  // Modals state
  const isNewProjectModalOpen = signal(false);
  const isNewTaskModalOpen = signal(false);

  // New Project Form
  const projectFormHandler = createProjectForm(
    { category: 'core', status: 'active', lead: 'Ada Lovelace' },
    async (values) => {
      try {
        await addProject(values);
        isNewProjectModalOpen.value = false;
      } catch {
        // Error notification handled by state
      }
    }
  );

  // New Task Form
  const taskFormHandler = createTaskForm(
    { status: 'todo', priority: 'medium', assignee: 'Ada Lovelace' },
    async (values) => {
      try {
        await addTask({
          projectId: values.projectId,
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
          assignee: values.assignee,
          tags: values.tagsString.split(',').map((s) => s.trim()),
          dueDate: values.dueDate
        });
        isNewTaskModalOpen.value = false;
      } catch {
        // Error notification handled by state
      }
    }
  );

  // Root Container
  const root = el('div', { class: 'min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased' });

  // Top Navigation Bar
  root.appendChild(Navbar());

  // Main Layout with Sidebar & Content Area
  const bodyLayout = el('div', { class: 'flex-1 flex overflow-hidden' });

  // Sidebar
  bodyLayout.appendChild(
    Sidebar({
      currentRoute: currentPath,
      onNavigate: navigate
    })
  );

  // Content Container
  const contentArea = el('main', { class: 'flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8' });

  // View Switcher inside ErrorBoundary
  const viewContainer = ErrorBoundary({
    fallback: (err) =>
      el(
        'div',
        { class: 'p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2' },
        el('h3', { class: 'font-bold' }, 'Application View Error'),
        el('p', { class: 'text-xs font-mono' }, String(err))
      ),
    children: () =>
      Switch({
        fallback: () => NotFoundView({ onNavigate: navigate }),
        children: [
          Match({
            when: () => currentPath.value === '/' || currentPath.value === '',
            children: () =>
              DashboardView({
                onNavigate: navigate,
                onOpenNewProject: () => {
                  isNewProjectModalOpen.value = true;
                },
                onOpenNewTask: () => {
                  isNewTaskModalOpen.value = true;
                }
              })
          }),
          Match({
            when: () => currentPath.value === '/projects' && !activeProjectId.value,
            children: () =>
              ProjectsView({
                onNavigate: navigate,
                onOpenNewProject: () => {
                  isNewProjectModalOpen.value = true;
                }
              })
          }),
          Match({
            when: () => currentPath.value === '/projects' && !!activeProjectId.value,
            children: () =>
              ProjectDetailView({
                projectId: activeProjectId.value || '',
                onNavigate: navigate,
                onOpenNewTask: () => {
                  isNewTaskModalOpen.value = true;
                }
              })
          }),
          Match({
            when: () => currentPath.value === '/tasks',
            children: () =>
              TaskBoardView({
                onOpenNewTask: () => {
                  isNewTaskModalOpen.value = true;
                }
              })
          }),
          Match({
            when: () => currentPath.value === '/security',
            children: () => SecurityDiagnosticsView()
          }),
          Match({
            when: () => currentPath.value === '/settings',
            children: () => SettingsView()
          })
        ]
      })
  });

  contentArea.appendChild(viewContainer);
  bodyLayout.appendChild(contentArea);
  root.appendChild(bodyLayout);

  // Notifications Toast Overlay
  root.appendChild(NotificationToast());

  // Modal: New Project Form
  const newProjectModal = Modal({
    isOpen: () => isNewProjectModalOpen.value,
    onClose: () => {
      isNewProjectModalOpen.value = false;
    },
    title: 'Create New Project',
    children: el(
      'form',
      {
        class: 'space-y-4',
        onSubmit: (e: Event) => {
          e.preventDefault();
          projectFormHandler.form.handleSubmit(e);
        }
      },
      // Name Field
      el(
        'div',
        { class: 'space-y-1' },
        el('label', { class: 'text-xs font-bold text-slate-700' }, 'Project Name *'),
        el('input', {
          type: 'text',
          class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
          placeholder: 'e.g. Next-Gen Security Engine',
          value: () => projectFormHandler.fields.name.value.value,
          onInput: (e: Event) => {
            projectFormHandler.fields.name.setValue((e.target as HTMLInputElement).value);
          }
        }),
        Show({
          when: () => !!projectFormHandler.fields.name.error.value,
          children: () =>
            el('div', { class: 'text-xxs text-rose-600 font-semibold' }, () => projectFormHandler.fields.name.error.value)
        })
      ),
      // Category & Lead Row
      el(
        'div',
        { class: 'grid grid-cols-2 gap-3' },
        el(
          'div',
          { class: 'space-y-1' },
          el('label', { class: 'text-xs font-bold text-slate-700' }, 'Category'),
          el(
            'select',
            {
              class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
              onChange: (e: Event) => {
                projectFormHandler.fields.category.setValue((e.target as HTMLSelectElement).value as any);
              }
            },
            el('option', { value: 'core' }, 'Core'),
            el('option', { value: 'infra' }, 'Infrastructure'),
            el('option', { value: 'security' }, 'Security'),
            el('option', { value: 'frontend' }, 'Frontend'),
            el('option', { value: 'tooling' }, 'Tooling')
          )
        ),
        el(
          'div',
          { class: 'space-y-1' },
          el('label', { class: 'text-xs font-bold text-slate-700' }, 'Project Lead *'),
          el('input', {
            type: 'text',
            class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
            value: () => projectFormHandler.fields.lead.value.value,
            onInput: (e: Event) => {
              projectFormHandler.fields.lead.setValue((e.target as HTMLInputElement).value);
            }
          })
        )
      ),
      // Description Field
      el(
        'div',
        { class: 'space-y-1' },
        el('label', { class: 'text-xs font-bold text-slate-700' }, 'Description *'),
        el('textarea', {
          rows: 3,
          class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
          placeholder: 'Provide high-level architecture overview and deliverables...',
          value: () => projectFormHandler.fields.description.value.value,
          onInput: (e: Event) => {
            projectFormHandler.fields.description.setValue((e.target as HTMLTextAreaElement).value);
          }
        }),
        Show({
          when: () => !!projectFormHandler.fields.description.error.value,
          children: () =>
            el('div', { class: 'text-xxs text-rose-600 font-semibold' }, () => projectFormHandler.fields.description.error.value)
        })
      ),
      // Submit Button
      el(
        'div',
        { class: 'pt-2 flex justify-end gap-2' },
        el(
          'button',
          {
            type: 'button',
            class: 'px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg',
            onClick: () => {
              isNewProjectModalOpen.value = false;
            }
          },
          'Cancel'
        ),
        el(
          'button',
          {
            type: 'submit',
            class: 'px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-xs'
          },
          'Create Project'
        )
      )
    )
  });

  // Modal: New Task Form
  const newTaskModal = Modal({
    isOpen: () => isNewTaskModalOpen.value,
    onClose: () => {
      isNewTaskModalOpen.value = false;
    },
    title: 'Create New Task',
    children: el(
      'form',
      {
        class: 'space-y-4',
        onSubmit: (e: Event) => {
          e.preventDefault();
          taskFormHandler.form.handleSubmit(e);
        }
      },
      // Target Project Select
      el(
        'div',
        { class: 'space-y-1' },
        el('label', { class: 'text-xs font-bold text-slate-700' }, 'Target Project *'),
        el(
          'select',
          {
            class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
            onChange: (e: Event) => {
              taskFormHandler.fields.projectId.setValue((e.target as HTMLSelectElement).value);
            }
          },
          ...store.projects.map((p) => el('option', { value: p.id }, p.name))
        )
      ),
      // Title Field
      el(
        'div',
        { class: 'space-y-1' },
        el('label', { class: 'text-xs font-bold text-slate-700' }, 'Task Title *'),
        el('input', {
          type: 'text',
          class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
          placeholder: 'e.g. Implement fine-grained reactive reconciliation',
          value: () => taskFormHandler.fields.title.value.value,
          onInput: (e: Event) => {
            taskFormHandler.fields.title.setValue((e.target as HTMLInputElement).value);
          }
        }),
        Show({
          when: () => !!taskFormHandler.fields.title.error.value,
          children: () =>
            el('div', { class: 'text-xxs text-rose-600 font-semibold' }, () => taskFormHandler.fields.title.error.value)
        })
      ),
      // Priority & Assignee Row
      el(
        'div',
        { class: 'grid grid-cols-2 gap-3' },
        el(
          'div',
          { class: 'space-y-1' },
          el('label', { class: 'text-xs font-bold text-slate-700' }, 'Priority'),
          el(
            'select',
            {
              class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
              onChange: (e: Event) => {
                taskFormHandler.fields.priority.setValue((e.target as HTMLSelectElement).value as any);
              }
            },
            el('option', { value: 'medium' }, 'Medium'),
            el('option', { value: 'high' }, 'High'),
            el('option', { value: 'urgent' }, 'Urgent'),
            el('option', { value: 'low' }, 'Low')
          )
        ),
        el(
          'div',
          { class: 'space-y-1' },
          el('label', { class: 'text-xs font-bold text-slate-700' }, 'Assignee *'),
          el('input', {
            type: 'text',
            class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
            value: () => taskFormHandler.fields.assignee.value.value,
            onInput: (e: Event) => {
              taskFormHandler.fields.assignee.setValue((e.target as HTMLInputElement).value);
            }
          })
        )
      ),
      // Description Field
      el(
        'div',
        { class: 'space-y-1' },
        el('label', { class: 'text-xs font-bold text-slate-700' }, 'Task Description'),
        el('textarea', {
          rows: 2,
          class: 'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none',
          placeholder: 'Task acceptance criteria...',
          value: () => taskFormHandler.fields.description.value.value,
          onInput: (e: Event) => {
            taskFormHandler.fields.description.setValue((e.target as HTMLTextAreaElement).value);
          }
        })
      ),
      // Submit Button
      el(
        'div',
        { class: 'pt-2 flex justify-end gap-2' },
        el(
          'button',
          {
            type: 'button',
            class: 'px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg',
            onClick: () => {
              isNewTaskModalOpen.value = false;
            }
          },
          'Cancel'
        ),
        el(
          'button',
          {
            type: 'submit',
            class: 'px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-xs'
          },
          'Create Task'
        )
      )
    )
  });

  root.appendChild(newProjectModal);
  root.appendChild(newTaskModal);

  return root;
}
