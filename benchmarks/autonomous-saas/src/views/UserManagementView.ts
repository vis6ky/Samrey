/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — User Management View
 */

import { signal, computed } from '@samrey/reactivity';
import { template, on, bindText, For } from '@samrey/runtime';
import { createForm, bindField } from '@samrey/forms';
import { usersSignal, UserService, ManagedUser } from '../services/UserService.js';
import { notify } from '../components/NotificationCenter.js';

const _viewTmpl = template(`
  <div class="page-users">
    <div class="users-header">
      <h2>User Management</h2>
      <div class="toolbar">
        <input ref="searchInput" class="search-input" placeholder="Search by name or email..." />
        <select ref="roleFilterSelect" class="filter-select">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
    </div>

    <!-- Create User Form -->
    <div class="card form-card">
      <h3>Add New Team Member</h3>
      <form ref="userForm" class="inline-form" novalidate>
        <div class="form-group">
          <label for="newUserName">Name</label>
          <input ref="nameInput" id="newUserName" name="name" type="text" placeholder="Full name" />
          <span ref="nameError" class="error-msg" role="alert"></span>
        </div>
        <div class="form-group">
          <label for="newUserEmail">Email</label>
          <input ref="emailInput" id="newUserEmail" name="email" type="email" placeholder="Email address" />
          <span ref="emailError" class="error-msg" role="alert"></span>
        </div>
        <div class="form-group">
          <label for="newUserRole">Role</label>
          <select ref="roleInput" id="newUserRole" name="role">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button ref="submitBtn" type="submit" class="btn-primary">Add Member</button>
      </form>
    </div>

    <!-- Users Table -->
    <div class="table-container">
      <table class="saas-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody ref="userTableBody"></tbody>
      </table>
    </div>
  </div>
`);

const _rowTmpl = template(`
  <tr class="user-row">
    <td ref="rowName" class="font-medium"></td>
    <td ref="rowEmail"></td>
    <td><span ref="rowRole" class="badge"></span></td>
    <td><span ref="rowStatus" class="status-indicator"></span></td>
    <td ref="rowCreated"></td>
    <td>
      <button ref="delBtn" class="btn-danger btn-sm">Delete</button>
    </td>
  </tr>
`);

export function UserManagementView(): HTMLElement {
  const searchQuery = signal<string>('');
  const roleFilter = signal<string>('all');

  const filteredUsers = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    const role = roleFilter.value;

    return usersSignal.value.filter(u => {
      const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = role === 'all' || u.role === role;
      return matchesQuery && matchesRole;
    });
  });

  const root = _viewTmpl.clone();
  const {
    searchInput,
    roleFilterSelect,
    userForm,
    nameInput,
    nameError,
    emailInput,
    emailError,
    roleInput,
    userTableBody
  } = root.refs;

  // Search and filter listeners
  on(searchInput, 'input', () => {
    searchQuery.value = (searchInput as HTMLInputElement).value ?? '';
  });

  on(roleFilterSelect, 'change', () => {
    roleFilter.value = (roleFilterSelect as HTMLSelectElement).value ?? 'all';
  });

  // User creation form
  interface NewUserFormValues {
    name: string;
    email: string;
    role: 'admin' | 'member' | 'viewer';
  }

  const form = createForm<NewUserFormValues>({
    initialValues: { name: '', email: '', role: 'member' },
    validators: {
      name: (val: string) => (!val || val.length < 2 ? 'Name must be at least 2 characters' : null),
      email: (val: string) => (!val || !val.includes('@') ? 'Valid email is required' : null)
    },
    onSubmit: async (values) => {
      await UserService.createUser({
        name: values.name,
        email: values.email,
        role: values.role || 'member',
        status: 'active'
      });
      notify(`User ${values.name} added successfully!`, 'success');
      form.fields.name.setValue('');
      form.fields.email.setValue('');
    }
  });

  bindField(nameInput, form.fields.name);
  bindField(emailInput, form.fields.email);
  bindField(roleInput, form.fields.role);

  bindText(nameError, () => form.fields.name.error.value ?? '');
  bindText(emailError, () => form.fields.email.error.value ?? '');

  on(userForm, 'submit', async (e: Event) => {
    e.preventDefault();
    await form.submit();
  });

  // Render Table Rows with For()
  const rows = For({
    each: () => filteredUsers.value,
    key: (u: ManagedUser) => `${u.id}_${u.role}_${u.status}`,
    children: (u: ManagedUser) => {
      const row = _rowTmpl.clone();
      const { rowName, rowEmail, rowRole, rowStatus, rowCreated, delBtn } = row.refs;

      bindText(rowName, () => u.name);
      bindText(rowEmail, () => u.email);
      bindText(rowRole, () => u.role.toUpperCase());
      bindText(rowStatus, () => u.status);
      bindText(rowCreated, () => u.createdAt);

      on(delBtn, 'click', async () => {
        await UserService.deleteUser(u.id);
        notify(`User ${u.name} removed`, 'info');
      });

      return row;
    }
  });

  userTableBody.appendChild(rows);

  return root;
}
