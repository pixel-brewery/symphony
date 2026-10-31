// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { IQuickCreateItem, IQuickCreateItemSource } from '@symphony/frontend-quick-create';
import { WORK_QUICK_CREATE_CONTEXT } from '../ports/WorkQuickCreateContextToken';
import type { IWorkQuickCreateContext } from '../ports/IWorkQuickCreateContext';

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
        label: 'New work item',
        testId: 'home-create-work-item',
        route: '/main/board',
        disabled: !this._context.canCreateWorkItem(),
        tooltip: this._context.canCreateWorkItem()
          ? 'Create a work item on the selected board.'
          : 'Select one board to create a work item.',
      },
    ];
  }

  // #endregion
}
