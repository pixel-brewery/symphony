// #region Imports

import {
  DOCUMENT,
  DestroyRef,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { provideTranslationRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { APPLICATION_LANGUAGE_STORAGE } from './ApplicationLanguageStorageToken';
import type { IApplicationLocalizationOptions } from './IApplicationLocalizationOptions';
import { ApplicationLocalization } from './ApplicationLocalization';
import { applicationLanguageStorageKey } from './ApplicationLanguageStorageKey';
import { readApplicationLanguage } from './readApplicationLanguage';
import { provideLabelTranslations } from './labels/provideLabelTranslations';
import english from './resources/lang.en.json';
import german from './resources/lang.de.json';

// #endregion

/**
 * Registers the same catalogs before either the desktop or mobile application first renders.
 *
 * @param options - The host-owned profile port; without it the preference lasts only for this session.
 * @returns The Mosaik registry and browser-profile language lifecycle.
 * @public
 */
export function provideApplicationLocalization(
  options: IApplicationLocalizationOptions = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: APPLICATION_LANGUAGE_STORAGE, useValue: options.storage },
    provideTranslationRegistry({
      defaultLanguageResolver: () => readApplicationLanguage(options.storage),
      translations: { en: english, de: german },
    }),
    provideLabelTranslations(),
    provideAppInitializer(() => {
      const localization = inject(ApplicationLocalization);
      const document = inject(DOCUMENT);
      const view = document.defaultView;
      const storage = options.storage;
      const onStorage = (event: StorageEvent): void => {
        if (event.storageArea && event.storageArea !== storage) return;
        if (event.key === applicationLanguageStorageKey || event.key === null)
          localization.synchronizeLanguage(event.newValue);
      };
      view?.addEventListener('storage', onStorage);
      inject(DestroyRef).onDestroy(() => view?.removeEventListener('storage', onStorage));
      document.documentElement.lang = localization.language();
    }),
  ]);
}
