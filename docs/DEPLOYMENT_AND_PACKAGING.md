# Deployment & Packaging in Gati

## 1. Production Build Workflow

Gati applications build via standard Vite or custom Node.js servers.

### Client-Side SPA Build

```bash
npm run build
```

Generates optimized static assets in `dist/`. The output contains:
- Pre-compiled static HTML template strings
- Tree-shaken runtime functions
- Zero development diagnostics or debug flags
- Zero `eval()` or `new Function()` invocations
- Source maps linked for production debugging

### Full-Stack Server Build

```bash
vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
```

The resulting `dist/server.cjs` is fully self-contained and ready to execute via `node dist/server.cjs`.

---

## 2. Docker & Container Deployment

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

---

## 3. Serverless & Edge Compatibility

Gati's SSR streaming (`renderToStream`) relies exclusively on the standard Web Streams API (`ReadableStream`, `TextEncoder`), making it natively compatible with:
- Cloudflare Workers & Pages
- Vercel Edge Runtime & Serverless Functions
- AWS Lambda & CloudFront Functions
- Deno & Bun runtimes
- Google Cloud Run & App Engine
