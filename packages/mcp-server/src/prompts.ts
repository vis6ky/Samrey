/**
 * @license Apache-2.0
 * @samrey/mcp-server - MCP Prompt Templates
 */

import { McpPromptDefinition } from './protocol.js';

export const MCP_PROMPTS: McpPromptDefinition[] = [
  {
    name: 'create-samrey-project',
    description: 'Scaffold and configure a new production Samrey web application.',
    arguments: [
      { name: 'name', description: 'Name of the project', required: true },
      { name: 'template', description: 'Starter template: ssr, spa, minimal, ssg (default: ssr)', required: false }
    ]
  },
  {
    name: 'build-samrey-component',
    description: 'Generate an idiomatic Samrey component with signals, template, and surgical bindings.',
    arguments: [
      { name: 'componentName', description: 'Name of the component', required: true },
      { name: 'purpose', description: 'What the component renders and how it behaves', required: true }
    ]
  },
  {
    name: 'build-samrey-dashboard',
    description: 'Design and implement a complete SaaS dashboard application with metrics, charts, and tables.',
    arguments: [
      { name: 'domain', description: 'Dashboard domain (e.g. Analytics, E-commerce, DevOps)', required: false }
    ]
  },
  {
    name: 'implement-samrey-routing',
    description: 'Configure client-side router with nested routes, links, and navigation guards.',
    arguments: [
      { name: 'routes', description: 'Comma-separated list of route paths (e.g. "/, /login, /users/:id")', required: true }
    ]
  },
  {
    name: 'implement-samrey-reactivity',
    description: 'Model complex state machines or business logic using signals, computed derivations, and stores.',
    arguments: [
      { name: 'stateRequirements', description: 'Description of state variables and reactive derivations', required: true }
    ]
  },
  {
    name: 'debug-samrey-project',
    description: 'Analyze project codebase, detect anti-patterns or React hooks, and fix compiler errors.',
    arguments: [
      { name: 'symptoms', description: 'Description of the error or unexpected behavior', required: false }
    ]
  },
  {
    name: 'optimize-samrey-application',
    description: 'Optimize bundle size, fine-tune template hoisting, and maximize DOM node reuse.',
    arguments: []
  }
];

export function getPromptMessages(
  name: string,
  args: Record<string, string> = {}
): { description?: string; messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> } {
  switch (name) {
    case 'create-samrey-project': {
      const projName = args.name || 'my-samrey-app';
      const tmpl = args.template || 'ssr';
      return {
        description: `Scaffold Samrey application "${projName}" with ${tmpl} template`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please initialize a new Samrey project named "${projName}" using the "${tmpl}" template.\nRun "npx @samrey/cli create ${projName} --template ${tmpl}" and configure the entry files.`
            }
          }
        ]
      };
    }

    case 'build-samrey-component': {
      const cName = args.componentName || 'MyComponent';
      const purpose = args.purpose || 'reusable UI card';
      return {
        description: `Author native Samrey component "${cName}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Write an idiomatic Samrey component named "${cName}".\nPurpose: ${purpose}.\nRemember:\n- Use "template()" from @samrey/runtime\n- Use "signal()" and "computed()" from @samrey/reactivity\n- Attach dynamic bindings via "bindText()" or "bindAttr()"\n- Attach event listeners via "on()"\n- NEVER use React hooks (useState/useEffect) or Virtual DOM!`
            }
          }
        ]
      };
    }

    case 'build-samrey-dashboard': {
      const domain = args.domain || 'SaaS Analytics';
      return {
        description: `Build a complete Samrey dashboard for ${domain}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Develop a complete, production-ready ${domain} dashboard in Samrey.\nInclude:\n1. Key performance metric cards using signals and computed derivations.\n2. Keyed data table using "For({ each, key, children })".\n3. Conditional filter view using "Show({ when, children, fallback })".\n4. Batch mutations using "batch()".`
            }
          }
        ]
      };
    }

    case 'implement-samrey-routing': {
      const routes = args.routes || '/, /dashboard, /profile';
      return {
        description: `Configure Samrey client router for routes: ${routes}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Configure client routing in Samrey for routes: ${routes}.\nUse "createRouter", "RouterView", "Link", and "useRoute" from @samrey/router.`
            }
          }
        ]
      };
    }

    case 'implement-samrey-reactivity': {
      const reqs = args.stateRequirements || 'count and double derived';
      return {
        description: 'Model reactive state in Samrey',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Design reactive state architecture using @samrey/reactivity for: ${reqs}.\nEnsure proper signal reading via .value, computed derivation, and batching.`
            }
          }
        ]
      };
    }

    case 'debug-samrey-project': {
      const symptoms = args.symptoms || 'compiler error or state not updating';
      return {
        description: 'Diagnose and repair Samrey project issue',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze and resolve the following issue in the Samrey project:\n${symptoms}.\nCheck for in-place array mutation, unclosed HTML tags (SAMREY-101), template-level <Show>/<For> tags (SAMREY-108), or foreign React hooks.`
            }
          }
        ]
      };
    }

    case 'optimize-samrey-application': {
      return {
        description: 'Optimize Samrey application performance',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Inspect the Samrey application and apply performance optimizations:\n1. Ensure static template fragments are hoisted.\n2. Ensure For lists use stable unique keys for 90%+ node reuse.\n3. Wrap multi-signal updates in batch().\n4. Verify bundle size with "npx @samrey/cli analyze".`
            }
          }
        ]
      };
    }

    default:
      throw new Error(`Prompt "${name}" not found.`);
  }
}

