import { renderToString } from '../../packages/ssr/src/index.js';

export async function runSsrExample(): Promise<string> {
  const initialData = {
    user: { id: 1, name: 'Lead Architect' },
    securityCleared: true
  };

  const html = await renderToString(
    `<main class="app"><h1>Samrey SSR App</h1><p>Active Session</p></main>`,
    {
      title: 'Samrey SSR Application',
      state: initialData
    }
  );

  return html;
}
