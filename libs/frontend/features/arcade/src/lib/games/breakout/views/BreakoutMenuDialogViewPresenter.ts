// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import {
  Cancel,
  DIALOG_REF,
  DIALOG_REF_DATA,
  type IDialogRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { BreakoutVariations } from '../model/BreakoutVariations';
import type { BreakoutMenuDialogResult } from './BreakoutMenuDialogResult';
import type { IBreakoutMenuDialogData } from './IBreakoutMenuDialogData';
import type { IBreakoutSetup } from './IBreakoutSetup';

// #endregion

/** Owns the pending Breakout selection and instructions inside the Mosaik dialog. @public */
@Injectable()
export class BreakoutMenuDialogViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _data = inject(DIALOG_REF_DATA) as IBreakoutMenuDialogData;
  private readonly _dialogRef = inject(DIALOG_REF) as IDialogRef<
    IBreakoutMenuDialogData,
    BreakoutMenuDialogResult
  >;
  private readonly _setup = signal<IBreakoutSetup>({ ...this._data.setup });

  /** Whether the setup or rules are visible. @public @readonly */
  public readonly screen = signal<'setup' | 'instructions'>('setup');
  /** Pending cartridge options isolated from an already-running match. @public @readonly */
  public readonly setupForm = form(this._setup);
  /** All twelve original cartridge variations. @public @readonly */
  public readonly variations = BreakoutVariations;
  /** Active variation and its rule flags. @public @readonly */
  public readonly selectedVariation = computed(
    () =>
      BreakoutVariations.find((variation) => variation.id === Number(this._setup().variation)) ??
      BreakoutVariations[0],
  );
  /** Number of people selected for the pending match. @public @readonly */
  public readonly selectedPlayers = computed(() => Number(this._setup().players));
  /** Whether the paused match can be restored. @public @readonly */
  public readonly canContinue = this._data.canContinue;
  /** Shows the original cartridge controls and rules. @public @readonly */
  public readonly showInstructionsCommand = new Command(() => {
    this.screen.set('instructions');
  });

  /** Returns from the rules to the pending setup. @public @readonly */
  public readonly showSetupCommand = new Command(() => {
    this.screen.set('setup');
  });

  /** Starts a match with the pending selection. @public @readonly */
  public readonly playCommand = new Command(() => {
    this._dialogRef.close(Cancel.positive({ action: 'play', setup: this._setup() }));
  });

  /** Restores the paused match without applying pending setup changes. @public @readonly */
  public readonly continueCommand = new Command(() => {
    this._dialogRef.close(Cancel.positive({ action: 'continue' }));
  });

  /** Returns to the Arcade catalog. @public @readonly */
  public readonly allGamesCommand = new Command(() => {
    this._dialogRef.close(Cancel.positive({ action: 'allGames' }));
  });

  // #endregion
}
