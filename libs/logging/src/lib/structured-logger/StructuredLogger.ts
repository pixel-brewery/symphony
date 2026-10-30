// #region Imports

import type { ILogFields } from './ILogFields';

// #endregion

export class StructuredLogger {
  // #region Ctor

  public constructor(private readonly _component: string) {}

  // #endregion

  // #region Methods

  /**
   * Returns the info.
   *
   * @param fields - Fields.
   * @public
   */
  public info(fields: ILogFields): void {
    process.stdout.write(
      `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', component: this._component, ...fields })}\n`,
    );
  }

  /**
   * Returns the error.
   *
   * @param fields - Fields.
   * @public
   */
  public error(fields: ILogFields): void {
    process.stderr.write(
      `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', component: this._component, ...fields })}\n`,
    );
  }

  // #endregion
}
