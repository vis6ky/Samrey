# Samrey Framework — Compatibility Matrix

**Version: 1.0.0-rc.1**  
*Last Updated: August 20, 2026*

This document outlines environment, runtime, browser, and library compatibility for Samrey applications.

---

## 🖥️ Server & Runtime Environments

| Runtime / Platform | Minimum Version | Recommended Version | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `>= 20.0.0` or `22.x` | ✅ Full Support | Native ESM, WHATWG `ReadableStream`, `fetch` |
| **Bun** | `>= 1.0.0` | `>= 1.1.0` | ✅ Full Support | High-speed native execution & SSR streaming |
| **Deno** | `>= 1.35.0` | `>= 1.40.0` | ✅ Full Support | Standard web API compliant |
| **Cloudflare Workers** | Modern | Modern | ✅ Full Support | Edge SSR streaming compatible |
| **Vercel Edge Functions** | Modern | Modern | ✅ Full Support | Edge SSR streaming compatible |
| **AWS Lambda / Cloud Run** | Node 18+ | Node 20+ | ✅ Full Support | Containerized & serverless execution |

---

## 🌐 Browser Support

Samrey targets modern evergreen browsers with standard Web APIs:

| Browser | Minimum Version | Tested & Verified |
| :--- | :--- | :--- |
| **Google Chrome / Chromium** | 90+ | ✅ Verified (Chrome 120+) |
| **Mozilla Firefox** | 88+ | ✅ Verified (Firefox 125+) |
| **Apple Safari / WebKit** | 15.4+ | ✅ Verified (Safari 17+) |
| **Microsoft Edge** | 90+ | ✅ Verified (Edge 120+) |
| **Mobile Safari (iOS)** | iOS 15.4+ | ✅ Verified (iOS 17+) |
| **Chrome for Android** | Android 10+ | ✅ Verified |

---

## 📚 Schema & Validation Compatibility

Samrey's `@samrey/forms` package implements the [Standard Schema](https://github.com/standard-schema/standard-schema) specification:

| Schema Library | Minimum Version | Status |
| :--- | :--- | :--- |
| **Zod** | `>= 3.24.0` | ✅ Full Support (v3 & v4) |
| **Valibot** | `>= 0.36.0` | ✅ Full Support |
| **ArkType** | `>= 2.0.0` | ✅ Full Support |

---

## 🛠️ Build Tools & Bundlers

| Tool | Recommended Setup | Status |
| :--- | :--- | :--- |
| **Vite** | `@samrey/cli/vite-plugin` | ✅ Official First-Party Plugin |
| **esbuild** | Direct AOT compiler transform | ✅ Full Support |
| **Rollup** | Standard ESM packaging | ✅ Full Support |
| **TypeScript** | `>= 5.0.0` | ✅ Strict mode certified |
