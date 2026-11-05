/**
 * @license Apache-2.0
 * @samrey/mcp-server - MCP Resource Providers
 */

import {
  getDocumentation,
  SAMREY_API_REGISTRY,
  getExamples,
  discoverSamreyProject
} from '@samrey/ai';
import { McpResourceDefinition } from './protocol.js';

export const MCP_RESOURCES: McpResourceDefinition[] = [
  {
    uri: 'samrey://docs/overview',
    name: 'Samrey Architectural Overview',
    description: 'Core architectural invariants, fine-grained reactivity, and zero-VDOM compilation.',
    mimeType: 'text/markdown'
  },
  {
    uri: 'samrey://docs/api',
    name: 'Samrey Complete API Reference',
    description: 'JSON registry of all official framework APIs across all packages.',
    mimeType: 'application/json'
  },
  {
    uri: 'samrey://docs/components',
    name: 'Samrey Components & DOM Bindings Guide',
    description: 'Component creation, static template cloning, and fine-grained bindings.',
    mimeType: 'text/markdown'
  },
  {
    uri: 'samrey://docs/reactivity',
    name: 'Samrey Reactivity System Reference',
    description: 'Signals, computed derivations, side effects, batching, and stores.',
    mimeType: 'text/markdown'
  },
  {
    uri: 'samrey://docs/routing',
    name: 'Samrey Client-Side Routing Guide',
    description: 'Route configuration, RouterView, Link navigation, and parameters.',
    mimeType: 'text/markdown'
  },
  {
    uri: 'samrey://docs/ssr',
    name: 'Samrey Server-Side Rendering Guide',
    description: 'renderToString, streaming chunk pipelines, hydration, and secret guarding.',
    mimeType: 'text/markdown'
  },
  {
    uri: 'samrey://examples',
    name: 'Samrey Verified Code Examples Repository',
    description: 'Complete native code examples covering all major web application patterns.',
    mimeType: 'application/json'
  },
  {
    uri: 'samrey://project/structure',
    name: 'Current Project Structural Context',
    description: 'Dynamic overview of the current workspace packages, features, and config.',
    mimeType: 'application/json'
  }
];

export function readResource(uri: string, projectRoot: string): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  switch (uri) {
    case 'samrey://docs/overview': {
      const doc = getDocumentation('overview-philosophy');
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: doc?.content || '# Samrey Architecture' }]
      };
    }

    case 'samrey://docs/api': {
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(SAMREY_API_REGISTRY, null, 2) }]
      };
    }

    case 'samrey://docs/components': {
      const doc = getDocumentation('runtime-components-and-dom');
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: doc?.content || '# Samrey Components' }]
      };
    }

    case 'samrey://docs/reactivity': {
      const doc = getDocumentation('reactivity-signals');
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: doc?.content || '# Samrey Reactivity' }]
      };
    }

    case 'samrey://docs/routing': {
      const doc = getDocumentation('router-navigation');
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: doc?.content || '# Samrey Routing' }]
      };
    }

    case 'samrey://docs/ssr': {
      const doc = getDocumentation('ssr-and-hydration');
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: doc?.content || '# Samrey SSR' }]
      };
    }

    case 'samrey://examples': {
      const examples = getExamples();
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(examples, null, 2) }]
      };
    }

    case 'samrey://project/structure': {
      const project = discoverSamreyProject(projectRoot);
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(project, null, 2) }]
      };
    }

    default:
      throw new Error(`Resource "${uri}" not found.`);
  }
}

