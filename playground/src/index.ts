import { signal, computed, effect } from '../../packages/reactivity/src/index.js';
import { compileTemplate } from '../../packages/compiler/src/index.js';

console.log('--- Welcome to Samrey Developer Playground ---');

// 1. Reactivity playground
const name = signal('World');
const greeting = computed(() => `Hello, ${name.value}!`);

effect(() => {
  console.log(`[Playground Effect]: ${greeting.value}`);
});

name.value = 'Samrey Engineer';

// 2. Compiler playground
const sampleJsx = '<div class="alert"><span class="badge">{status}</span><p>{message}</p></div>';
const compiled = compileTemplate(sampleJsx);

console.log('[Playground Compiler Output]:');
console.log(compiled.generatedCode);
