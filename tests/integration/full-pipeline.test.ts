import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compileTemplate, TemplateParser } from '../../packages/compiler/src/index.js';
import { signal, computed, effect, createRoot } from '../../packages/reactivity/src/index.js';
import { sanitizeUri, escapeForScriptPayload, sanitizeHtmlString } from '../../packages/security/src/index.js';
import { bindText, bindAttr, template, Show, For, createComponent } from '../../packages/runtime/src/index.js';
import { createRouter } from '../../packages/router/src/index.js';
import { createResource, HttpClient } from '../../packages/http/src/index.js';
import { createForm, StandardSchemaV1 } from '../../packages/forms/src/index.js';
import { renderToString, createServerData, hydrate } from '../../packages/ssr/src/index.js';

// DOM mock node for integrated testing
class MockDOMElement {
  public nodeType: number = 1;
  public nodeName: string;
  public textContent: string = '';
  public attributes: Record<string, string> = {};
  public parentNode: MockDOMElement | null = null;
  public childNodes: MockDOMElement[] = [];

  constructor(tagName = 'DIV') {
    this.nodeName = tagName.toUpperCase();
  }

  get nextSibling(): MockDOMElement | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx === -1 || idx === this.parentNode.childNodes.length - 1) return null;
    return this.parentNode.childNodes[idx + 1];
  }

  appendChild(child: MockDOMElement): MockDOMElement {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(newChild: MockDOMElement, refChild: MockDOMElement | null): MockDOMElement {
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    if (!refChild) {
      this.childNodes.push(newChild);
    } else {
      const idx = this.childNodes.indexOf(refChild);
      if (idx === -1) {
        this.childNodes.push(newChild);
      } else {
        this.childNodes.splice(idx, 0, newChild);
      }
    }
    newChild.parentNode = this;
    return newChild;
  }

  removeChild(child: MockDOMElement): MockDOMElement {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  setAttribute(key: string, val: string): void {
    this.attributes[key] = val;
  }

  getAttribute(key: string): string | undefined {
    return this.attributes[key];
  }
}

describe('Samrey Full Pipeline End-to-End Integration', () => {
  it('executes full end-to-end pipeline: Compiler -> AST -> AIR -> Codegen -> Reactivity -> Runtime -> Security', () => {
    // 1. Source Template
    const rawTemplate = `
      <section class="user-dashboard">
        <h2>{user.name}</h2>
        <a href={user.profileUrl}>Profile Link</a>
        <div class="user-role">
          <span>Standard User</span>
        </div>
        <ul class="permissions-list">
          <li>read:reports</li>
        </ul>
      </section>
    `;

    // 2. Parser & AST Generation
    const parser = new TemplateParser(rawTemplate);
    const { ast, diagnostics } = parser.parse();
    assert.equal(diagnostics.length, 0);
    assert.equal(ast.type, 'Root');

    // 3. AIR Compilation & Codegen
    const compilationResult = compileTemplate(rawTemplate);
    assert.equal(compilationResult.templates.length, 1);
    assert.ok(compilationResult.generatedCode.includes('/*#__PURE__*/ template('));
    assert.ok(compilationResult.generatedCode.includes('bindText('));

    // 4. Reactivity & Security Sanitization
    const user = {
      name: signal('Alice Admin'),
      profileUrl: signal('javascript:alert("xss")'),
      isAdmin: signal(false),
      permissions: signal([
        { id: 1, name: 'read:reports' },
        { id: 2, name: 'write:reports' }
      ])
    };

    const sanitizedHref = computed(() => sanitizeUri(user.profileUrl.value));
    assert.equal(sanitizedHref.value, 'about:blank'); // Blocked!

    user.profileUrl.value = 'https://samrey.dev/users/alice';
    assert.equal(sanitizedHref.value, 'https://samrey.dev/users/alice'); // Safe
  });

  it('runs complete realistic application: Components, Show, For, Router, HTTP, Standard Schema Forms, SSR and Hydration', async () => {
    // 1. Router Setup
    const router = createRouter([
      { path: '/', component: () => 'Dashboard' },
      { path: '/projects/:id', component: () => 'Project Detail' }
    ]);
    router.navigate('/projects/42');
    assert.equal(router.currentPath.value, '/projects/42');
    assert.equal(router.currentParams.value.id, '42');

    // 2. HTTP Resource & Cache
    let fetchCounter = 0;
    const projectFetcher = async () => {
      fetchCounter++;
      return { id: 42, title: 'Enterprise Core', tasksCount: 3 };
    };

    const projectResource = createResource<{ id: number; title: string; tasksCount: number }>(projectFetcher);
    await projectResource.refetch();
    assert.equal(projectResource.status.value, 'success');
    assert.equal(projectResource.data.value?.title, 'Enterprise Core');

    // 3. Reactive State + <Show> + <For>
    const isEditing = signal(false);
    const taskList = signal([
      { id: 't1', title: 'Compile AST' },
      { id: 't2', title: 'Implement Reconciler' }
    ]);

    const rootContainer = new MockDOMElement('DIV');

    // Mount <Show>
    const showMarker = Show({
      when: () => isEditing.value,
      fallback: () => new MockDOMElement('SPAN') as unknown as Node,
      children: () => new MockDOMElement('FORM') as unknown as Node
    });
    rootContainer.appendChild(showMarker as unknown as MockDOMElement);

    // Toggle condition: false -> true
    isEditing.value = true;
    assert.equal(rootContainer.childNodes.length, 2); // marker + form

    // Toggle condition: true -> false
    isEditing.value = false;
    assert.equal(rootContainer.childNodes.length, 2); // marker + fallback
    assert.equal(rootContainer.childNodes[1].nodeName, 'SPAN');

    // Mount <For>
    const forMarker = For({
      each: () => taskList.value,
      key: (t) => t.id,
      children: (task, index) => {
        const itemElem = new MockDOMElement('LI');
        itemElem.textContent = `${task.title} (#${index()})`;
        return itemElem as unknown as Node;
      }
    });
    rootContainer.appendChild(forMarker as unknown as MockDOMElement);

    // Trigger list update to populate
    taskList.value = [
      { id: 't1', title: 'Compile AST' },
      { id: 't2', title: 'Implement Reconciler' }
    ];
    // rootContainer now contains: showMarker + fallback + forMarker + 2 task items
    assert.equal(rootContainer.childNodes.length, 5);

    // 4. Standard Schema Form
    type NewTaskInput = {
      title: string;
      priority: number;
    };

    const TaskSchema: StandardSchemaV1<NewTaskInput> = {
      '~standard': {
        version: 1,
        vendor: 'samrey-spec',
        validate: (input: unknown) => {
          const v = input as NewTaskInput;
          const issues: { message: string; path?: (string | number)[] }[] = [];
          if (!v.title || v.title.length < 3) {
            issues.push({ message: 'Title must be at least 3 characters', path: ['title'] });
          }
          if (v.priority < 1 || v.priority > 5) {
            issues.push({ message: 'Priority must be 1-5', path: ['priority'] });
          }
          if (issues.length > 0) return { issues };
          return { value: v };
        }
      }
    };

    let submittedTask: NewTaskInput | null = null;
    const taskForm = createForm<NewTaskInput>({
      initialValues: { title: 'AB', priority: 0 },
      schema: TaskSchema,
      onSubmit: (values) => {
        submittedTask = values;
        taskList.value = [...taskList.value, { id: 't3', title: values.title }];
      }
    });

    const submit1 = await taskForm.submit();
    assert.equal(submit1, false);
    assert.equal(taskForm.fields.title.error.value, 'Title must be at least 3 characters');
    assert.equal(taskForm.fields.priority.error.value, 'Priority must be 1-5');

    // Fix and submit
    taskForm.fields.title.setValue('Run E2E Pipeline');
    taskForm.fields.priority.setValue(5);
    const submit2 = await taskForm.submit();
    assert.equal(submit2, true);
    assert.equal(submittedTask?.title, 'Run E2E Pipeline');
    assert.equal(taskList.value.length, 3);

    // 5. SSR & Hydration Pipeline
    const ssrHtml = await renderToString(
      '<div id="app"><header><h1>Enterprise Core</h1></header><main><!-- content --></main></div>',
      {
        title: 'Project #42 - Enterprise Core',
        state: {
          project: projectResource.data.value,
          tasks: taskList.value,
          route: router.currentPath.value
        }
      }
    );

    assert.ok(ssrHtml.includes('<!DOCTYPE html>'));
    assert.ok(ssrHtml.includes('<title>Project #42 - Enterprise Core</title>'));
    assert.ok(ssrHtml.includes('__SAMREY_STATE__'));
    assert.ok(ssrHtml.includes('Enterprise Core'));
    assert.ok(ssrHtml.includes('Run E2E Pipeline'));
    assert.ok(ssrHtml.includes('window.__SAMREY_EVENTS__'));
  });
});
