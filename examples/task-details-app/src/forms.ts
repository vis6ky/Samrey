/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Form Schemas & Field Validators
 */

import { createForm, createField } from '@samrey/forms';
import { sanitizeHtml } from '@samrey/security';

export interface FormValidationState {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateLoginForm(values: { email?: string; password?: string }): FormValidationState {
  const errors: Record<string, string> = {};

  if (!values.email || !values.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!values.email.includes('@') || !values.email.includes('.')) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 6) {
    errors.password = 'Password must contain at least 6 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateRegisterForm(values: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}): FormValidationState {
  const errors: Record<string, string> = {};

  const name = (values.name || '').trim();
  if (!name) {
    errors.name = 'Full name is required.';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters long.';
  }

  const email = (values.email || '').trim();
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!email.includes('@') || !email.includes('.')) {
    errors.email = 'Please provide a valid email format.';
  }

  const password = values.password || '';
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (values.confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateTaskForm(values: {
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
}): FormValidationState {
  const errors: Record<string, string> = {};

  const title = (values.title || '').trim();
  if (!title) {
    errors.title = 'Task title is required.';
  } else if (title.length < 3) {
    errors.title = 'Task title must be at least 3 characters.';
  }

  const description = (values.description || '').trim();
  if (!description) {
    errors.description = 'Task description is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
