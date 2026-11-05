// #region Imports

import { DatePipe } from '@angular/common';
import { inject, Pipe, type PipeTransform } from '@angular/core';
import { ApplicationLocalization } from './ApplicationLocalization';
import { registerApplicationLocales } from './registerApplicationLocales';

// #endregion

/**
 * Retains Angular date formats and timezone handling while following the live application language.
 *
 * @public
 */
@Pipe({ name: 'date', pure: false })
export class ApplicationDatePipe implements PipeTransform {
  // #region Fields

  private readonly _localization = inject(ApplicationLocalization);
  private readonly _date = new DatePipe('en-US');

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
   * Formats the same value and timezone with either an explicit or application locale.
   *
   * @param value - The instant or date supplied by the existing view contract.
   * @param format - An Angular date format, unchanged from the owning view.
   * @param timezone - The owning view's explicit timezone, when supplied.
   * @param locale - An explicit locale overrides the application language.
   * @returns The Angular date representation, or null for an absent value.
   * @public
   */
  public transform(
    value: string | number | Date | null | undefined,
    format?: string,
    timezone?: string,
    locale?: string,
  ): string | null {
    return this._date.transform(
      value,
      format,
      timezone,
      locale ?? (this._localization.language() === 'de' ? 'de-DE' : 'en-US'),
    );
  }

  // #endregion
}
