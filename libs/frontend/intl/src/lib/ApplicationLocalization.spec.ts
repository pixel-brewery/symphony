// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideTranslationRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { APPLICATION_LANGUAGE_STORAGE } from './ApplicationLanguageStorageToken';
import { ApplicationLocalization } from './ApplicationLocalization';
import { applicationLanguageStorageKey } from './ApplicationLanguageStorageKey';

// #endregion

describe('ApplicationLocalization', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('changes the live language, document language and positional formatting together', () => {
    // arrange
    const setItem = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTranslationRegistry({
          defaultLanguageResolver: () => 'en',
          translations: { en: { example: '{0} of {1}' }, de: { example: '{0} von {1}' } },
        }),
        { provide: APPLICATION_LANGUAGE_STORAGE, useValue: { getItem: () => null, setItem } },
      ],
    });
    const localization = TestBed.inject(ApplicationLocalization);

    // act
    localization.setLanguage('de');

    // assert
    expect(localization.language()).toBe('de');
    expect(localization.translate('example', 2, 5)).toBe('2 von 5');
    expect(document.documentElement.lang).toBe('de');
    expect(setItem).toHaveBeenCalledWith(applicationLanguageStorageKey, 'de');
  });

  it('synchronizes another window without writing the preference back', () => {
    // arrange
    const setItem = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTranslationRegistry({
          defaultLanguageResolver: () => 'en',
          translations: { en: {}, de: {} },
        }),
        { provide: APPLICATION_LANGUAGE_STORAGE, useValue: { getItem: () => null, setItem } },
      ],
    });
    const localization = TestBed.inject(ApplicationLocalization);

    // act
    localization.synchronizeLanguage('de');

    // assert
    expect(localization.language()).toBe('de');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('still changes the current window when saving the preference is refused', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideTranslationRegistry({
          defaultLanguageResolver: () => 'en',
          translations: { en: {}, de: {} },
        }),
        {
          provide: APPLICATION_LANGUAGE_STORAGE,
          useValue: {
            getItem: () => null,
            setItem: (): void => {
              throw new Error('blocked');
            },
          },
        },
      ],
    });
    const localization = TestBed.inject(ApplicationLocalization);

    // act
    localization.setLanguage('de');

    // assert
    expect(localization.language()).toBe('de');
  });
});
