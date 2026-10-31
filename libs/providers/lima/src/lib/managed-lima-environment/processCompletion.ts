// #region Imports

import { type ChildProcess } from 'node:child_process';
import { MAX_PROCESS_OUTPUT_BYTES } from './MaxProcessOutputBytes';
import { redact } from './redact';
import { secretSafeError } from './secretSafeError';
import { terminate } from './terminate';

// #endregion

export function processCompletion(child: ChildProcess, signal?: AbortSignal): Promise<void> {
  let output = '';
  const collect = (chunk: Buffer): void => {
    if (output.length >= MAX_PROCESS_OUTPUT_BYTES) return;
    output += chunk.toString('utf8').slice(0, MAX_PROCESS_OUTPUT_BYTES - output.length);
  };
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);
  const abort = (): void => terminate(child);
  signal?.addEventListener('abort', abort, { once: true });
  return new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Managed runner process exited with code ${code ?? 'unknown'}.`));
    });
  })
    .catch((cause) => {
      throw secretSafeError(
        output
          ? `Managed runner process failed: ${redact(output)}`
          : 'Managed runner process failed',
        cause,
      );
    })
    .finally(() => signal?.removeEventListener('abort', abort));
}
