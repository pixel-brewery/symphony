// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { mosaikEventText } from '@symphony/frontend-setting';
import { deliveryFlowStepOf } from '@symphony/frontend-ui';
import { SkillStore } from '../catalog/SkillStore';
import type { ISkillRoleInstructionsEditorRequest } from './ISkillRoleInstructionsEditorRequest';

// #endregion

/**
 * The instructions sheet of one built-in process role: its shipped instructions to read and the
 * additions a person writes to refine how the role works.
 *
 * @public
 */
@Injectable()
export class SkillRoleInstructionsEditorViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _store = inject(SkillStore);
  private readonly _dialogRef = inject(DIALOG_REF);

  /**
   * The validated sheet request.
   *
   * @public
   * @readonly
   */
  public readonly data = inject<ISkillRoleInstructionsEditorRequest>(DIALOG_REF_DATA);

  /**
   * The process role the sheet edits.
   *
   * @public
   * @readonly
   */
  public readonly skill = computed(() =>
    this._store.builtinSkills().find((candidate) => candidate.role === this.data.role),
  );

  /**
   * The delivery-flow step the role belongs to.
   *
   * @public
   * @readonly
   */
  public readonly step = deliveryFlowStepOf(this.data.role);

  /**
   * Which instructions the sheet shows.
   *
   * @public
   * @readonly
   */
  public readonly tab = signal<'shipped' | 'additional'>('additional');

  /**
   * The additions being written; they apply on `Save`.
   *
   * @public
   * @readonly
   */
  public readonly additions = signal(this.skill()?.additionalInstructions ?? '');

  /**
   * Whether the additions are being saved.
   *
   * @public
   * @readonly
   */
  public readonly busy = signal(false);

  private readonly _updateAdditionsCommand: Command<unknown> = new Command((event) =>
    this.additions.set(mosaikEventText(event) ?? ''),
  );

  private readonly _saveCommand: Command<void> = new Command(
    () => void this.onExecuteSaveCommand(this.additions()),
  );

  private readonly _resetCommand: Command<void> = new Command(
    () => void this.onExecuteSaveCommand(''),
  );

  private readonly _closeCommand: Command<void> = new Command(() => this._dialogRef.close());

  // #endregion

  // #region Properties

  /**
   * Takes the text of the additions box.
   *
   * @public
   * @readonly
   */
  public get updateAdditionsCommand(): Command<unknown> {
    return this._updateAdditionsCommand;
  }

  /**
   * Saves the additions and closes the sheet.
   *
   * @public
   * @readonly
   */
  public get saveCommand(): Command<void> {
    return this._saveCommand;
  }

  /**
   * Removes the additions, so the role runs its built-in instructions only, and closes the sheet.
   *
   * @public
   * @readonly
   */
  public get resetCommand(): Command<void> {
    return this._resetCommand;
  }

  /**
   * Closes the sheet without saving.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Saves additions and closes the sheet when they were saved.
   *
   * @param additions - The additions to store.
   * @private
   */
  private async onExecuteSaveCommand(additions: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this._store.customizeBuiltinSkill(this.data.role, additions);
      // The store reports a failed save itself and keeps the stored text; the sheet then stays
      // open with what was written.
      if (this.skill()?.additionalInstructions === additions) this._dialogRef.close();
    } finally {
      this.busy.set(false);
    }
  }

  // #endregion
}
