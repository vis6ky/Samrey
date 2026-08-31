import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

function assistantApiPlugin(): Plugin {
  return {
    name: 'samrey-assistant-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/assistant' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const prompt = body.prompt || '';
              const history = body.history || [];
              const retrievedDocs = body.retrievedDocs || '';

              const ai = getGeminiClient();
              if (!ai) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  provider: 'samrey-knowledge-engine-v1.0.0',
                  fallback: true
                }));
                return;
              }

              let systemInstruction = `You are the official Samrey Framework Developer Assistant.
You answer questions specifically for Samrey Framework v1.0.0.
Always prefer official @samrey/* APIs (@samrey/reactivity, @samrey/runtime, @samrey/compiler, @samrey/security, @samrey/router, @samrey/forms, @samrey/http, @samrey/ssr, @samrey/testing, @samrey/devtools, @samrey/cli).
Never recommend another frontend framework (React, Vue, Angular, Svelte, Solid) as the implementation solution.
Never invent package names, functions, signatures, or behavior. Ground your answer strictly on the provided Samrey repository documentation.
Samrey uses fine-grained push-pull signals with zero Virtual DOM. Components run ONCE.

You MUST format your response with the following 12 numbered sections:
1. Short answer
2. Concept
3. Recommended Samrey API
4. When to use it
5. Step-by-step implementation
6. TypeScript code example
7. Complete working example when appropriate
8. Explanation of the code
9. Alternative Samrey approach, if one exists
10. Common mistakes
11. Related @samrey APIs
12. Links to relevant Samrey documentation`;

              if (retrievedDocs) {
                systemInstruction += `\n\nAUTHORITATIVE REPOSITORY DOCUMENTATION CONTEXT:\n${retrievedDocs}`;
              }

              const contents: any[] = [];
              for (const msg of history) {
                contents.push({
                  role: msg.role === 'user' ? 'user' : 'model',
                  parts: [{ text: msg.content }]
                });
              }
              contents.push({
                role: 'user',
                parts: [{ text: prompt }]
              });

              const response = await ai.models.generateContent({
                model: 'gemini-3.7-flash',
                contents,
                config: {
                  systemInstruction
                }
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                answer: response.text,
                provider: 'gemini-3.7-flash'
              }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err?.message || 'Gemini API Error' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), assistantApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@samrey/security': path.resolve(__dirname, 'packages/security/src/index.ts'),
        '@samrey/reactivity': path.resolve(__dirname, 'packages/reactivity/src/index.ts'),
        '@samrey/runtime': path.resolve(__dirname, 'packages/runtime/src/index.ts'),
        '@samrey/compiler': path.resolve(__dirname, 'packages/compiler/src/index.ts'),
        '@samrey/router': path.resolve(__dirname, 'packages/router/src/index.ts'),
        '@samrey/http': path.resolve(__dirname, 'packages/http/src/index.ts'),
        '@samrey/forms': path.resolve(__dirname, 'packages/forms/src/index.ts'),
        '@samrey/ssr': path.resolve(__dirname, 'packages/ssr/src/index.ts'),
        '@samrey/testing': path.resolve(__dirname, 'packages/testing/src/index.ts'),
        '@samrey/cli': path.resolve(__dirname, 'packages/cli/src/index.ts'),
        '@samrey/devtools': path.resolve(__dirname, 'packages/devtools/src/index.ts')
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

