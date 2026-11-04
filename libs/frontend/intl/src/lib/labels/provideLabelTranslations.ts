// #region Imports

import {
  DestroyRef,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { provideTranslations } from '@pixel-brewery/mosaik-elements-angular';
import { ApplicationLocalization } from '../ApplicationLocalization';
import { LabelLocalizationBinding } from './LabelLocalizationBinding';
import english from './lang.en.json';
import german from './lang.de.json';

// #endregion

/**
 * Adds the presentation catalogs and binds pure projections to the existing application translator.
 *
 * @returns Catalog registration and application-owned binding cleanup.
 * @public
 */
export function provideLabelTranslations(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTranslations({ en: english, de: german }),
    provideAppInitializer(() => {
      const dispose = LabelLocalizationBinding.bind(inject(ApplicationLocalization));
      inject(DestroyRef).onDestroy(dispose);
    }),
  ]);
}
