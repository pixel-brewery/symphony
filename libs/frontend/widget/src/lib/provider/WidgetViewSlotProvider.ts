// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import type { IViewSlotProvider } from '@pixel-brewery/mosaik-elements-angular';
import type { IWidgetDefinition } from '../models/IWidgetDefinition';
import { WIDGET_DEFINITIONS } from './WidgetDefinitions';

// #endregion

/** Hands static feature configuration to the existing Mosaik registry. @public */
@Injectable()
export class WidgetViewSlotProvider implements IViewSlotProvider {
  // #region Fields
  private readonly _definitions: readonly IWidgetDefinition[];
  // #endregion
  // #region Ctor
  /** Captures the explicitly included widget configuration. @public */
  public constructor(
    @Inject(WIDGET_DEFINITIONS)
    @Optional()
    definitions: readonly IWidgetDefinition[] | null = inject(WIDGET_DEFINITIONS, {
      optional: true,
    }),
  ) {
    this._definitions = definitions ?? [];
  }
  // #endregion
  // #region Methods
  /** Supplies native definitions while rejecting ambiguous widget identities. @public */
  public getViews(): IWidgetDefinition[] {
    const ids = new Set<string>();
    for (const definition of this._definitions) {
      if (ids.has(definition.id)) throw new Error(`Duplicate widget id: "${definition.id}".`);
      ids.add(definition.id);
    }
    return [...this._definitions];
  }
  // #endregion
}
