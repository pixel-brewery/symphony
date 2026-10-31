// #region Imports
import { computed, Inject, inject, Injectable, signal } from '@angular/core';
import { Command } from '@symphony/frontend-core';
import type { SettingsHostSession } from '@symphony/frontend-setting';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';
import { SkillStore } from '../catalog/SkillStore';
// #endregion
/**
 * Retains role instruction drafts for one Settings host session without copying Skills state.
 *
 * @public
 */
@Injectable()
export class SkillsSettingsDrafts {
  // #region Fields
  private readonly _store: Pick<
    SkillStore,
    'builtinSkills' | 'skillsBusy' | 'customizeBuiltinSkill'
  >;
  private _session: SettingsHostSession | undefined;
  private readonly _skillDraftRevisions = new Map<BuiltinSkillDto['role'], number>();
  /**
   * The builtin skills.
   *
   * @public
   * @readonly
   */
  public readonly builtinSkills = computed(() => this._store.builtinSkills());

  /** Draft instruction text per role, keyed by role while the card is being edited. */
  private readonly _skillInstructionDrafts = signal<Readonly<Record<string, string>>>({});

  /** Which instruction text a role card shows; additions are the editable half. */
  private readonly _skillTabs = signal<Readonly<Record<string, 'shipped' | 'additional'>>>({});

  private readonly _skillTab = computed(
    () => (role: BuiltinSkillDto['role']) => this.resolveSkillTab(role),
  );

  private readonly _selectSkillTabCommand: Command<
    readonly [role: BuiltinSkillDto['role'], tab: 'shipped' | 'additional']
  > = new Command((parameters) => void this.onExecuteSelectSkillTabCommand(...parameters));

  private readonly _skillInstructions = computed(
    () => (role: BuiltinSkillDto['role']) => this.resolveSkillInstructions(role),
  );

  private readonly _updateSkillInstructionsCommand: Command<
    readonly [role: BuiltinSkillDto['role'], event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdateSkillInstructionsCommand(...parameters));

  private readonly _saveSkillInstructionsCommand: Command<BuiltinSkillDto['role']> = new Command(
    (role) => void this.onExecuteSaveSkillInstructionsCommand(role),
  );

  private readonly _resetSkillInstructionsCommand: Command<BuiltinSkillDto['role']> = new Command(
    (role) => void this.onExecuteResetSkillInstructionsCommand(role),
  );
  // #endregion
  // #region Ctor
  /** Connects the single feature-owned Skills writer and role projection. @public */
  public constructor(
    @Inject(SkillStore)
    store: Pick<SkillStore, 'builtinSkills' | 'skillsBusy' | 'customizeBuiltinSkill'> = inject(
      SkillStore,
    ),
  ) {
    this._store = store;
  }
  // #endregion
  // #region Properties
  /** The existing Skills operation lifecycle. @public @readonly */
  public get skillsBusy() {
    return this._store.skillsBusy;
  }
  /**
   * The skillTab projection.
   *
   * @public
   * @readonly
   */
  public get skillTab() {
    return this._skillTab;
  }

  /**
   * The selectSkillTab command.
   *
   * @public
   * @readonly
   */
  public get selectSkillTabCommand(): Command<
    readonly [role: BuiltinSkillDto['role'], tab: 'shipped' | 'additional']
  > {
    return this._selectSkillTabCommand;
  }

  /**
   * The skillInstructions projection.
   *
   * @public
   * @readonly
   */
  public get skillInstructions() {
    return this._skillInstructions;
  }

  /**
   * The updateSkillInstructions command.
   *
   * @public
   * @readonly
   */
  public get updateSkillInstructionsCommand(): Command<
    readonly [role: BuiltinSkillDto['role'], event: unknown]
  > {
    return this._updateSkillInstructionsCommand;
  }

  /**
   * The saveSkillInstructions command.
   *
   * @public
   * @readonly
   */
  public get saveSkillInstructionsCommand(): Command<BuiltinSkillDto['role']> {
    return this._saveSkillInstructionsCommand;
  }

  /**
   * The resetSkillInstructions command.
   *
   * @public
   * @readonly
   */
  public get resetSkillInstructionsCommand(): Command<BuiltinSkillDto['role']> {
    return this._resetSkillInstructionsCommand;
  }
  // #endregion
  // #region Methods
  /** Retains edits across section switches and resets them only for a new Settings route. @public */
  public beginSession(session: SettingsHostSession): void {
    if (this._session === session) return;
    this._session = session;
    this._skillDraftRevisions.clear();
    this._skillInstructionDrafts.set({});
    this._skillTabs.set({});
  }
  /**
   * Returns the skill tab.
   *
   * @param role - Role.
   * @private
   */
  private resolveSkillTab(role: BuiltinSkillDto['role']): 'shipped' | 'additional' {
    return this._skillTabs()[role] ?? 'additional';
  }

  /**
   * Selects the skill tab.
   *
   * @param role - Role.
   * @param tab - Tab.
   * @private
   */
  private onExecuteSelectSkillTabCommand(
    role: BuiltinSkillDto['role'],
    tab: 'shipped' | 'additional',
  ): void {
    this._skillTabs.update((tabs) => ({ ...tabs, [role]: tab }));
  }

  /**
   * Returns the skill instructions.
   *
   * @param role - Role.
   * @private
   */
  private resolveSkillInstructions(role: BuiltinSkillDto['role']): string {
    const draft = this._skillInstructionDrafts()[role];
    if (draft !== undefined) return draft;
    return this.builtinSkills().find((skill) => skill.role === role)?.additionalInstructions ?? '';
  }

  /**
   * Updates the skill instructions.
   *
   * @param role - Role.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateSkillInstructionsCommand(
    role: BuiltinSkillDto['role'],
    event: unknown,
  ): void {
    const detail = (event as { detail?: { value?: unknown } } | undefined)?.detail?.value;
    const target = (event as { target?: { value?: unknown } } | undefined)?.target?.value;
    const value = typeof detail === 'string' ? detail : typeof target === 'string' ? target : '';
    this._skillDraftRevisions.set(role, (this._skillDraftRevisions.get(role) ?? 0) + 1);
    this._skillInstructionDrafts.update((drafts) => ({ ...drafts, [role]: value }));
  }

  /**
   * Saves the skill instructions.
   *
   * @param role - Role.
   * @private
   */
  private async onExecuteSaveSkillInstructionsCommand(
    role: BuiltinSkillDto['role'],
  ): Promise<void> {
    return this.customizeSkill(role, this.resolveSkillInstructions(role));
  }

  /**
   * Resets the skill instructions.
   *
   * @param role - Role.
   * @private
   */
  private async onExecuteResetSkillInstructionsCommand(
    role: BuiltinSkillDto['role'],
  ): Promise<void> {
    return this.customizeSkill(role, '');
  }

  private async customizeSkill(role: BuiltinSkillDto['role'], instructions: string): Promise<void> {
    const session = this._session;
    const revision = this._skillDraftRevisions.get(role) ?? 0;
    await this._store.customizeBuiltinSkill(role, instructions);
    if (this._session === session && (this._skillDraftRevisions.get(role) ?? 0) === revision) {
      this.clearSkillDraft(role);
    }
  }

  private clearSkillDraft(role: BuiltinSkillDto['role']): void {
    this._skillDraftRevisions.set(role, (this._skillDraftRevisions.get(role) ?? 0) + 1);
    this._skillInstructionDrafts.update((drafts) => {
      const { [role]: removed, ...remaining } = drafts;
      void removed;
      return remaining;
    });
  }
  // #endregion
}
