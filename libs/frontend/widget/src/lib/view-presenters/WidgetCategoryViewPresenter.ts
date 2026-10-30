// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { VIEW_SLOT_CONTEXT } from '@pixel-brewery/mosaik-elements-angular';
import { ViewPresenter } from '@symphony/frontend-core';
import { QuickCreateManager } from '@symphony/frontend-quick-create';
import { WIDGET_HOST_CONTEXT } from '../context/WidgetHostContext';
import { WidgetMosaicSession } from '../services/WidgetMosaicSession';

// #endregion

/** Projects the native slot's feature category through the existing shared mosaic view. @public */
@Injectable()
export class WidgetCategoryViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _slot = inject(VIEW_SLOT_CONTEXT);
  private readonly _session = inject(WidgetMosaicSession);
  private readonly _host = inject(WIDGET_HOST_CONTEXT);
  private readonly _quickCreate = inject(QuickCreateManager);

  // #endregion

  // #region Properties

  /** Current feature category resolved from its native view identifier. @public @readonly */
  public readonly category = computed(() =>
    this._session.categories().find((category) => category.id === this._slot.viewId),
  );
  /** Existing page-owned loaded-state projection. @public @readonly */
  public readonly hasSnapshot = this._host.hasSnapshot;
  /** Existing pointer-protected mosaic slot. @public @readonly */
  public readonly hoveredTileSlot = this._session.hoveredTileSlot;
  /** Existing keyboard-protected mosaic slot. @public @readonly */
  public readonly focusedTileSlot = this._session.focusedTileSlot;
  /** Sends the unchanged feature-owned authoring route intent. @public @readonly */
  public readonly create = (route: string): Promise<void> => this._quickCreate.create(route);

  // #endregion
}
