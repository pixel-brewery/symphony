// #region Imports

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_THEME_APPLIER } from './MobileThemeApplier';
import { MobileThemeStore } from './MobileThemeStore';
import { THEME_PREFERENCE_STORAGE_KEY } from '@symphony/frontend-core/mobile';

// #endregion

describe('MobileThemeStore', () => {
  let matchesDark = false;
  let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;
  const applyTheme = vi.fn();

  beforeEach(() => {
    matchesDark = false;
    mediaListener = undefined;
    applyTheme.mockReset();
    const storedValues = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() {
        return storedValues.size;
      },
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storedValues.set(key, value);
      },
      removeItem: (key: string) => storedValues.delete(key),
      key: (index: number) => [...storedValues.keys()][index] ?? null,
      clear: () => storedValues.clear(),
    } as Storage);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        () =>
          ({
            get matches() {
              return matchesDark;
            },
            addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
              mediaListener = listener;
            },
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    );
    TestBed.configureTestingModule({
      providers: [MobileThemeStore, { provide: MOBILE_THEME_APPLIER, useValue: applyTheme }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('applies and persists a fixed mobile theme immediately', () => {
    // arrange
    const store = TestBed.inject(MobileThemeStore);
    store.initialize();

    // act
    store.setPreference('dark');

    // assert
    expect(store.preference()).toBe('dark');
    expect(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe('dark');
    expect(applyTheme).toHaveBeenLastCalledWith('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('follows device appearance changes only for the system preference', () => {
    // arrange
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'system');
    const store = TestBed.inject(MobileThemeStore);
    // act
    store.initialize();
    // assert
    expect(applyTheme).toHaveBeenLastCalledWith('light');

    matchesDark = true;
    mediaListener?.({ matches: true } as MediaQueryListEvent);
    expect(applyTheme).toHaveBeenLastCalledWith('dark');

    store.setPreference('light');
    matchesDark = false;
    mediaListener?.({ matches: false } as MediaQueryListEvent);
    expect(applyTheme).toHaveBeenLastCalledWith('light');
  });
});
