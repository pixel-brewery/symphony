// #region Imports

import { ElementRef } from '@angular/core';

// #endregion

export interface IHasElementRef {
  readonly elementRef: ElementRef<HTMLElement>;
}
