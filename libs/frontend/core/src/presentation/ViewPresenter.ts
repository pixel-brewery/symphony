// #region Imports

import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { isObservable, Observable, Subscription } from 'rxjs';
import type { AbortRef } from './AbortRef';
import type { IViewPresenter } from './IViewPresenter';
import type { LoadingRef } from './LoadingRef';

// #endregion

/**
 * Signal-based base class for presentation state owned by a View.
 *
 * @public
 * @abstract
 */
@Injectable()
export abstract class ViewPresenter implements IViewPresenter {
  // #region Fields

  private readonly _initialized: WritableSignal<boolean> = signal(false);
  private readonly _disposed: WritableSignal<boolean> = signal(false);
  private readonly _activeOperations: WritableSignal<number> = signal(0);
  private readonly _subscriptions = new Set<Subscription>();
  private readonly _isLoading = computed(() => this._activeOperations() > 0);
  private readonly _abortController = new AbortController();
  private readonly _loadingRef: LoadingRef = {
    enter: () => this.setLoading(true),
    leave: () => this.setLoading(false),
  };
  private readonly _abortRef: AbortRef = {
    signal: this._abortController.signal,
    abort: () => {
      if (!this._abortController.signal.aborted) this._abortController.abort();
    },
  };

  // #endregion

  // #region Ctor

  /**
   * Constructs a presenter tied to Angular's destruction lifecycle.
   *
   * @param destroyRef - Angular destruction reference.
   * @public
   */
  public constructor(destroyRef: DestroyRef = inject(DestroyRef)) {
    destroyRef.onDestroy(() => this.dispose());
  }

  // #endregion

  // #region Properties

  /**
   * @inheritdoc
   *
   * @public
   */
  public get disposed(): Signal<boolean> {
    return this._disposed.asReadonly();
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public get initialized(): Signal<boolean> {
    return this._initialized.asReadonly();
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public get isLoading(): Signal<boolean> {
    return this._isLoading;
  }

  /** Loading reference supplied to asynchronous commands. */
  protected get loadingRef(): LoadingRef {
    return this._loadingRef;
  }

  /** Cancellation signal supplied to presenter-owned asynchronous operations. */
  protected get abortRef(): AbortRef {
    return this._abortRef;
  }

  // #endregion

  // #region Methods

  /**
   * @inheritdoc
   *
   * @public
   */
  public initialize(): void {
    if (!this._initialized()) this._initialized.set(true);
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public dispose(): void {
    if (this._disposed()) return;
    this._abortRef.abort();
    for (const subscription of this._subscriptions) subscription.unsubscribe();
    this._subscriptions.clear();
    this._disposed.set(true);
  }

  /**
   * Balances the loading state around a tracked operation.
   *
   * @param operation - Operation to track.
   * @returns The tracked operation.
   * @protected
   */
  protected withLoading(operation: Subscription): Subscription;
  protected withLoading<T>(operation: Observable<T>): Observable<T>;
  protected withLoading<T>(operation: () => Observable<T>): Observable<T>;
  protected withLoading<T>(operation: () => Promise<T> | T): Promise<T>;
  protected withLoading<T>(
    operation: Subscription | Observable<T> | (() => Promise<T> | Observable<T> | T),
  ): Subscription | Promise<T> | Observable<T> {
    if (operation instanceof Subscription) return this.trackSubscription(operation);
    if (isObservable(operation)) return this.trackObservable(operation);
    const result = operation();
    if (isObservable(result)) return this.trackObservable(result);
    this.setLoading(true);
    return Promise.resolve(result).finally(() => this.setLoading(false));
  }

  private setLoading(value: boolean): void {
    this._activeOperations.update((count) => Math.max(0, count + (value ? 1 : -1)));
  }

  private trackObservable<T>(operation: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.setLoading(true);
      const subscription = operation.subscribe({
        next: (value) => subscriber.next(value),
        error: (error: unknown) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
      return () => {
        subscription.unsubscribe();
        this.setLoading(false);
      };
    });
  }

  private trackSubscription(subscription: Subscription): Subscription {
    this.setLoading(true);
    this._subscriptions.add(subscription);
    let active = true;
    subscription.add(() => {
      if (!active) return;
      active = false;
      this._subscriptions.delete(subscription);
      this.setLoading(false);
    });
    return subscription;
  }

  // #endregion
}
