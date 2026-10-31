/** Lines the excerpt keeps: the end of the output, where a failure explains itself. */
const EXCERPT_LINES = 12;

/**
 * Keeps the last lines of a bounded run log for the excerpt under the steps.
 *
 * @param log - Bounded, redacted log text.
 * @returns The trimmed excerpt, or `undefined` when there is nothing to show.
 * @public
 */
export function excerptRunLog(log: string | undefined): string | undefined {
  const lines = (log ?? '')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.trimEnd());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines.at(-1)) lines.pop();
  return lines.length ? lines.slice(-EXCERPT_LINES).join('\n') : undefined;
}
