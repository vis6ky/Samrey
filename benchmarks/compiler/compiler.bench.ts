import { TemplateParser, buildAIRFromAST, compileTemplate } from '../../packages/compiler/src/parser.js';
import { generateModuleCode } from '../../packages/compiler/src/codegen.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';

function generateTemplate(nodeCount: number, options: { nested?: boolean; dynamic?: boolean } = {}): string {
  if (options.nested) {
    let res = '';
    const depth = Math.min(nodeCount, 200);
    for (let i = 0; i < depth; i++) {
      res += `<div id="node-${i}" class="level-${i}" data-index="${i}">`;
    }
    res += `<span>Deep Content Value: {count.value}</span>`;
    for (let i = 0; i < depth; i++) {
      res += `</div>`;
    }
    return res;
  }

  const parts: string[] = ['<div class="root-container" id="app">'];
  const childCount = Math.floor(nodeCount / 3);

  for (let i = 0; i < childCount; i++) {
    if (options.dynamic) {
      parts.push(`<section class="section-${i}" data-status={status.value} @click={handleClick} title={tooltip.value}>`);
      parts.push(`  <h2 class="title">{title.value} #{idx}</h2>`);
      parts.push(`  <p class="desc">Computed: {computedValue.value}</p>`);
      parts.push(`</section>`);
    } else {
      parts.push(`<div class="static-box" id="box-${i}">`);
      parts.push(`  <span class="label">Static Label ${i}</span>`);
      parts.push(`  <button type="button" class="btn">Click ${i}</button>`);
      parts.push(`</div>`);
    }
  }

  parts.push('</div>');
  return parts.join('\n');
}

export function runCompilerBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Compiler';

  const t10 = generateTemplate(10, { dynamic: true });
  const t100 = generateTemplate(100, { dynamic: true });
  const t1000 = generateTemplate(1000, { dynamic: true });
  const t10000 = generateTemplate(10000, { dynamic: true });
  const tDeep = generateTemplate(150, { nested: true });

  // 1. Stage-by-Stage on 100-node template
  results.push(benchmark('Stage 1: Source -> AST (100 nodes)', () => {
    const parser = new TemplateParser(t100);
    parser.parse();
  }, { category, iterations: 20 }));

  const { ast: ast100 } = new TemplateParser(t100).parse();
  results.push(benchmark('Stage 2: AST -> AIR (100 nodes)', () => {
    buildAIRFromAST(ast100);
  }, { category, iterations: 20 }));

  const { templates, bindingsCode } = buildAIRFromAST(ast100);
  results.push(benchmark('Stage 3: AIR -> Codegen (100 nodes)', () => {
    generateModuleCode(templates, bindingsCode.join('\n  '));
  }, { category, iterations: 20 }));

  // 2. Full pipeline across scales
  results.push(benchmark('Full Compile: Small (~10 nodes dynamic)', () => {
    compileTemplate(t10);
  }, { category, iterations: 25 }));

  results.push(benchmark('Full Compile: Medium (~100 nodes dynamic)', () => {
    compileTemplate(t100);
  }, { category, iterations: 20 }));

  results.push(benchmark('Full Compile: Large (~1,000 nodes)', () => {
    compileTemplate(t1000);
  }, { category, iterations: 10 }));

  results.push(benchmark('Full Compile: Very Large (~10,000 nodes)', () => {
    compileTemplate(t10000);
  }, { category, iterations: 5 }));

  results.push(benchmark('Full Compile: Deeply Nested (150 levels)', () => {
    compileTemplate(tDeep);
  }, { category, iterations: 15 }));

  return results;
}
