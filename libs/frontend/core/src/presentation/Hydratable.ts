// #region Imports

import { signal, type Signal, type WritableSignal } from '@angular/core';
import { isObservable, type Subscription } from 'rxjs';
import type { HydrationOperation } from './HydrationOperation';
import type { IHydratablePresenter } from './IHydratablePresenter';
import type { ViewPresenter } from './ViewPresenter';

// #endregion

// TypeScript requires an unconstrained parameter array for a mixin base constructor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PresenterConstructor = abstract new (...args: Array<any>) => ViewPresenter;

// TypeScript requires an unconstrained parameter array for a returned mixin constructor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PresenterBehaviorReturn<TBase, TBehavior> = (abstract new (...args: Array<any>) => TBehavior) &
  TBase;

/**
 * Adds one-time initial hydration to a presenter independently from later busy operations.
 */
export function Hydratable<TBase extends PresenterConstructor>(
  base: TBase,
): PresenterBehaviorReturn<TBase, IHydratablePresenter> {
  abstract class HydratableViewPresenter extends base implements IHydratablePresenter {
    // #region Fields

    private readonly _hydratingState: WritableSignal<boolean> = signal(true);
    private _hydrationSubscription?: Subscription;
    private _hydrationGeneration = 0;

    // #endregion

    // #region Properties

    /**
     * Whether the initial presenter hydration is still active.
     *
     * @public
     * @readonly
     */
    public get isHydrating(): Signal<boolean> {
      return this._hydratingState.asReadonly();
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
      this._hydrationSubscription?.unsubscribe();
      this._hydrationSubscription = undefined;
      const generation = ++this._hydrationGeneration;
      this._hydratingState.set(true);

      let hydration: HydrationOperation;
      try {
        hydration = this.onHydrate();
      } catch (error: unknown) {
        this.finishHydration(generation);
        this.onHydrationError(error);
        return;
      }

      if (!hydration) {
        // Finish after Angular has registered the view's signal consumer. Completing a no-op
        // hydration synchronously from ngOnInit can leave an OnPush control-flow block empty.
        queueMicrotask(() => this.finishHydration(generation));
        return;
      }

      if (isObservable(hydration)) {
        this._hydrationSubscription = hydration.subscribe({
          error: (error: unknown) => {
            this.finishHydration(generation);
            this.onHydrationError(error);
          },
          complete: () => this.finishHydration(generation),
        });
        return;
      }

      void hydration.then(
        () => this.finishHydration(generation),
        (error: unknown) => {
          this.finishHydration(generation);
          this.onHydrationError(error);
        },
      );
    }

    /**
     * Disposes.
     *
     * @public
     */
    public override dispose(): void {
      this._hydrationGeneration += 1;
      this._hydrationSubscription?.unsubscribe();
      this._hydrationSubscription = undefined;
      this._hydratingState.set(false);
      super.dispose();
    }

    /**
     * Handles hydrate.
     *
     * @public
     */
    public onHydrate(): HydrationOperation {
      return undefined;
    }

    /**
     * Handles hydration error.
     *
     * @param error - Error.
     * @public
     */
    public onHydrationError(error: unknown): void {
      throw error;
    }

    private finishHydration(generation: number): void {
      if (generation !== this._hydrationGeneration) return;
      this._hydratingState.set(false);
    }

    // #endregion
  }

  return HydratableViewPresenter as PresenterBehaviorReturn<TBase, IHydratablePresenter>;
}
