/**
 * Reads the value a Mosaik element reports on its change events. Mosaik elements emit a
 * `CustomEvent`, so the raw event must never be coerced to a string; the value lives on the
 * event detail, on a selection payload, or on the element itself.
 *
 * @param event - Reported control value or native/custom input event.
 * @returns The explicit control value before any primitive event-detail fallback.
 * @public
 */
export function mosaikEventValue(event: unknown): unknown {
  if (typeof event === 'string' || typeof event === 'number' || typeof event === 'boolean')
    return event;
  const record =
    typeof event === 'object' && event !== null ? (event as Record<string, unknown>) : {};
  const rawDetail = record['detail'];
  const detail =
    typeof rawDetail === 'object' && rawDetail !== null
      ? (rawDetail as Record<string, unknown>)
      : {};
  const target =
    typeof record['target'] === 'object' && record['target'] !== null
      ? (record['target'] as Record<string, unknown>)
      : {};
  const newValue = record['newValue'] ?? detail['newValue'];
  const selection =
    typeof newValue === 'object' && newValue !== null
      ? (newValue as Record<string, unknown>)['value']
      : newValue;
  // Native UIEvent.detail is a click/input counter. The control's value takes precedence.
  return (
    record['value'] ??
    detail['value'] ??
    selection ??
    target['value'] ??
    (typeof rawDetail === 'string' || typeof rawDetail === 'number' ? rawDetail : undefined)
  );
}
