/**
 * @license Apache-2.0
 * Aether Project Manager — Standard Schema Form Handlers
 * Powered 100% by @aether/forms with Standard Schema (~standard v1)
 */

import { createForm, createField, getAccessibleFieldProps } from '@aether/forms';
import { Project, Task } from './types.js';

// Project Form Schema
export interface ProjectFormData {
  name: string;
  description: string;
  category: Project['category'];
  status: Project['status'];
  lead: string;
}

export function createProjectForm(
  initialData?: Partial<ProjectFormData>,
  onSubmit?: (data: ProjectFormData) => Promise<void> | void
) {
  const schema = {
    '~standard': {
      version: 1 as const,
      vendor: 'aether-forms',
      validate: (input: unknown) => {
        const val = (input || {}) as Partial<ProjectFormData>;
        const issues: Array<{ message: string; path?: string[] }> = [];

        if (!val.name || val.name.trim().length < 3) {
          issues.push({ message: 'Project name must be at least 3 characters.', path: ['name'] });
        }
        if (!val.description || val.description.trim().length < 10) {
          issues.push({ message: 'Description must be at least 10 characters long.', path: ['description'] });
        }
        if (!val.lead || val.lead.trim().length < 2) {
          issues.push({ message: 'Project lead name is required.', path: ['lead'] });
        }

        if (issues.length > 0) {
          return { issues };
        }
        return { value: val as ProjectFormData };
      }
    }
  };

  const form = createForm<ProjectFormData>({
    schema,
    initialValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      category: initialData?.category || 'core',
      status: initialData?.status || 'active',
      lead: initialData?.lead || ''
    },
    onSubmit: async (values) => {
      if (onSubmit) {
        await onSubmit(values);
      }
    }
  });

  return {
    form,
    fields: form.fields,
    getAccessibleProps: (fieldName: keyof ProjectFormData) => {
      return getAccessibleFieldProps(form.fields[fieldName]);
    }
  };
}

// Task Form Schema
export interface TaskFormData {
  projectId: string;
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  assignee: string;
  tagsString: string;
  dueDate: string;
}

export function createTaskForm(
  initialData?: Partial<TaskFormData>,
  onSubmit?: (data: TaskFormData) => Promise<void> | void
) {
  const schema = {
    '~standard': {
      version: 1 as const,
      vendor: 'aether-forms',
      validate: (input: unknown) => {
        const val = (input || {}) as Partial<TaskFormData>;
        const issues: Array<{ message: string; path?: string[] }> = [];

        if (!val.title || val.title.trim().length < 3) {
          issues.push({ message: 'Task title must be at least 3 characters.', path: ['title'] });
        }
        if (!val.projectId) {
          issues.push({ message: 'Target project is required.', path: ['projectId'] });
        }
        if (!val.assignee || val.assignee.trim().length < 2) {
          issues.push({ message: 'Assignee is required.', path: ['assignee'] });
        }
        if (!val.dueDate) {
          issues.push({ message: 'Due date is required.', path: ['dueDate'] });
        }

        if (issues.length > 0) {
          return { issues };
        }
        return { value: val as TaskFormData };
      }
    }
  };

  const form = createForm<TaskFormData>({
    schema,
    initialValues: {
      projectId: initialData?.projectId || 'proj-1',
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'todo',
      priority: initialData?.priority || 'medium',
      assignee: initialData?.assignee || '',
      tagsString: initialData?.tagsString || 'dev, feature',
      dueDate: initialData?.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
    },
    onSubmit: async (values) => {
      if (onSubmit) {
        await onSubmit(values);
      }
    }
  });

  return {
    form,
    fields: form.fields
  };
}
