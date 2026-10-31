// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import type { SkillFlowRole } from '@symphony/domain-skills';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { SettingsEditorService } from '@symphony/frontend-setting';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';
import { SkillStore } from '../catalog/SkillStore';
import type { ISkillCatalogEditorRequest } from './ISkillCatalogEditorRequest';
import type { ISkillEditorRequest } from './ISkillEditorRequest';
import type { ISkillRoleInstructionsEditorRequest } from './ISkillRoleInstructionsEditorRequest';
import { projectSkillSteps } from './skill-steps/projectSkillSteps';

// #endregion

/**
 * Presents the `Skills` section: one block per delivery-flow step with its built-in process roles
 * and the skill package attached to its optional AI step.
 *
 * @public
 */
@Injectable()
export class SkillsSettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _store = inject(SkillStore);
  private readonly _editors = inject(SettingsEditorService);

  /**
   * The delivery-flow steps with their roles and packages.
   *
   * @public
   * @readonly
   */
  public readonly steps = computed(() =>
    projectSkillSteps(
      this._store.builtinSkills(),
      this._store.skillCatalog()?.packages ?? [],
      (role) => this._store.skillIdForFlowRole(role),
    ),
  );

  /**
   * Whether no built-in process role is loaded.
   *
   * @public
   * @readonly
   */
  public readonly rolesMissing = computed(() => this._store.builtinSkills().length === 0);

  /**
   * Whether no skill package is attached to any step.
   *
   * @public
   * @readonly
   */
  public readonly packagesMissing = computed(() =>
    this.steps().every((entry) => entry.packages.length === 0),
  );

  /**
   * Whether a Skills operation is running.
   *
   * @public
   * @readonly
   */
  public readonly skillsBusy = this._store.skillsBusy;

  /**
   * Whether the workspace configuration is being saved.
   *
   * @public
   * @readonly
   */
  public readonly configurationBusy = this._store.configurationBusy;

  private readonly _editInstructionsCommand: Command<BuiltinSkillDto['role']> = new Command(
    (role) =>
      this.openEditor<ISkillRoleInstructionsEditorRequest>({
        kind: 'skill-role-instructions',
        role,
      }),
  );

  private readonly _openSkillCommand: Command<string> = new Command((skillId) =>
    this.openEditor<ISkillEditorRequest>({ kind: 'skill-editor', mode: 'edit', skillId }),
  );

  private readonly _addSkillCommand: Command<SkillFlowRole> = new Command((role) =>
    this.openEditor<ISkillCatalogEditorRequest>({ kind: 'skill-catalog', role }),
  );

  private readonly _deactivateSkillCommand: Command<string> = new Command(
    (skillId) => void this._store.deactivateSkill(skillId),
  );

  // #endregion

  // #region Properties

  /**
   * Opens the instructions sheet of a process role.
   *
   * @public
   * @readonly
   */
  public get editInstructionsCommand(): Command<BuiltinSkillDto['role']> {
    return this._editInstructionsCommand;
  }

  /**
   * Opens the details sheet of an installed skill package.
   *
   * @public
   * @readonly
   */
  public get openSkillCommand(): Command<string> {
    return this._openSkillCommand;
  }

  /**
   * Opens `Add skills` for an optional AI step.
   *
   * @public
   * @readonly
   */
  public get addSkillCommand(): Command<SkillFlowRole> {
    return this._addSkillCommand;
  }

  /**
   * Detaches a skill package from its step; it stays installed.
   *
   * @public
   * @readonly
   */
  public get deactivateSkillCommand(): Command<string> {
    return this._deactivateSkillCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Loads the packages and roles when they are not loaded yet.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this._store.skillCatalog() && this._store.builtinSkills().length
      ? undefined
      : this._store.refreshSkills();
  }

  /**
   * Opens one of the section's sheets.
   *
   * @param request - The sheet request.
   * @private
   */
  private openEditor<
    TRequest extends
      ISkillCatalogEditorRequest | ISkillEditorRequest | ISkillRoleInstructionsEditorRequest,
  >(request: TRequest): void {
    void this._editors.open(request);
  }

  // #endregion
}
