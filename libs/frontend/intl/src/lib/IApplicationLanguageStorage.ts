/**
 * The host-owned browser-profile operations needed to remember a language.
 *
 * @public
 */
export interface IApplicationLanguageStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
