/**
 * @license Apache-2.0
 * TaskForm Component - Form Validation with @samrey/forms
 */

import { Signal } from '@samrey/reactivity';
import { createForm } from '@samrey/forms';
import { template, on, bindText, bindAttr } from '@samrey/runtime';
import { Task } from './TaskList.js';

const _formTmpl = template(`
  <form class="task-form">
    <h3>Add New Task</h3>
    <div class="form-group">
      <label for="task-title-input">Task Title</label>
      <input id="task-title-input" class="input input-title" type="text" placeholder="e.g. Integrate Samrey AI" />
      <span class="field-error title-error"></span>
    </div>
    <div class="form-group">
      <label for="task-priority-select">Priority</label>
      <select id="task-priority-select" class="select select-priority">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
      </select>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-submit">Add Task</button>
      <span class="form-error"></span>
    </div>
  </form>
`);

export function TaskForm(props: { tasks: Signal<Task[]> }) {
  let nextId = 100;

  const form = createForm({
    initialValues: {
      title: '',
      priority: 'medium' as 'low' | 'medium' | 'high'
    },
    validators: {
      title: (val) => {
        if (!val || val.trim().length === 0) return 'Task title is required';
        if (val.trim().length < 3) return 'Task title must be at least 3 characters';
        return null;
      }
    },
    onSubmit: async (values) => {
      const newTask: Task = {
        id: ++nextId,
        title: values.title.trim(),
        completed: false,
        priority: values.priority
      };
      // Immutable update to trigger reactivity
      props.tasks.update((current) => [...current, newTask]);
      form.reset();
      titleInput.value = '';
      prioritySelect.value = 'medium';
    }
  });

  const root = _formTmpl() as HTMLFormElement;

  const titleInput = root.querySelector('.input-title') as HTMLInputElement;
  const prioritySelect = root.querySelector('.select-priority') as HTMLSelectElement;
  const titleErrorEl = root.querySelector('.title-error') as HTMLElement;
  const formErrorEl = root.querySelector('.form-error') as HTMLElement;
  const submitBtn = root.querySelector('.btn-submit') as HTMLButtonElement;

  bindText(titleErrorEl, () => form.fields.title.error.value || '');
  bindText(formErrorEl, () => form.formError.value || '');
  bindAttr(submitBtn, 'disabled', () => (form.isSubmitting.value ? 'true' : null));

  on(titleInput, 'input', () => {
    form.fields.title.setValue(titleInput.value);
  });

  on(prioritySelect, 'change', () => {
    form.fields.priority.setValue(prioritySelect.value as 'low' | 'medium' | 'high');
  });

  on(root, 'submit', async (e) => {
    e.preventDefault();
    await form.submit();
  });

  return root;
}

