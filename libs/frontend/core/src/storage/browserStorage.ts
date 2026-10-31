/**
 * Resolves the current browser's local storage when it is available.
 *
 * @returns The local storage instance, or `undefined` outside a browser context.
 * @public
 */
export function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
