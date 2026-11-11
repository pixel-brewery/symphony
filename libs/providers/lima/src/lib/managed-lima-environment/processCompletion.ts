// #region Imports

import { type ChildProcess } from 'node:child_process';
import { MAX_PROCESS_OUTPUT_BYTES } from './MaxProcessOutputBytes';
import { redact } from './redact';
import { secretSafeError } from './secretSafeError';
import { terminate } from './terminate';

// #endregion

export function processCompletion(
  child: ChildProcess,
  signal?: AbortSignal,
  diagnostics?: {
    secret: string;
    reportExit: (exit: string, output: string) => void;
  },
): Promise<void> {
  let output = '';
  let truncated = false;
  const collect = (chunk: Buffer): void => {
    output += chunk.toString('utf8');
    if (output.length <= MAX_PROCESS_OUTPUT_BYTES) return;
    output = output.slice(-MAX_PROCESS_OUTPUT_BYTES);
    truncated = true;
  };
  const safeOutput = (): string => {
    const firstNewline = truncated ? output.indexOf('\n') : -1;
    if (truncated && firstNewline < 0) return '';
    const retained = output.slice(firstNewline + 1);
    return redact(
      diagnostics?.secret ? retained.replaceAll(diagnostics.secret, '[redacted]') : retained,
    );
  };
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);
  const abort = (): void => terminate(child);
  signal?.addEventListener('abort', abort, { once: true });
  return new Promise<void>((resolve, reject) => {
    child.once('error', (cause) => {
      diagnostics?.reportExit('Unable to launch the managed runner process.', safeOutput());
      reject(cause);
    });
    child.once('close', (code, exitSignal) => {
      const exit = exitSignal
        ? `Managed runner process exited after ${exitSignal}.`
        : `Managed runner process exited with code ${code ?? 'unknown'}.`;
      diagnostics?.reportExit(exit, safeOutput());
      if (code === 0) resolve();
      else reject(new Error(exit));
    });
  })
    .catch((cause) => {
      const diagnostics = safeOutput();
      throw secretSafeError(
        diagnostics
          ? `Managed runner process failed: ${diagnostics}`
          : 'Managed runner process failed',
        cause,
      );
    })
    .finally(() => signal?.removeEventListener('abort', abort));
}
