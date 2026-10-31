const MAX_TIMER_DELAY_MILLISECONDS = 24 * 60 * 60_000;

export async function waitForRecoveryDelay(
  attempt: number,
  signal: AbortSignal,
  retryAt?: string,
): Promise<void> {
  const backoffMilliseconds = Math.min(30_000, 1_000 * 2 ** Math.min(Math.max(attempt - 2, 0), 5));
  const retryAtMilliseconds = retryAt ? Date.parse(retryAt) : Number.NaN;
  const requestedMilliseconds = Number.isFinite(retryAtMilliseconds)
    ? Math.max(backoffMilliseconds, retryAtMilliseconds - Date.now())
    : backoffMilliseconds;
  const milliseconds = Math.max(0, Math.min(MAX_TIMER_DELAY_MILLISECONDS, requestedMilliseconds));
  await new Promise<void>((resolve, reject) => {
    const complete = (): void => {
      signal.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(complete, milliseconds);
    const abort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new Error('Recovery cancelled.'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
