/** Characters that separate the words a query term may start. */
const WORD_SEPARATOR = /[\s·:/\\,;#()[\]{}"'“”]+/u;

/**
 * Ranks one palette candidate against the query. Every whitespace-separated term must occur in
 * the candidate's fields; a term that starts a word of a primary field (an id, a number, a title)
 * counts most, one inside a primary field less, and one found only in a secondary field (author,
 * branch, labels, body) least. A primary field equal to the whole query adds a bonus, so typing an
 * exact id or number puts that row first.
 *
 * @param normalizedQuery - Locale-lowercased, trimmed palette input.
 * @param primary - Fields the row is named by.
 * @param secondary - Further fields the row can be found by.
 * @returns `0` when a term is missing or nothing is typed; otherwise a positive rank.
 * @public
 */
export function scorePaletteMatch(
  normalizedQuery: string,
  primary: readonly (string | number | undefined)[],
  secondary: readonly (string | number | undefined)[] = [],
): number {
  const terms = normalizedQuery.split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return 0;
  const primaryFields = primary
    .filter((field) => field !== undefined && field !== '')
    .map((field) => String(field).toLocaleLowerCase());
  const primaryText = primaryFields.join(' ');
  const primaryWords = primaryText.split(WORD_SEPARATOR).filter(Boolean);
  const secondaryText = secondary
    .filter((field) => field !== undefined && field !== '')
    .map((field) => String(field).toLocaleLowerCase())
    .join(' ');
  let rank = 0;
  for (const term of terms) {
    if (primaryWords.some((word) => word.startsWith(term))) rank += 3;
    else if (primaryText.includes(term)) rank += 2;
    else if (secondaryText.includes(term)) rank += 1;
    else return 0;
  }
  const query = terms.join(' ');
  if (primaryFields.some((field) => field === query || field === `#${query}`)) rank += 5;
  return rank;
}
