// #region Imports

import { ElementRef } from '@angular/core';
import type { IHasElementRef } from './IHasElementRef';

// #endregion

export type HoverRevealTarget = ElementRef<HTMLElement> | HTMLElement | IHasElementRef | null;
