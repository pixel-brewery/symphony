let storedThemePreference;
try {
  storedThemePreference = globalThis.localStorage?.getItem('orchestration.theme-mode');
} catch {
  storedThemePreference = undefined;
}
const themePreference =
  storedThemePreference === 'light' ||
  storedThemePreference === 'dark' ||
  storedThemePreference === 'system'
    ? storedThemePreference
    : 'system';
const systemThemeMode = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
const preferredThemeMode = themePreference === 'system' ? systemThemeMode : themePreference;

globalThis.document.documentElement.setAttribute('theme-mode', preferredThemeMode);
globalThis.document.documentElement.style.colorScheme = preferredThemeMode;
globalThis.document
  .querySelector('meta[name="theme-color"]')
  ?.setAttribute('content', preferredThemeMode === 'dark' ? '#0c1016' : '#ffffff');
