// #region Imports
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * One measured size in the unit that reads naturally for it. Exported as a function too, so
 * text assembled outside a template says a size exactly the way the UI does everywhere else.
 */
export function storageSize(bytes: number | undefined): string {
  if (bytes === undefined) return translateLabel('loc.symphony.labels.measuring.a1f421d');
  const gibibytes = bytes / 1024 ** 3;
  if (gibibytes >= 1) return translateLabel('loc.symphony.labels.gb.ed585b7', gibibytes.toFixed(1));
  const mebibytes = bytes / 1024 ** 2;
  if (mebibytes >= 1)
    return translateLabel('loc.symphony.labels.mb.a698208', Math.round(mebibytes));
  // A measured share below a megabyte still names itself: rounding it to "0 MB" would read
  // as absent when it is merely small.
  const kibibytes = bytes / 1024;
  return kibibytes >= 1
    ? translateLabel('loc.symphony.labels.kb.92083c6', Math.round(kibibytes))
    : translateLabel('loc.symphony.labels.b.72db0f8', Math.round(bytes));
}
