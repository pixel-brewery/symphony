// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import type { IDeliveryQuickCreateContext } from './IDeliveryQuickCreateContext';
import type { IQuickCreateItem, IQuickCreateItemSource } from '@symphony/frontend-quick-create';

// #endregion

/** Supplies the existing delivery authoring action and its current availability. @public */
@Injectable()
export class DeliveryQuickCreateSource implements IQuickCreateItemSource {
  // #region Fields

  private readonly _context: IDeliveryQuickCreateContext;

  // #endregion

  // #region Ctor

  /** Connects the existing feature authoring-availability projection. @public */
  public constructor(
    @Inject(DELIVERY_VIEW_CONTEXT)
    context: IDeliveryQuickCreateContext = inject(DELIVERY_VIEW_CONTEXT),
  ) {
    this._context = context;
  }

  // #endregion

  // #region Methods

  /** Returns the existing action, including its disabled-state explanation. @public */
  public getItems(): readonly IQuickCreateItem[] {
    return [
      {
        id: 'delivery.create',
        navigationItemKey: 'pull-requests',
        label: 'New pull request',
        testId: 'home-create-pull-request',
        route: '/main/pull-requests',
        disabled: !this._context.canCreatePullRequest(),
        tooltip: this._context.canCreatePullRequest()
          ? 'Open a pull request on a repository in scope.'
          : 'Bind a GitHub repository to open a pull request.',
      },
    ];
  }

  // #endregion
}
