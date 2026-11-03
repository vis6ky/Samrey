import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  signal,
  effect,
  createRoot,
  createOwner,
  runWithOwner,
  onError,
  setGlobalErrorHandler
} from '../packages/reactivity/src/index.js';

describe('Phase 5.1 - Reactivity onError and Error Boundaries', () => {
  let originalConsoleError: typeof console.error;
  let loggedErrors: any[][] = [];

  beforeEach(() => {
    loggedErrors = [];
    originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      loggedErrors.push(args);
    };
    setGlobalErrorHandler(null);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    setGlobalErrorHandler(null);
  });

  test('handler receives the error when an effect throws', () => {
    let capturedError: any = null;
    const s = signal(0);

    createRoot((dispose) => {
      onError((err) => {
        capturedError = err;
      });

      effect(() => {
        if (s.value === 1) {
          throw new Error('Boom in effect');
        }
      });

      s.value = 1;
      dispose();
    });

    assert.ok(capturedError instanceof Error);
    assert.strictEqual(capturedError.message, 'Boom in effect');
    assert.strictEqual(loggedErrors.length, 0, 'No console.error should be logged when onError handles it');
  });

  test('nearest boundary wins in nested owner hierarchy', () => {
    let outerHandled = false;
    let innerHandled = false;
    let innerCaptured: any = null;

    const s = signal(0);

    createRoot((disposeOuter) => {
      onError(() => {
        outerHandled = true;
      });

      const childOwner = createOwner();
      runWithOwner(childOwner, () => {
        onError((err) => {
          innerHandled = true;
          innerCaptured = err;
        });

        effect(() => {
          if (s.value === 1) {
            throw new Error('Inner error');
          }
        });
      });

      s.value = 1;
      childOwner.dispose();
      disposeOuter();
    });

    assert.strictEqual(innerHandled, true, 'Inner nearest boundary must handle the error');
    assert.strictEqual(outerHandled, false, 'Outer boundary should not be called when inner handled it');
    assert.strictEqual(innerCaptured?.message, 'Inner error');
  });

  test('siblings still run when one effect in the batch throws', () => {
    const s = signal(0);
    let sibling1Ran = 0;
    let sibling2Ran = 0;
    let errorCaught = false;

    createRoot((dispose) => {
      onError(() => {
        errorCaught = true;
      });

      effect(() => {
        s.value;
        sibling1Ran++;
      });

      effect(() => {
        if (s.value === 1) {
          throw new Error('Failing middle sibling');
        }
      });

      effect(() => {
        s.value;
        sibling2Ran++;
      });

      s.value = 1;
      dispose();
    });

    assert.strictEqual(errorCaught, true);
    assert.strictEqual(sibling1Ran, 2, 'Sibling 1 should have run twice (initial + update)');
    assert.strictEqual(sibling2Ran, 2, 'Sibling 2 should have run twice despite sibling error');
  });

  test('no-handler path logs to console.error with original error object and does not throw from signal.set', () => {
    const s = signal(0);
    const thrownErr = new Error('Unhandled effect failure');

    createRoot((dispose) => {
      effect(() => {
        if (s.value === 1) {
          throw thrownErr;
        }
      });

      // signal.set must not rethrow
      assert.doesNotThrow(() => {
        s.value = 1;
      });

      dispose();
    });

    assert.ok(loggedErrors.length > 0, 'console.error must be called when no handler exists');
    // Check that the original error object (keeping stack) is passed
    const errorLogged = loggedErrors.some(args => args.includes(thrownErr));
    assert.ok(errorLogged, 'Original error object must be passed to console.error');
  });

  test('throwing handler logs both errors and keeps draining the batch', () => {
    const s = signal(0);
    const originalErr = new Error('Original effect failure');
    const handlerErr = new Error('Handler crash');
    let subsequentRan = 0;

    createRoot((dispose) => {
      onError(() => {
        throw handlerErr;
      });

      effect(() => {
        if (s.value === 1) {
          throw originalErr;
        }
      });

      effect(() => {
        s.value;
        subsequentRan++;
      });

      s.value = 1;
      dispose();
    });

    // Both errors should be logged
    const loggedHandlerErr = loggedErrors.some(args => args.includes(handlerErr));
    const loggedOriginalErr = loggedErrors.some(args => args.includes(originalErr));

    assert.ok(loggedHandlerErr, 'Handler error must be logged to console.error');
    assert.ok(loggedOriginalErr, 'Original error must be logged to console.error');
    assert.strictEqual(subsequentRan, 2, 'Subsequent effects in batch must keep draining');
  });

  test('global handler opt-in only', () => {
    const s = signal(0);
    let globalHandledErr: any = null;

    // By default, no global handler
    createRoot((dispose) => {
      effect(() => {
        if (s.value === 1) {
          throw new Error('No global handler yet');
        }
      });
      s.value = 1;
      dispose();
    });
    assert.strictEqual(globalHandledErr, null);
    assert.ok(loggedErrors.length > 0);

    // Now opt in to global handler
    loggedErrors = [];
    setGlobalErrorHandler((err) => {
      globalHandledErr = err;
    });

    const s2 = signal(0);
    createRoot((dispose) => {
      effect(() => {
        if (s2.value === 1) {
          throw new Error('Caught by global handler');
        }
      });
      s2.value = 1;
      dispose();
    });

    assert.strictEqual(globalHandledErr?.message, 'Caught by global handler');
    assert.strictEqual(loggedErrors.length, 0, 'No console.error when handled by global handler');
  });
});
