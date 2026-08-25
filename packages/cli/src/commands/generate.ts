/**
 * @license Apache-2.0
 * @samrey/cli - "aether generate" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommandResult } from './create.js';

export type GenerateArtifactType = 'component' | 'route' | 'store' | 'resource';

export interface GenerateCommandOptions {
  type: GenerateArtifactType;
  name: string;
  targetDir?: string;
  dryRun?: boolean;
}

export function scaffoldArtifact(type: GenerateArtifactType, name: string): { filename: string; testFilename: string; code: string; testCode: string } {
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
  const camelName = name.charAt(0).toLowerCase() + name.slice(1);

  if (type === 'component') {
    const code = `import { signal } from '@samrey/reactivity';

export interface ${pascalName}Props {
  title?: string;
}

export function ${pascalName}(props: ${pascalName}Props) {
  const active = signal(false);
  const toggle = () => { active.value = !active.value; };

  return (
    <div class="${camelName}-wrapper">
      <h3>{props.title || '${pascalName}'}</h3>
      <button type="button" onClick={toggle}>
        Toggle {active.value ? 'Off' : 'On'}
      </button>
    </div>
  );
}
`;

    const testCode = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ${pascalName} } from './${pascalName}.js';

describe('<${pascalName} /> Component', () => {
  it('instantiates component cleanly', () => {
    assert.equal(typeof ${pascalName}, 'function');
  });
});
`;

    return {
      filename: `${pascalName}.tsx`,
      testFilename: `${pascalName}.test.ts`,
      code,
      testCode
    };
  }

  if (type === 'route') {
    const code = `export function ${pascalName}View() {
  return (
    <section class="view ${camelName}-view">
      <h2>${pascalName} Page</h2>
      <p>Content for ${pascalName} route.</p>
    </section>
  );
}
`;

    const testCode = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ${pascalName}View } from './${pascalName}View.js';

describe('${pascalName}View Route', () => {
  it('renders route view function', () => {
    assert.equal(typeof ${pascalName}View, 'function');
  });
});
`;

    return {
      filename: `${pascalName}View.tsx`,
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
      message: `[Samrey Generate Error] Artifact name is required. Example: aether generate component Button`,
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
  const targetDir = options.targetDir || process.cwd();

  if (options.dryRun) {
    return {
      success: true,
      message: `[Dry Run] Generated ${scaffold.filename} and ${scaffold.testFilename}`,
      exitCode: 0,
      data: scaffold
    };
  }

  try {
    const filePath = path.join(targetDir, scaffold.filename);
    const testPath = path.join(targetDir, scaffold.testFilename);

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
