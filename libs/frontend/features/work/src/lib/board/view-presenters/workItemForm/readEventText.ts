/**
 * Reads the text a Mosaik input, prompt box or native element reports with its event.
 *
 * Mosaik elements put the value into `detail.value`; native events carry it on the target; a
 * prompt submission hands the text over directly.
 *
 * @param event - The raw event or value.
 * @returns The text, or undefined when the event carries none.
 * @public
 */
export function readEventText(event: unknown): string | undefined {
  if (typeof event === 'string') return event;
  if (!event || typeof event !== 'object') return undefined;
  const record = event as Record<string, unknown>;
  const detail =
    record['detail'] && typeof record['detail'] === 'object'
      ? (record['detail'] as Record<string, unknown>)
      : record;
  const target =
    record['target'] && typeof record['target'] === 'object'
      ? (record['target'] as Record<string, unknown>)
      : undefined;
  const value = detail['value'] ?? target?.['value'];
  return typeof value === 'string' ? value : undefined;
}
