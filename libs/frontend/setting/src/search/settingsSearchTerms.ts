/**
 * Splits a search query into lower-case words.
 *
 * @param query - The typed query.
 * @returns The distinct words, longest first so a highlight prefers the longer match.
 * @public
 */
export function settingsSearchTerms(query: string): readonly string[] {
  return [...new Set(query.toLocaleLowerCase().split(/\s+/u).filter(Boolean))].toSorted(
    (left, right) => right.length - left.length,
  );
}
