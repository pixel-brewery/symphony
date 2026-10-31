// #region Imports

import { mosaikEventValue } from './mosaikEventValue';

// #endregion

/** Text a Mosaik control reports, or `undefined` when the event carries no text. */
export function mosaikEventText(event: unknown): string | undefined {
  const value = mosaikEventValue(event);
  if (typeof value === 'string') return value;
  // Native InputEvent.detail is a numeric UI-event counter, not the editor's text.
  const target =
    typeof event === 'object' && event !== null
      ? (event as { target?: { value?: unknown } }).target
      : undefined;
  return typeof target?.value === 'string' ? target.value : undefined;
}
