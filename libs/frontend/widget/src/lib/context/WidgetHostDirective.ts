// #region Imports

import { Directive, forwardRef, inject, input } from '@angular/core';
import { WidgetMosaicSession } from '../services/WidgetMosaicSession';
import type { IWidgetHostContext } from './IWidgetHostContext';
import { WIDGET_HOST_CONTEXT } from './WidgetHostContext';

// #endregion

/** Scopes the existing mosaic lifecycle and loading projection to one mounted Home surface. @public */
@Directive({
  selector: '[symphonyWidgetHost]',
  providers: [
    WidgetMosaicSession,
    { provide: WIDGET_HOST_CONTEXT, useExisting: forwardRef(() => WidgetHostDirective) },
  ],
})
export class WidgetHostDirective implements IWidgetHostContext {
  // #region Ctor

  /** Starts the existing rotation lifecycle at the owning host's creation. @public */
  public constructor() {
    void inject(WidgetMosaicSession);
  }

  // #endregion

  // #region Properties

  /** Existing page loading state, supplied through Angular's public input contract. @public @readonly */
  public readonly hasSnapshot = input.required<boolean>({ alias: 'symphonyWidgetHost' });

  // #endregion
}
