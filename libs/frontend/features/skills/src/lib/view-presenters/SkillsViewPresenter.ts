// #region Imports

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DrawerService, type IDrawerRef } from '@pixel-brewery/mosaik-elements-angular';
import type { SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';
import { Command } from '@symphony/frontend-core';
import { SkillCatalogDialogView } from '../views/dialogs/SkillCatalogDialogView';
import { SkillEditorDrawerView } from '../views/dialogs/SkillEditorDrawerView';
import { type SkillEditorDrawerData } from '../views/dialogs/SkillEditorDrawerData';
import { skillFlowOption, skillFlowOptions, skillFlowRoleFromEvent } from './skillFlowPresentation';
import { SkillStore } from '../catalog/SkillStore';

// #endregion

type SkillSummary = SkillPackageCatalogDto['packages'][number];

@Injectable()
export class SkillsViewPresenter {
  // #region Fields

  /**
   * The flow options.
   *
   * @public
   * @readonly
   */
  public readonly flowOptions = skillFlowOptions;

  /**
   * The store.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(SkillStore);
  private readonly _drawerService = inject(DrawerService);
  private readonly _route = inject(ActivatedRoute);

  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });
  private _catalogDrawer?: IDrawerRef<undefined>;
  private _editorDrawer?: IDrawerRef<SkillEditorDrawerData>;

  /**
   * The search query.
   *
   * @public
   * @readonly
   */
  public readonly searchQuery = signal('');

  /**
   * The active skills.
   *
   * @public
   * @readonly
   */
  public readonly activeSkills = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return (this.store.skillCatalog()?.packages ?? []).filter(
      (skill) =>
        this.store.isSkillActive(skill.id) &&
        (!query ||
          [skill.name, skill.displayName, skill.description, skill.source]
            .join(' ')
            .toLocaleLowerCase()
            .includes(query)),
    );
  });

  private readonly _openCatalogCommand: Command<void> = new Command(
    () => void this.onExecuteOpenCatalogCommand(),
  );
  private readonly _newSkillCommand: Command<void> = new Command(
    () => void this.onExecuteNewSkillCommand(),
  );
  private readonly _openSkillCommand: Command<SkillSummary> = new Command(
    (skill) => void this.onExecuteOpenSkillCommand(skill),
  );
  private readonly _flowOption = computed(
    () => (skillId: string) => this.resolveFlowOption(skillId),
  );

  private readonly _assignFlowCommand: Command<readonly [skillId: string, event: unknown]> =
    new Command((parameters) => void this.onExecuteAssignFlowCommand(...parameters));
  // #endregion

  // #region Ctor

  public constructor() {
    effect(() => this.searchQuery.set(this._queryParamMap().get('q') ?? ''));
  }

  // #endregion

  // #region Properties

  /**
   * The openCatalog command.
   *
   * @public
   * @readonly
   */
  public get openCatalogCommand(): Command<void> {
    return this._openCatalogCommand;
  }
  /**
   * The newSkill command.
   *
   * @public
   * @readonly
   */
  public get newSkillCommand(): Command<void> {
    return this._newSkillCommand;
  }
  /**
   * The openSkill command.
   *
   * @public
   * @readonly
   */
  public get openSkillCommand(): Command<SkillSummary> {
    return this._openSkillCommand;
  }
  /**
   * The flowOption projection.
   *
   * @public
   * @readonly
   */
  public get flowOption() {
    return this._flowOption;
  }
  /**
   * The assignFlow command.
   *
   * @public
   * @readonly
   */
  public get assignFlowCommand(): Command<readonly [skillId: string, event: unknown]> {
    return this._assignFlowCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Opens the catalog.
   *
   * @private
   */
  private onExecuteOpenCatalogCommand(): void {
    if (this._catalogDrawer && this._drawerService.isShown(this._catalogDrawer)) {
      this._catalogDrawer.requestAttention();
      return;
    }
    const drawer = this._drawerService.show<undefined>(SkillCatalogDialogView);
    this._catalogDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._catalogDrawer === drawer) this._catalogDrawer = undefined;
    });
  }

  /**
   * Returns the new skill.
   *
   * @private
   */
  private onExecuteNewSkillCommand(): void {
    this.openEditor({ mode: 'create' });
  }

  /**
   * Opens the skill.
   *
   * @param skill - Skill.
   * @private
   */
  private onExecuteOpenSkillCommand(skill: SkillSummary): void {
    this.openEditor({ mode: 'edit', skillId: skill.id });
  }

  /**
   * Returns the flow option.
   *
   * @param skillId - Skill id.
   * @private
   */
  private resolveFlowOption(skillId: string) {
    return skillFlowOption(this.store.skillFlowRole(skillId));
  }

  /**
   * Assigns the flow.
   *
   * @param skillId - Skill id.
   * @param event - Event.
   * @private
   */
  private onExecuteAssignFlowCommand(skillId: string, event: unknown): void {
    const role = skillFlowRoleFromEvent(event);
    if (role) void this.store.assignSkillToFlow(skillId, role);
  }

  private openEditor(data: SkillEditorDrawerData): void {
    if (this._editorDrawer && this._drawerService.isShown(this._editorDrawer)) {
      this._editorDrawer.requestAttention();
      return;
    }
    const drawer = this._drawerService.show<SkillEditorDrawerData>(SkillEditorDrawerView, { data });
    this._editorDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._editorDrawer === drawer) this._editorDrawer = undefined;
    });
  }

  // #endregion
}
