// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { mosaikEventValue } from '@symphony/frontend-setting';
import type { UpdateChannel, UpdateState } from '@symphony/ipc-contracts-desktop';
import { DesktopUpdateStore } from '../state/DesktopUpdateStore';

// #endregion

/**
 * Owns the existing update card's projections and commands over the single update store.
 *
 * @public
 */
@Injectable()
export class UpdateSettingsCardViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _canCheckForUpdates = computed(
    () =>
      (state: UpdateState | undefined = this.updates.state()) =>
        this.resolveCanCheckForUpdates(state),
  );
  private readonly _updateChannelCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateChannelCommand(event),
  );

  // #endregion

  // #region Properties

  /** The authoritative update state and existing operations. @public @readonly */
  public readonly updates = inject(DesktopUpdateStore);

  /** The existing check-action availability projection. @public @readonly */
  public get canCheckForUpdates() {
    return this._canCheckForUpdates;
  }

  /** The existing release-channel selection command. @public @readonly */
  public get updateChannelCommand(): Command<unknown> {
    return this._updateChannelCommand;
  }

  // #endregion

  // #region Methods

  private resolveCanCheckForUpdates(
    state: UpdateState | undefined = this.updates.state(),
  ): boolean {
    return Boolean(
      state &&
      state.kind !== 'disabled' &&
      state.kind !== 'checking' &&
      state.kind !== 'downloading' &&
      state.kind !== 'ready',
    );
  }

  private onExecuteUpdateChannelCommand(event: unknown): void {
    const value = this.eventValue(event);
    if (value === 'stable' || value === 'canary') {
      void this.updates.setChannel(value satisfies UpdateChannel);
    }
  }

  private eventValue(event: unknown): unknown {
    return mosaikEventValue(event);
  }

  // #endregion
}
