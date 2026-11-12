/**
 * @license Apache-2.0
 * @samrey/cli - "samrey generate" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommandResult } from './create.js';

export type GenerateArtifactType = 'component' | 'route' | 'store' | 'resource';

export interface GenerateCommandOptions {
  cwd?: string;
  type: GenerateArtifactType;
  name: string;
  targetDir?: string;
  dryRun?: boolean;
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_]+([a-zA-Z0-9])/g, (_, chr) => chr.toUpperCase())
    .replace(/^([a-z])/, (_, chr) => chr.toUpperCase());
}

function toCamelCase(str: string): string {
  const p = toPascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function scaffoldArtifact(type: GenerateArtifactType, name: string): { filename: string; testFilename: string; code: string; testCode: string } {
  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);

  if (type === 'component') {
    const code = `import { el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export interface ${pascalName}Props {
  title?: string;
}

export function ${pascalName}(props: ${pascalName}Props = {}) {
  const active = signal(false);
  const toggle = () => { active.value = !active.value; };

  return el(
    'div',
    { class: '${camelName}-wrapper' },
    el('h3', null, props.title || '${pascalName}'),
    el(
      'button',
      { type: 'button', onClick: toggle },
      () => (active.value ? 'Active' : 'Inactive')
    )
  );
}
`;

    const testCode = `import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ${pascalName} } from './${pascalName}.js';

describe('${pascalName} Component', () => {
  it('instantiates and renders component node', () => {
    const node = ${pascalName}({ title: 'Test Widget' });
    assert.ok(node, 'Component must return a valid node');
    const html = (node as any).outerHTML || '';
    assert.ok(html.includes('${camelName}-wrapper'), 'Must include wrapper class');
    assert.ok(html.includes('Test Widget'), 'Must render title prop');
    assert.ok(html.includes('Inactive'), 'Must render initial button label');
  });
});
`;

    return {
      filename: `${pascalName}.ts`,
      testFilename: `${pascalName}.test.ts`,
      code,
      testCode
    };
  }

  if (type === 'route') {
    const code = `import { el } from '@samrey/runtime';

export function ${pascalName}View() {
  return el(
    'section',
    { class: 'view ${camelName}-view' },
    el('h2', null, '${pascalName} Page'),
    el('p', null, 'Content for ${pascalName} route.')
  );
}
`;

    const testCode = `import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ${pascalName}View } from './${pascalName}View.js';

describe('${pascalName}View Route', () => {
  it('renders route view element', () => {
    const node = ${pascalName}View();
    assert.ok(node, 'Route view must return a valid node');
    const html = (node as any).outerHTML || '';
    assert.ok(html.includes('${camelName}-view'), 'Must include view class');
    assert.ok(html.includes('${pascalName} Page'), 'Must render page heading');
  });
});
`;

    return {
      filename: `${pascalName}View.ts`,
      testFilename: `${pascalName}View.test.ts`,
      code,
      testCode
    };
  }

  if (type === 'store') {
    const code = `import { signal, computed } from '@samrey/reactivity';

export function create${pascalName}Store(initialState: Record<string, unknown> = {}) {
  const state = signal(initialState);
  const keysCount = computed(() => Object.keys(state.value).length);

  return {
    state,
    keysCount,
    set(key: string, value: unknown) {
      state.value = { ...state.value, [key]: value };
    },
    reset() {
      state.value = {};
    }
  };
}
`;

    const testCode = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { create${pascalName}Store } from './${pascalName}Store.js';

describe('create${pascalName}Store', () => {
  it('updates reactive store state', () => {
    const store = create${pascalName}Store({ initial: 1 });
    assert.equal(store.keysCount.value, 1);
    store.set('second', 2);
    assert.equal(store.keysCount.value, 2);
  });
});
`;

    return {
      filename: `${pascalName}Store.ts`,
      testFilename: `${pascalName}Store.test.ts`,
      code,
      testCode
    };
  }

  // resource
  const code = `import { signal } from '@samrey/reactivity';

export function create${pascalName}Resource(fetcher: () => Promise<unknown>) {
  const data = signal<unknown>(null);
  const loading = signal(true);
  const error = signal<Error | null>(null);

  const refetch = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetcher();
    } catch (err: any) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };

  refetch();

  return { data, loading, error, refetch };
}
`;

  const testCode = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { create${pascalName}Resource } from './${pascalName}Resource.js';

describe('create${pascalName}Resource', () => {
  it('creates resource loader', async () => {
    const res = create${pascalName}Resource(async () => ({ id: 1 }));
    assert.equal(res.loading.value, true);
  });
});
`;

  return {
    filename: `${pascalName}Resource.ts`,
    testFilename: `${pascalName}Resource.test.ts`,
    code,
    testCode
  };
}

export async function runGenerateCommand(options: GenerateCommandOptions): Promise<CommandResult> {
  const validTypes: GenerateArtifactType[] = ['component', 'route', 'store', 'resource'];
  if (!validTypes.includes(options.type)) {
    return {
      success: false,
      message: `[Samrey Generate Error] Unknown generator type "${options.type}". Supported types: ${validTypes.join(', ')}`,
      exitCode: 1
    };
  }

  if (!options.name || options.name.trim().length === 0) {
    return {
      success: false,
      message: `[Samrey Generate Error] Artifact name is required. Example: samrey generate component Button`,
      exitCode: 1
    };
  }

  const cleanName = options.name.trim();
  if (cleanName.includes('..') || cleanName.includes('/') || cleanName.includes('\\') || !/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
    return {
      success: false,
      message: `[Samrey Generate Error] Invalid artifact name "${options.name}". Path traversal characters and path separators are forbidden.`,
      exitCode: 1
    };
  }

  const scaffold = scaffoldArtifact(options.type, cleanName);

  const projectRoot = options.cwd || process.cwd();
  let targetDir = options.targetDir;
  if (!targetDir) {
    const srcDir = path.join(projectRoot, 'src');
    if (fs.existsSync(srcDir)) {
      if (options.type === 'component') {
        targetDir = path.join(srcDir, 'components');
      } else if (options.type === 'route') {
        targetDir = path.join(srcDir, 'views');
      } else if (options.type === 'store') {
        targetDir = path.join(srcDir, 'stores');
      } else if (options.type === 'resource') {
        targetDir = path.join(srcDir, 'resources');
      } else {
        targetDir = srcDir;
      }
    } else {
      targetDir = projectRoot;
    }
  }

  if (options.dryRun) {
    return {
      success: true,
      message: `[Dry Run] Generated ${scaffold.filename} and ${scaffold.testFilename}`,
      exitCode: 0,
      data: scaffold
    };
  }

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, scaffold.filename);
    const testPath = path.join(targetDir, scaffold.testFilename);

    if (fs.existsSync(filePath) || fs.existsSync(testPath)) {
      return {
        success: false,
        message: `[Samrey Generate Error] File already exists at target (${scaffold.filename} or ${scaffold.testFilename}). Aborting to avoid overwrite.`,
        exitCode: 1
      };
    }

    fs.writeFileSync(filePath, scaffold.code, 'utf8');
    fs.writeFileSync(testPath, scaffold.testCode, 'utf8');

    return {
      success: true,
      message: `  ✓ Generated ${scaffold.filename}\n  ✓ Generated ${scaffold.testFilename}`,
      exitCode: 0,
      data: { filePath, testPath }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `[Samrey Generate Error] Could not write files: ${err.message}`,
      exitCode: 1
    };
  }
}
