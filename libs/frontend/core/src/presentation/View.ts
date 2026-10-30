// #region Imports

import { Directive, inject, type OnDestroy, type OnInit } from '@angular/core';
import type { IViewPresenter } from './IViewPresenter';
import { VIEW_PRESENTER } from './ViewPresenterToken';

// #endregion

/**
 * Base class connecting an Angular View to its ViewPresenter lifecycle.
 *
 * @typeParam TPresenter - Concrete presenter provided by the View.
 * @public
 * @abstract
 */
@Directive()
export abstract class View<TPresenter extends IViewPresenter> implements OnInit, OnDestroy {
  // #region Fields

  private readonly _presenter = inject(VIEW_PRESENTER) as TPresenter;

  // #endregion

  // #region Properties

  /**
   * Presenter backing the View and exposed to its template.
   *
   * @public
   */
  public get presenter(): TPresenter {
    return this._presenter;
  }

  // #endregion

  // #region Methods

  /**
   * Initializes the presenter with the Angular View.
   *
   * @public
   */
  public ngOnInit(): void {
    this.initialize();
  }

  /**
   * Disposes the presenter with the Angular View.
   *
   * @public
   */
  public ngOnDestroy(): void {
    this.dispose();
  }

  /**
   * Initializes the backing presenter.
   *
   * @public
   */
  public initialize(): void {
    this._presenter.initialize();
  }

  /**
   * Disposes the backing presenter.
   *
   * @public
   */
  public dispose(): void {
    this._presenter.dispose();
  }

  // #endregion
}
