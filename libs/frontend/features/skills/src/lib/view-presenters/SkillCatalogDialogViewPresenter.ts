// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { DRAWER_REF, type IDrawerRef } from '@pixel-brewery/mosaik-elements-angular';
import type { SkillFlowRole } from '@symphony/domain-skills';
import { Hydratable, ViewPresenter, Command } from '@symphony/frontend-core';
import { skillFlowOptions, skillFlowRoleFromEvent } from './skillFlowPresentation';
import { SkillStore } from '../catalog/SkillStore';

// #endregion

@Injectable()
export class SkillCatalogDialogViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  /**
   * The store.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(SkillStore);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<undefined>;

  /**
   * The search query.
   *
   * @public
   * @readonly
   */
  public readonly searchQuery = signal('');

  /**
   * The flow options.
   *
   * @public
   * @readonly
   */
  public readonly flowOptions = skillFlowOptions;
  private readonly _selectedRoles = signal<Readonly<Record<string, SkillFlowRole | undefined>>>({});

  /**
   * The packages.
   *
   * @public
   * @readonly
   */
  public readonly packages = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return (this.store.skillCatalog()?.packages ?? []).filter((skill) => {
      if (this.store.isSkillActive(skill.id)) return false;
      return (
        !query ||
        [skill.name, skill.displayName, skill.description, skill.source]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query)
      );
    });
  });

  private readonly _searchCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteSearchCommand(event),
  );
  private readonly _selectedRole = computed(
    () => (skillId: string) => this.resolveSelectedRole(skillId),
  );

  private readonly _selectRoleCommand: Command<readonly [skillId: string, event: unknown]> =
    new Command((parameters) => void this.onExecuteSelectRoleCommand(...parameters));
  private readonly _replacementName = computed(
    () => (skillId: string) => this.resolveReplacementName(skillId),
  );

  private readonly _activateCommand: Command<string> = new Command(
    (skillId) => void this.onExecuteActivateCommand(skillId),
  );
  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  // #endregion

  // #region Properties

  /**
   * The search command.
   *
   * @public
   * @readonly
   */
  public get searchCommand(): Command<unknown> {
    return this._searchCommand;
  }
  /**
   * The selectedRole projection.
   *
   * @public
   * @readonly
   */
  public get selectedRole() {
    return this._selectedRole;
  }
  /**
   * The selectRole command.
   *
   * @public
   * @readonly
   */
  public get selectRoleCommand(): Command<readonly [skillId: string, event: unknown]> {
    return this._selectRoleCommand;
  }
  /**
   * The replacementName projection.
   *
   * @public
   * @readonly
   */
  public get replacementName() {
    return this._replacementName;
  }
  /**
   * The activate command.
   *
   * @public
   * @readonly
   */
  public get activateCommand(): Command<string> {
    return this._activateCommand;
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
  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this.store.skillCatalog() ? undefined : this.store.refreshSkills();
  }

  /**
   * Returns the search.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteSearchCommand(event: unknown): void {
    const detail = event as { query?: unknown; target?: HTMLElement & { value?: string } } | null;
    this.searchQuery.set(
      typeof detail?.query === 'string'
        ? detail.query
        : typeof detail?.target?.value === 'string'
          ? detail.target.value
          : '',
    );
  }

  /**
   * Returns the selected role.
   *
   * @param skillId - Skill id.
   * @private
   */
  private resolveSelectedRole(skillId: string): SkillFlowRole | undefined {
    return this._selectedRoles()[skillId];
  }

  /**
   * Selects the role.
   *
   * @param skillId - Skill id.
   * @param event - Event.
   * @private
   */
  private onExecuteSelectRoleCommand(skillId: string, event: unknown): void {
    const role = skillFlowRoleFromEvent(event);
    if (!role) return;
    this._selectedRoles.update((roles) => ({ ...roles, [skillId]: role }));
  }

  /**
   * Returns the replacement name.
   *
   * @param skillId - Skill id.
   * @private
   */
  private resolveReplacementName(skillId: string): string | undefined {
    const role = this.resolveSelectedRole(skillId);
    if (!role) return undefined;
    const assignedId = this.store.skillIdForFlowRole(role);
    if (!assignedId || assignedId === skillId) return undefined;
    return this.store.skillCatalog()?.packages.find((skill) => skill.id === assignedId)
      ?.displayName;
  }

  /**
   * Returns the activate.
   *
   * @param skillId - Skill id.
   * @private
   */
  private onExecuteActivateCommand(skillId: string): void {
    const role = this.resolveSelectedRole(skillId);
    if (role) void this.store.activateSkill(skillId, role);
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._drawerRef.close();
  }

  // #endregion
}
