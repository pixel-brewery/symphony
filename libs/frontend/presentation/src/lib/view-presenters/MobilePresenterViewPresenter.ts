// #region Imports

import { DestroyRef, inject, Injectable, signal, computed } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  NavigationRegistry,
  ViewPresenter,
  type INavigationItem,
  Command,
} from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import { filter } from 'rxjs';

// #endregion

@Injectable()
export class MobilePresenterViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _router = inject(Router);
  private readonly _navigation = inject(NavigationRegistry);
  private readonly _store = inject(MobileCompanionStore);
  private readonly _routeState = signal(this._router.url);

  /**
   * The navigation items.
   *
   * @public
   * @readonly
   */
  public readonly navigationItems = this._navigation.byRegion('mobile-main');

  /**
   * The route.
   *
   * @public
   * @readonly
   */
  public readonly route = this._routeState.asReadonly();

  /**
   * The snapshot.
   *
   * @public
   * @readonly
   */
  public readonly snapshot = this._store.snapshot;

  /**
   * The pairing.
   *
   * @public
   * @readonly
   */
  public readonly pairing = this._store.pairing;

  /**
   * The pairing state.
   *
   * @public
   * @readonly
   */
  public readonly pairingState = this._store.pairingState;

  /**
   * The error.
   *
   * @public
   * @readonly
   */
  public readonly error = this._store.error;

  /**
   * The loading.
   *
   * @public
   * @readonly
   */
  public readonly loading = this._store.loading;

  private readonly _isSelected = computed(
    () => (item: INavigationItem) => this.resolveIsSelected(item),
  );

  private readonly _selectCommand: Command<INavigationItem> = new Command(
    (item) => void this.onExecuteSelectCommand(item),
  );
  private readonly _retryCommand: Command<void> = new Command(
    () => void this.onExecuteRetryCommand(),
  );
  // #endregion

  // #region Ctor

  public constructor(destroyRef: DestroyRef = inject(DestroyRef)) {
    super(destroyRef);
    const subscription = this._router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this._routeState.set(event.urlAfterRedirects));
    destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  // #endregion

  // #region Properties

  /**
   * The isSelected projection.
   *
   * @public
   * @readonly
   */
  public get isSelected() {
    return this._isSelected;
  }
  /**
   * The select command.
   *
   * @public
   * @readonly
   */
  public get selectCommand(): Command<INavigationItem> {
    return this._selectCommand;
  }
  /**
   * The retry command.
   *
   * @public
   * @readonly
   */
  public get retryCommand(): Command<void> {
    return this._retryCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Initializes.
   *
   * @public
   */
  public override initialize(): void {
    super.initialize();
    void this._store.initialize();
  }

  /**
   * Whether it is selected.
   *
   * @param item - Item.
   * @private
   */
  private resolveIsSelected(item: INavigationItem): boolean {
    return this._routeState().startsWith(item.route);
  }

  /**
   * Selects.
   *
   * @param item - Item.
   * @private
   */
  private onExecuteSelectCommand(item: INavigationItem): void {
    if (this.resolveIsSelected(item)) return;
    void this._router.navigateByUrl(item.route);
  }

  /**
   * Retries.
   *
   * @private
   */
  private onExecuteRetryCommand(): void {
    void this._store.retry();
  }

  // #endregion
}
