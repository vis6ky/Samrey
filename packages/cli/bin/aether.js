#!/usr/bin/env node

import { runCLI } from '../src/runner.js';

const args = process.argv.slice(2);

runCLI(args).then((result) => {
  if (result.message) {
    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.message);
    }
  }
  process.exit(result.exitCode);
}).catch((err) => {
  console.error('[Aether Fatal Error]', err);
  process.exit(1);
});
