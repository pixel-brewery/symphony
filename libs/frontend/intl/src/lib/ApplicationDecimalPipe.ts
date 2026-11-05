// #region Imports

import { DecimalPipe } from '@angular/common';
import { inject, Pipe, type PipeTransform } from '@angular/core';
import { ApplicationLocalization } from './ApplicationLocalization';
import { registerApplicationLocales } from './registerApplicationLocales';

// #endregion

/**
 * Keeps Angular's numeric precision contract and uses the selected application language.
 *
 * @public
 */
@Pipe({ name: 'number', pure: false })
export class ApplicationDecimalPipe implements PipeTransform {
  // #region Fields

  private readonly _localization = inject(ApplicationLocalization);
  private readonly _number = new DecimalPipe('en-US');

  // #endregion

  // #region Ctor

  /**
   * Registers the supported Angular locale data.
   *
   * @public
   */
  public constructor() {
    registerApplicationLocales();
  }

  // #endregion

  // #region Methods

  /**
   * Formats a number without changing its value, precision, or sorting meaning.
   *
   * @param value - The numeric value supplied by the owning view.
   * @param digitsInfo - Angular's existing minimum/maximum digit configuration.
   * @param locale - An explicit locale overrides the application language.
   * @returns A formatted value, or null for an absent value.
   * @public
   */
  public transform(
    value: string | number | null | undefined,
    digitsInfo?: string,
    locale?: string,
  ): string | null {
    return this._number.transform(
      value,
      digitsInfo,
      locale ?? (this._localization.language() === 'de' ? 'de-DE' : 'en-US'),
    );
  }

  // #endregion
}
