# Aether SSG Example

This example demonstrates Static Site Generation (SSG) in Aether with parameterized dynamic paths (`getStaticPaths`), automated sitemap (`sitemap.xml`) generation, and state serialization.

## Features

- **Static Pre-Rendering**: Compiles declarative route trees to static `.html` files at build time.
- **Dynamic Parameter Expansion**: Resolves parameterized routes (e.g. `/blog/:slug`) with companion state payloads.
- **Automated Sitemap Generation**: Generates standard XML sitemaps for SEO indexing.
- **Zero Client Overhead**: Pure static HTML output without mandatory heavy client runtimes unless hydration is explicitly attached.

## Running

```bash
npm run build
```
