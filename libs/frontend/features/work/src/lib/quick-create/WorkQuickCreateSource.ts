// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { IQuickCreateItem, IQuickCreateItemSource } from '@symphony/frontend-quick-create';
import { WORK_QUICK_CREATE_CONTEXT } from '../ports/WorkQuickCreateContextToken';
import type { IWorkQuickCreateContext } from '../ports/IWorkQuickCreateContext';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Supplies the existing work authoring action and its current availability. @public */
@Injectable()
export class WorkQuickCreateSource implements IQuickCreateItemSource {
  // #region Fields

  private readonly _context: IWorkQuickCreateContext;

  // #endregion

  // #region Ctor

  /** Connects the existing feature authoring-availability projection. @public */
  public constructor(
    @Inject(WORK_QUICK_CREATE_CONTEXT)
    context: IWorkQuickCreateContext = inject(WORK_QUICK_CREATE_CONTEXT),
  ) {
    this._context = context;
  }

  // #endregion

  // #region Methods

  /** Returns the existing action, including its disabled-state explanation. @public */
  public getItems(): readonly IQuickCreateItem[] {
    return [
      {
        id: 'work.create',
        navigationItemKey: 'board',
        get label() {
          return translateLabel('loc.symphony.labels.new.work.item.4b01264');
        },
        testId: 'home-create-work-item',
        route: '/main/board',
        disabled: !this._context.canCreateWorkItem(),
        tooltip: this._context.canCreateWorkItem()
          ? translateLabel('loc.symphony.labels.create.a.work.item.on.the.selected.board.07e93f9')
          : translateLabel('loc.symphony.labels.select.one.board.to.create.a.work.item.58df4b6'),
      },
    ];
  }

  // #endregion
}
