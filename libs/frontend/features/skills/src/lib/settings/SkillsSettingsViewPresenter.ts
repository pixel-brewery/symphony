// #region Imports
import { inject, Injectable } from '@angular/core';
import { ViewPresenter } from '@symphony/frontend-core';
import { SettingsHostSession } from '@symphony/frontend-setting';
import { SkillsSettingsDrafts } from './SkillsSettingsDrafts';
// #endregion
/** The feature-owned role cards projected from the Settings route's existing draft lifetime. @public */
@Injectable()
export class SkillsSettingsViewPresenter extends ViewPresenter {
  // #region Fields
  private readonly _drafts = inject(SkillsSettingsDrafts);
  /** The existing builtinSkills projection or command. @public @readonly */
  public readonly builtinSkills = this._drafts.builtinSkills;
  /** The existing skillTab projection or command. @public @readonly */
  public readonly skillTab = this._drafts.skillTab;
  /** The existing selectSkillTabCommand projection or command. @public @readonly */
  public readonly selectSkillTabCommand = this._drafts.selectSkillTabCommand;
  /** The existing skillInstructions projection or command. @public @readonly */
  public readonly skillInstructions = this._drafts.skillInstructions;
  /** The existing updateSkillInstructionsCommand projection or command. @public @readonly */
  public readonly updateSkillInstructionsCommand = this._drafts.updateSkillInstructionsCommand;
  /** The existing saveSkillInstructionsCommand projection or command. @public @readonly */
  public readonly saveSkillInstructionsCommand = this._drafts.saveSkillInstructionsCommand;
  /** The existing resetSkillInstructionsCommand projection or command. @public @readonly */
  public readonly resetSkillInstructionsCommand = this._drafts.resetSkillInstructionsCommand;
  /** The existing skillsBusy projection or command. @public @readonly */
  public readonly skillsBusy = this._drafts.skillsBusy;
  // #endregion
  // #region Ctor
  /** Joins the current host session rather than resetting drafts on section navigation. @public */
  public constructor() {
    super();
    this._drafts.beginSession(inject(SettingsHostSession));
  }
  // #endregion
}
