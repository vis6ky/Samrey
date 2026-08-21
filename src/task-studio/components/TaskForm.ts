/**
 * @license Apache-2.0
 * @aether/task-studio - Accessible Task Form Component with Standard Schema (~v1)
 */

import { el, Show } from '@aether/runtime';
import { createForm, StandardSchemaV1 } from '@aether/forms';
import { TaskFormValues, TaskPriority, TaskCategory } from '../types.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Select } from './ui/Select.js';

export interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

/**
 * Standard Schema (~v1) definition for task validation.
 */
export const taskSchema: StandardSchemaV1<TaskFormValues> = {
  '~standard': {
    version: 1,
    vendor: 'aether-task-studio',
    validate: (input: unknown) => {
      const values = (input || {}) as Record<string, any>;
      const issues: Array<{ message: string; path?: (string | number)[] }> = [];

      // 1. Title validation
      const title = typeof values.title === 'string' ? values.title.trim() : '';
      if (!title) {
        issues.push({ message: 'Title is required.', path: ['title'] });
      } else if (title.length < 3) {
        issues.push({ message: 'Title must be at least 3 characters.', path: ['title'] });
      } else if (title.length > 100) {
        issues.push({ message: 'Title cannot exceed 100 characters.', path: ['title'] });
      }

      // 2. Priority validation
      const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
      if (!values.priority || !validPriorities.includes(values.priority)) {
        issues.push({ message: 'Valid priority selection is required.', path: ['priority'] });
      }

      // 3. Category validation
      const validCategories: TaskCategory[] = ['engineering', 'design', 'security', 'architecture', 'documentation'];
      if (!values.category || !validCategories.includes(values.category)) {
        issues.push({ message: 'Valid category selection is required.', path: ['category'] });
      }

      // 4. Due Date validation
      if (!values.dueDate || typeof values.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate)) {
        issues.push({ message: 'Valid due date in YYYY-MM-DD format is required.', path: ['dueDate'] });
      }

      if (issues.length > 0) {
        return { issues };
      }

      return {
        value: {
          title,
          description: typeof values.description === 'string' ? values.description.trim() : '',
          priority: values.priority as TaskPriority,
          category: values.category as TaskCategory,
          dueDate: values.dueDate
        }
      };
    }
  }
};

export function TaskForm(props: TaskFormProps): HTMLElement {
  const defaultDueDate = new Date().toISOString().split('T')[0]!;

  const defaults: TaskFormValues = {
    title: props.initialValues?.title || '',
    description: props.initialValues?.description || '',
    priority: props.initialValues?.priority || 'medium',
    category: props.initialValues?.category || 'engineering',
    dueDate: props.initialValues?.dueDate || defaultDueDate
  };

  const form = createForm<TaskFormValues>({
    initialValues: defaults,
    schema: taskSchema,
    onSubmit: async (vals) => {
      await props.onSubmit(vals);
    }
  });

  const formElement = el('form', {
    id: 'task-editor-form',
    class: 'flex flex-col space-y-5 select-none',
    noValidate: true,
    onSubmit: async (e: Event) => {
      e.preventDefault();
      await form.submit(e);
    }
  });

  // Form-Level Error Alert
  const formErrorAlert = Show({
    when: () => Boolean(form.formError.value),
    children: () =>
      el(
        'div',
        {
          role: 'alert',
          class: 'p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2'
        },
        el('span', { class: 'font-bold' }, '!'),
        el('span', null, () => form.formError.value || 'Please fix the errors below.')
      )
  });
  formElement.appendChild(formErrorAlert);

  // Title Field
  const titleField = Input({
    id: 'task-form-title',
    name: 'title',
    label: 'Task Title',
    placeholder: 'e.g., Audit topological push-pull signal graph traversal',
    required: true,
    value: form.fields.title.value,
    error: form.fields.title.error,
    onInput: (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      form.fields.title.setValue(val);
    },
    onBlur: () => {
      form.fields.title.setTouched(true);
    }
  });
  formElement.appendChild(titleField);

  // Description Field (textarea)
  const descContainer = el('div', { class: 'flex flex-col space-y-1.5' });
  descContainer.appendChild(
    el('label', { for: 'task-form-desc', class: 'text-xs font-semibold text-slate-700' }, 'Description (Optional)')
  );
  const descInput = el('textarea', {
    id: 'task-form-desc',
    name: 'description',
    rows: 3,
    placeholder: 'Detailed context, scope, and acceptance criteria...',
    class:
      'w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-2xs transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800',
    value: form.fields.description.value.value,
    onInput: (e: Event) => {
      const val = (e.target as HTMLTextAreaElement).value;
      form.fields.description.setValue(val);
    },
    onBlur: () => {
      form.fields.description.setTouched(true);
    }
  });
  descContainer.appendChild(descInput);
  formElement.appendChild(descContainer);

  // Grid for Priority, Category, and Due Date
  const metaGrid = el('div', { class: 'grid grid-cols-1 sm:grid-cols-3 gap-4' });

  // Priority Select
  const prioritySelect = Select({
    id: 'task-form-priority',
    name: 'priority',
    label: 'Priority',
    required: true,
    options: [
      { value: 'urgent', label: '🔥 Urgent' },
      { value: 'high', label: '⚡ High' },
      { value: 'medium', label: '🔷 Medium' },
      { value: 'low', label: '☕ Low' }
    ],
    value: form.fields.priority.value,
    error: form.fields.priority.error,
    onChange: (e: Event) => {
      const val = (e.target as HTMLSelectElement).value as TaskPriority;
      form.fields.priority.setValue(val);
    }
  });
  metaGrid.appendChild(prioritySelect);

  // Category Select
  const categorySelect = Select({
    id: 'task-form-category',
    name: 'category',
    label: 'Category',
    required: true,
    options: [
      { value: 'engineering', label: 'Engineering' },
      { value: 'architecture', label: 'Architecture' },
      { value: 'security', label: 'Security' },
      { value: 'design', label: 'Design' },
      { value: 'documentation', label: 'Documentation' }
    ],
    value: form.fields.category.value,
    error: form.fields.category.error,
    onChange: (e: Event) => {
      const val = (e.target as HTMLSelectElement).value as TaskCategory;
      form.fields.category.setValue(val);
    }
  });
  metaGrid.appendChild(categorySelect);

  // Due Date Input
  const dueDateInput = Input({
    id: 'task-form-duedate',
    name: 'dueDate',
    type: 'date',
    label: 'Due Date',
    required: true,
    value: form.fields.dueDate.value,
    error: form.fields.dueDate.error,
    onInput: (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      form.fields.dueDate.setValue(val);
    },
    onBlur: () => {
      form.fields.dueDate.setTouched(true);
    }
  });
  metaGrid.appendChild(dueDateInput);
  formElement.appendChild(metaGrid);

  // Actions row (Submit & Cancel / Reset)
  const actionsRow = el('div', { class: 'pt-3 border-t border-slate-100 flex items-center justify-end space-x-3' });

  if (props.onCancel) {
    const cancelBtn = Button(
      {
        variant: 'outline',
        size: 'md',
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          form.reset();
          props.onCancel!();
        }
      },
      'Cancel'
    );
    actionsRow.appendChild(cancelBtn);
  }

  const submitBtn = Button(
    {
      id: 'task-form-submit-btn',
      type: 'submit',
      variant: 'primary',
      size: 'md',
      disabled: () => form.isSubmitting.value
    },
    () => (form.isSubmitting.value ? 'Saving Task...' : props.submitLabel || 'Save Task')
  );
  actionsRow.appendChild(submitBtn);

  formElement.appendChild(actionsRow);

  return formElement;
}
