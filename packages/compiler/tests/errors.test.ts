import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  TemplateParser,
  AetherCompilerError,
  generateSourceFrame,
  formatAetherDiagnostic
} from '../src/index.js';

describe('@aether/compiler - Structured Error Code System & Source Framing', () => {
  it('generates accurate multi-line source code frames with pointer indicator', () => {
    const source = `const x = 1;\n<div class="test">\n  <span>{unclosed\n</div>`;
    const frame = generateSourceFrame(source, 3, 10, 8);

    assert.ok(frame.includes('> 3 |   <span>{unclosed'));
    assert.ok(frame.includes('^'));
  });

  it('records AETH-101 for unclosed HTML/JSX tags', () => {
    const source = `<div class="container">\n  <p>Hello world`;
    const parser = new TemplateParser(source, { filename: 'App.tsx' });
    const { diagnostics, errors } = parser.parse();

    assert.ok(diagnostics.length > 0);
    assert.ok(diagnostics.some((d) => d.includes('AETH-101')));
    assert.ok(errors.length > 0);
    assert.equal(errors[0]?.code, 'AETH-101');
    assert.equal(errors[0]?.filename, 'App.tsx');
    assert.ok(errors[0]?.explanation.length > 0);
    assert.ok(errors[0]?.suggestion.length > 0);
  });

  it('records AETH-102 for unterminated interpolation expressions', () => {
    const source = `<div>{user.name</div>`;
    const parser = new TemplateParser(source);
    const { diagnostics, errors } = parser.parse();

    assert.ok(diagnostics.some((d) => d.includes('AETH-102')));
    const err = errors.find((e) => e.code === 'AETH-102');
    assert.ok(err !== undefined);
    assert.ok(err.message.includes('Unterminated interpolation'));
    assert.ok(err.suggestion.includes('}'));
  });

  it('records AETH-103 for missing required props on <Show> and <For>', () => {
    const showSource = `<Show fallback="Loading..."><span>Content</span></Show>`;
    const showParser = new TemplateParser(showSource);
    const showResult = showParser.parse();
    assert.ok(showResult.diagnostics.some((d) => d.includes('AETH-103')));
    assert.ok(showResult.errors.some((e) => e.code === 'AETH-103' && e.message.includes('when')));

    const forSource = `<For fallback="Empty">{(item) => <div>{item}</div>}</For>`;
    const forParser = new TemplateParser(forSource);
    const forResult = forParser.parse();
    assert.ok(forResult.diagnostics.some((d) => d.includes('AETH-103')));
    assert.ok(forResult.errors.some((e) => e.code === 'AETH-103' && e.message.includes('each')));
  });

  it('records AETH-104 for unexpected or mismatched closing tags', () => {
    const source = `<section><div>Content</span></div></section>`;
    const parser = new TemplateParser(source);
    const result = parser.parse();

    assert.ok(result.diagnostics.some((d) => d.includes('AETH-104')));
    const err = result.errors.find((e) => e.code === 'AETH-104');
    assert.ok(err !== undefined);
    assert.ok(err.message.includes('Mismatched closing tag'));
  });

  it('records AETH-105 for unterminated attribute literals', () => {
    const source = `<input placeholder="unterminated text`;
    const parser = new TemplateParser(source);
    const result = parser.parse();

    assert.ok(result.diagnostics.some((d) => d.includes('AETH-105')));
    const err = result.errors.find((e) => e.code === 'AETH-105');
    assert.ok(err !== undefined);
    assert.ok(err.message.includes('Unterminated attribute'));
  });

  it('formats human-readable diagnostic messages with code, file, line, column, frame, explanation and suggestion', () => {
    const err = new AetherCompilerError({
      code: 'AETH-102',
      filename: 'src/components/UserProfile.tsx',
      line: 2,
      column: 15,
      source: '<div>\n  <p>User: {profile.name</p>\n</div>',
      explanation: 'Unclosed JSX interpolation expression.',
      suggestion: 'Add closing "}" to complete the expression.'
    });

    const formatted = formatAetherDiagnostic(err);
    assert.ok(formatted.includes('[AETH-102]'));
    assert.ok(formatted.includes('src/components/UserProfile.tsx:2:15'));
    assert.ok(formatted.includes('User: {profile.name'));
    assert.ok(formatted.includes('Explanation: Unclosed JSX interpolation expression.'));
    assert.ok(formatted.includes('Suggestion:  Add closing "}" to complete the expression.'));
  });
});
