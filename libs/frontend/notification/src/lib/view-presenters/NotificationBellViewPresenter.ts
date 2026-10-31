// #region Imports

import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { NotificationCentre } from '../state/NotificationCentre';

// #endregion

const OPEN_QUERY_PARAMETER = 'notifications';

/**
 * Connects the bell to this window's notification centre and opens the centre for the request
 * that arrives as `?notifications=open` (the tray's `Notifications` row).
 *
 * @public
 */
@Injectable()
export class NotificationBellViewPresenter {
  // #region Fields

  private readonly _router = inject(Router);

  /**
   * The notification centre of this window, with its open state and commands.
   *
   * @public
   * @readonly
   */
  public readonly centre = inject(NotificationCentre);

  /**
   * Whether the popover is open.
   *
   * @public
   * @readonly
   */
  public readonly isOpen = this.centre.isOpen;

  // #endregion

  // #region Ctor

  /**
   * Connects the centre's sources and listens for requests to open the popover.
   *
   * @public
   */
  public constructor() {
    this.centre.connect();
    this._router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.consumeOpenRequest());
    this.consumeOpenRequest();
  }

  // #endregion

  // #region Methods

  /** Opens the popover for `?notifications=open` and removes the parameter from the URL. */
  private consumeOpenRequest(): void {
    const url = this._router.parseUrl(this._router.url);
    if (url.queryParams[OPEN_QUERY_PARAMETER] !== 'open') return;
    this.centre.open();
    const queryParams = { ...url.queryParams };
    delete queryParams[OPEN_QUERY_PARAMETER];
    url.queryParams = queryParams;
    void this._router.navigateByUrl(url, { replaceUrl: true });
  }

  // #endregion
}
