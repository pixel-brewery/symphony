// #region Imports

import { inject, Injectable, signal, computed } from '@angular/core';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { Hydratable, ViewPresenter, Command } from '@symphony/frontend-core';
import type {
  EditableSkillPackageDto,
  SkillPackageCatalogDto,
  SkillPackageDocumentDto,
} from '@symphony/ipc-contracts-skills';
import type { SkillEditorDrawerData } from '../views/dialogs/SkillEditorDrawerData';
import { SkillStore } from '../catalog/SkillStore';

// #endregion

type SkillSummary = SkillPackageCatalogDto['packages'][number];
type MutableSkillFile = EditableSkillPackageDto['files'][number];
interface ISkillDraft extends Omit<EditableSkillPackageDto, 'files'> {
  files: MutableSkillFile[];
}

@Injectable()
export class SkillEditorDrawerViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  /**
   * The store.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(SkillStore);

  /**
   * The data.
   *
   * @public
   * @readonly
   */
  public readonly data = inject<SkillEditorDrawerData>(DRAWER_REF_DATA);

  /**
   * The export path.
   *
   * @public
   * @readonly
   */
  public readonly exportPath = signal('');

  /**
   * The selected.
   *
   * @public
   */
  public selected?: SkillSummary;

  /**
   * The draft.
   *
   * @public
   */
  public draft: ISkillDraft = {
    name: 'new-skill',
    description: 'Describe exactly when this skill should be used.',
    instructions: '# Instructions\n\nExplain the workflow in imperative steps.',
    openaiYaml: [
      'interface:',
      '  display_name: New skill',
      '  short_description: Reusable workflow',
      'policy:',
      '  allow_implicit_invocation: true',
    ].join('\n'),
    files: [],
  };
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<SkillEditorDrawerData>;

  private readonly _canEdit = computed(() => this.resolveCanEdit());

  private readonly _saveCommand: Command<void> = new Command(
    () => void this.onExecuteSaveCommand(),
  );
  private readonly _installSharedCommand: Command<void> = new Command(
    () => void this.onExecuteInstallSharedCommand(),
  );
  private readonly _addResourceCommand: Command<void> = new Command(
    () => void this.onExecuteAddResourceCommand(),
  );
  private readonly _removeResourceCommand: Command<number> = new Command(
    (index) => void this.onExecuteRemoveResourceCommand(index),
  );
  private readonly _chooseExportDirectoryCommand: Command<void> = new Command(
    () => void this.onExecuteChooseExportDirectoryCommand(),
  );
  private readonly _exportSkillCommand: Command<void> = new Command(
    () => void this.onExecuteExportSkillCommand(),
  );
  private readonly _deleteSkillCommand: Command<void> = new Command(
    () => void this.onExecuteDeleteSkillCommand(),
  );
  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  private readonly _eventText = computed(() => (event: unknown) => this.resolveEventText(event));

  // #endregion

  // #region Properties

  /**
   * The canEdit projection.
   *
   * @public
   * @readonly
   */
  public get canEdit() {
    return this._canEdit;
  }
  /**
   * The save command.
   *
   * @public
   * @readonly
   */
  public get saveCommand(): Command<void> {
    return this._saveCommand;
  }
  /**
   * The installShared command.
   *
   * @public
   * @readonly
   */
  public get installSharedCommand(): Command<void> {
    return this._installSharedCommand;
  }
  /**
   * The addResource command.
   *
   * @public
   * @readonly
   */
  public get addResourceCommand(): Command<void> {
    return this._addResourceCommand;
  }
  /**
   * The removeResource command.
   *
   * @public
   * @readonly
   */
  public get removeResourceCommand(): Command<number> {
    return this._removeResourceCommand;
  }
  /**
   * The chooseExportDirectory command.
   *
   * @public
   * @readonly
   */
  public get chooseExportDirectoryCommand(): Command<void> {
    return this._chooseExportDirectoryCommand;
  }
  /**
   * The exportSkill command.
   *
   * @public
   * @readonly
   */
  public get exportSkillCommand(): Command<void> {
    return this._exportSkillCommand;
  }
  /**
   * The deleteSkill command.
   *
   * @public
   * @readonly
   */
  public get deleteSkillCommand(): Command<void> {
    return this._deleteSkillCommand;
  }
  /**
   * The close command.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }
  /**
   * The eventText projection.
   *
   * @public
   * @readonly
   */
  public get eventText() {
    return this._eventText;
  }
  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this.data.mode === 'edit' ? this.load(this.data.skillId) : undefined;
  }

  /**
   * Whether it can edit.
   *
   * @private
   */
  private resolveCanEdit(): boolean {
    return !this.selected || this.selected.editable;
  }

  /**
   * Saves.
   *
   * @private
   */
  private async onExecuteSaveCommand(): Promise<void> {
    const saved = await this.store.saveSkill({
      ...this.draft,
      description: this.draft.description.trim(),
      instructions: this.draft.instructions.trim(),
      openaiYaml: this.draft.originalName
        ? this.draft.openaiYaml
        : this.draft.openaiYaml.replace(
            /(^|\n)(\s*display_name:\s*)New skill(?=\r?\n|$)/,
            `$1$2${this.draft.name}`,
          ),
      files: this.draft.files.map((file) => ({ ...file, size: this.byteSize(file) })),
    });
    if (saved) this._drawerRef.close();
  }

  /**
   * Installs the shared.
   *
   * @private
   */
  private async onExecuteInstallSharedCommand(): Promise<void> {
    if (!this.selected || !(await this.store.importSkill(this.selected.location))) return;
    this._drawerRef.close();
  }

  /**
   * Adds the resource.
   *
   * @private
   */
  private onExecuteAddResourceCommand(): void {
    let index = this.draft.files.length + 1;
    let path = `references/reference-${index}.md`;
    while (this.draft.files.some((file) => file.path === path)) {
      index += 1;
      path = `references/reference-${index}.md`;
    }
    this.draft.files.push({
      path,
      kind: 'reference',
      encoding: 'utf8',
      content: '# Reference\n',
      size: 12,
    });
  }

  /**
   * Removes the resource.
   *
   * @param index - Index.
   * @private
   */
  private onExecuteRemoveResourceCommand(index: number): void {
    this.draft.files.splice(index, 1);
  }

  /**
   * Chooses the export directory.
   *
   * @private
   */
  private async onExecuteChooseExportDirectoryCommand(): Promise<void> {
    const result = await window.orchestration.selectPath({
      kind: 'directory',
      title: 'Choose skill export destination',
      defaultPath: this.exportPath().trim() || undefined,
    });
    if (!result.canceled && result.paths[0]) this.exportPath.set(result.paths[0]);
  }

  /**
   * Exports the skill.
   *
   * @private
   */
  private async onExecuteExportSkillCommand(): Promise<void> {
    if (this.selected && this.exportPath().trim()) {
      await this.store.exportSkill(this.selected.id, this.exportPath());
    }
  }

  /**
   * Deletes the skill.
   *
   * @private
   */
  private async onExecuteDeleteSkillCommand(): Promise<void> {
    if (!this.draft.originalName || !window.confirm(`Move "${this.draft.originalName}" to trash?`))
      return;
    if (await this.store.deleteSkill(this.draft.originalName)) this._drawerRef.close();
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._drawerRef.close();
  }

  /**
   * Returns the event text.
   *
   * @param event - Event.
   * @private
   */
  private resolveEventText(event: unknown): string {
    return String(this.eventValue(event) ?? '');
  }

  private async load(skillId: string): Promise<void> {
    this.selected = this.store.skillCatalog()?.packages.find((skill) => skill.id === skillId);
    if (await this.store.loadSkill(skillId)) {
      const document = this.store.activeSkill();
      if (document) this.draft = this.toDraft(document);
    }
  }

  private toDraft(document: SkillPackageDocumentDto): ISkillDraft {
    return {
      originalName: document.name,
      name: document.name,
      description: document.description,
      instructions: document.instructions,
      openaiYaml: document.openaiYaml,
      files: document.files.map((file) => ({ ...file })),
    };
  }

  private byteSize(file: MutableSkillFile): number {
    return file.encoding === 'base64'
      ? Math.floor((file.content.length * 3) / 4)
      : new TextEncoder().encode(file.content).byteLength;
  }

  private eventValue(event: unknown): unknown {
    if (typeof event === 'string' || typeof event === 'number' || typeof event === 'boolean') {
      return event;
    }
    const record =
      typeof event === 'object' && event !== null ? (event as Record<string, unknown>) : {};
    const detail =
      typeof record['detail'] === 'object' && record['detail'] !== null
        ? (record['detail'] as Record<string, unknown>)
        : {};
    const target =
      typeof record['target'] === 'object' && record['target'] !== null
        ? (record['target'] as Record<string, unknown>)
        : {};
    // A selection reports the selected item as `newValue`.
    const newValue = record['newValue'] ?? detail['newValue'];
    const selection =
      typeof newValue === 'object' && newValue !== null
        ? (newValue as Record<string, unknown>)['value']
        : undefined;
    return record['value'] ?? detail['value'] ?? selection ?? target['value'];
  }

  // #endregion
}
