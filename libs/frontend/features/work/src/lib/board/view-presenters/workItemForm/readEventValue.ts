/**
 * Reads the value any Mosaik field reports with its event: text, numbers, dates, and the item a
 * select reports as `newValue`.
 *
 * @param event - The raw event or value.
 * @returns The value, or undefined when the event carries none.
 * @public
 */
export function readEventValue(event: unknown): unknown {
  if (event instanceof Date || typeof event === 'string' || typeof event === 'number') {
    return event;
  }
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
  // A selection reports the selected item as `newValue`.
  const selection =
    detail['newValue'] && typeof detail['newValue'] === 'object'
      ? (detail['newValue'] as Record<string, unknown>)['value']
      : undefined;
  return detail['value'] ?? selection ?? target?.['value'] ?? record['detail'];
}
