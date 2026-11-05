// #region Imports

import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@pixel-brewery/mosaik-elements-angular';
import { APPLICATION_LANGUAGE_STORAGE } from './ApplicationLanguageStorageToken';
import type { ApplicationLanguage } from './ApplicationLanguage';
import { applicationLanguageStorageKey } from './ApplicationLanguageStorageKey';

// #endregion

/**
 * Owns the current browser-profile language while Mosaik owns translation and control localization.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class ApplicationLocalization {
  // #region Fields

  private readonly _translate = inject(TranslateService);
  private readonly _document = inject(DOCUMENT);
  private readonly _storage = inject(APPLICATION_LANGUAGE_STORAGE);
  private readonly _language = signal<ApplicationLanguage>(
    this._translate.currentLanguage === 'de' ? 'de' : 'en',
  );

  /**
   * The selected language, shared by labels and locale-sensitive projections.
   *
   * @public
   * @readonly
   */
  public readonly language = this._language.asReadonly();

  // #endregion

  // #region Methods

  /**
   * Applies a supported language immediately and remembers it when storage is available.
   *
   * @param language - A supported selection from the language control.
   * @public
   */
  public setLanguage(language: ApplicationLanguage): void {
    if (language !== 'en' && language !== 'de') return;
    this.applyLanguage(language);
    try {
      this._storage?.setItem(applicationLanguageStorageKey, language);
    } catch {
      // A blocked browser store does not prevent changing the current window's language.
    }
  }

  /**
   * Receives a browser storage event without persisting it again.
   *
   * @param value - The other window's stored language, or null after clearing the preference.
   * @public
   */
  public synchronizeLanguage(value: string | null): void {
    this.applyLanguage(value === 'de' ? 'de' : 'en');
  }

  /**
   * Resolves application-authored copy and positional placeholders through the public Mosaik translator.
   *
   * @param key - A key in the application's locale catalogs.
   * @param parameters - Values for the catalog's {0}, {1}, … placeholders.
   * @returns The selected translation.
   * @public
   */
  public translate(key: string, ...parameters: Array<unknown>): string {
    this._language();
    return this._translate.translate(key, ...parameters);
  }

  private applyLanguage(language: ApplicationLanguage): void {
    if (this._language() !== language) this._translate.currentLanguage = language;
    this._language.set(language);
    this._document.documentElement.lang = language;
  }

  // #endregion
}
