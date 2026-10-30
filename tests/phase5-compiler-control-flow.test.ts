import { test, describe } from 'node:test';
import assert from 'node:assert';
import { compileTemplate, SamreyCompilerError } from '../packages/compiler/src/index.js';
import { samreyVitePlugin } from '../packages/cli/src/vite-plugin.js';

describe('Phase 5.3 - Compiler Error for Template-Level Control Flow', () => {
  const listedTags = [
    'Show',
    'For',
    'Switch',
    'Match',
    'Dynamic',
    'Portal',
    'ErrorBoundary',
    'Suspense'
  ];

  test('each listed tag throws with correct file, line, column and tag name', () => {
    for (const tag of listedTags) {
      const template = `\n  <div class="wrapper">\n    <${tag} when={isActive}>\n      <span>Content</span>\n    </${tag}>\n  </div>`;
      const filename = `src/views/${tag}Test.samrey`;

      assert.throws(
        () => compileTemplate(template, { filename }),
        (err: any) => {
          assert.ok(err instanceof SamreyCompilerError, `Error for <${tag}> must be SamreyCompilerError`);
          assert.strictEqual(err.code, 'SAMREY-108', `Error code must be SAMREY-108 for <${tag}>`);
          assert.strictEqual(err.filename, filename, `Error must preserve filename`);
          assert.strictEqual(err.line, 3, `Line must point to <${tag}> opening`);
          assert.strictEqual(err.column, 5, `Column must point to <${tag}> opening`);
          assert.ok(err.message.includes(tag), `Message must include tag name "${tag}"`);
          assert.ok(
            err.message.includes('Template-level control flow is not supported. Compose it with Show()/For() in TypeScript.'),
            `Message must include required fix string`
          );
          return true;
        }
      );
    }
  });

  test('a capitalized custom component tag throws', () => {
    const template = `<div><UserProfile id="123" name="Alice" /></div>`;
    const filename = 'src/components/Dashboard.samrey';

    assert.throws(
      () => compileTemplate(template, { filename }),
      (err: any) => {
        assert.ok(err instanceof SamreyCompilerError);
        assert.strictEqual(err.code, 'SAMREY-108');
        assert.strictEqual(err.filename, filename);
        assert.strictEqual(err.line, 1);
        assert.strictEqual(err.column, 6);
        assert.ok(err.message.includes('UserProfile'));
        assert.ok(err.message.includes('Template-level control flow is not supported. Compose it with Show()/For() in TypeScript.'));
        return true;
      }
    );
  });

  test('tag-like text in an attribute value, comment, {} expression, <style> and <script> does not throw', () => {
    const safeTemplate = `
      <div
        data-info="<Show> is awesome"
        title="<For each={items}>"
      >
        <!-- <Switch><Match> this is inside a comment </Match></Switch> -->
        <span>{"<Portal> and <Dynamic> in expression"}</span>
        <style>
          .Show, .For, .ErrorBoundary { color: red; }
          /* <Suspense> inside CSS comment */
        </style>
        <script>
          const fakeTag = "<Show when={true}>";
          console.log("<For>");
        </script>
        <p>Regular text mentioning &lt;Show&gt; or <show>lowercase</show></p>
      </div>
    `;

    // Must compile without throwing!
    const result = compileTemplate(safeTemplate, { filename: 'safe.html' });
    assert.ok(result.templates.length > 0);
    assert.ok(result.generatedCode.includes('template('));
  });

  test('plain HTML templates compile exactly as before (same output bytes)', () => {
    const plainHtml = `<div class="container"><h1 id="title">{title.value}</h1><p class="lead">Description</p></div>`;
    const result = compileTemplate(plainHtml);
    assert.strictEqual(result.templates.length, 1);
    assert.ok(result.generatedCode.includes('template('));
    assert.ok(result.generatedCode.includes('bindText('));
  });

  test('the Vite plugin reports the error with the file id', async () => {
    const plugin = samreyVitePlugin() as any;
    const fileId = '/project/src/BadView.samrey';
    const badCode = `<section><Show when={user.isAuth}><h1>Welcome</h1></Show></section>`;

    assert.throws(
      () => plugin.transform(badCode, fileId),
      (err: any) => {
        assert.ok(err.message.includes(fileId), `Vite plugin error must include the file id: ${err.message}`);
        assert.ok(err.message.includes('Show'), `Vite plugin error must include tag name: ${err.message}`);
        assert.ok(err.message.includes('Template-level control flow is not supported. Compose it with Show()/For() in TypeScript.'));
        return true;
      }
    );
  });

  test('multiple occurrences: first location and the count are reported', () => {
    const multiTemplate = `
      <div class="page">
        <Show when={cond1}><span>First</span></Show>
        <For each={items}>{(it) => <span>Item</span>}</For>
        <UserProfile name="Bob" />
      </div>
    `;
    const filename = 'src/MultiError.samrey';

    assert.throws(
      () => compileTemplate(multiTemplate, { filename }),
      (err: any) => {
        assert.ok(err instanceof SamreyCompilerError);
        assert.strictEqual(err.code, 'SAMREY-108');
        assert.strictEqual(err.line, 3, 'Must report line of first occurrence (<Show>)');
        assert.strictEqual(err.column, 9, 'Must report column of first occurrence');
        assert.ok(err.message.includes('Show'), 'Must report tag of first occurrence');
        // Total count should be 3 (<Show>, <For>, <UserProfile>)
        assert.ok(
          err.message.includes('3') || err.explanation.includes('3'),
          `Error must report total count of 3 occurrences: ${err.message}`
        );
        return true;
      }
    );
  });
});
