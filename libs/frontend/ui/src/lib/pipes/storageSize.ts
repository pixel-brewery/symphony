/**
 * One measured size in the unit that reads naturally for it. Exported as a function too, so
 * text assembled outside a template says a size exactly the way the UI does everywhere else.
 */
export function storageSize(bytes: number | undefined): string {
  if (bytes === undefined) return 'Measuring…';
  const gibibytes = bytes / 1024 ** 3;
  if (gibibytes >= 1) return `${gibibytes.toFixed(1)} GB`;
  const mebibytes = bytes / 1024 ** 2;
  if (mebibytes >= 1) return `${Math.round(mebibytes)} MB`;
  // A measured share below a megabyte still names itself: rounding it to "0 MB" would read
  // as absent when it is merely small.
  const kibibytes = bytes / 1024;
  return kibibytes >= 1 ? `${Math.round(kibibytes)} KB` : `${Math.round(bytes)} B`;
}
