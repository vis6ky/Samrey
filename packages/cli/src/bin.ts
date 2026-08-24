/**
 * @license Apache-2.0
 * @gati/cli - Binary Entrypoint
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
  console.error('[Gati Fatal Error]', err);
  process.exit(1);
});
