/**
 * @license Apache-2.0
 * @samrey/cli - Binary Entrypoint
 */

import { runCLI } from './runner.js';

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
  console.error('[Samrey Fatal Error]', err);
  process.exit(1);
});
