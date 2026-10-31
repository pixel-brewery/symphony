// #region Imports

import { Inject, inject, Injectable, signal, type Signal } from '@angular/core';
import type { ISkillManifest, SkillFlowRole } from '@symphony/domain-skills';
import { type ISkillsOperations } from '@symphony/frontend-core';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type {
  BuiltinSkillDto,
  EditableSkillPackageDto,
  SkillPackageCatalogDto,
  SkillPackageDocumentDto,
} from '@symphony/ipc-contracts-skills';
import type { ISkillsAssignments } from '../ports/ISkillsAssignments';
import type { ISkillsClient } from '../ports/ISkillsClient';
import type { ISkillsContext } from '../ports/ISkillsContext';
import type { ISkillsSnapshotRefresh } from '../ports/ISkillsSnapshotRefresh';
import { SKILLS_ASSIGNMENTS } from '../ports/SkillsAssignmentsToken';
import { SKILLS_CLIENT } from '../ports/SkillsClientToken';
import { SKILLS_CONTEXT } from '../ports/SkillsContextToken';
import { SKILLS_SNAPSHOT_REFRESH } from '../ports/SkillsSnapshotRefreshToken';

// #endregion

/**
 * Owns skill catalog, package editing and role assignments independently of Core state.
 *
 * @public
 */
@Injectable()
export class SkillStore implements ISkillsOperations {
  // #region Fields

  private readonly _context: ISkillsContext;
  private readonly _assignments: ISkillsAssignments;
  private readonly _snapshot: ISkillsSnapshotRefresh;
  private readonly _client: ISkillsClient;
  private readonly _notifications: Pick<NotificationService, 'showSuccess' | 'showError'>;
  private readonly _skillCatalog = signal<SkillPackageCatalogDto | undefined>(undefined);
  private readonly _builtinSkills = signal<readonly BuiltinSkillDto[]>([]);
  private readonly _activeSkill = signal<SkillPackageDocumentDto | undefined>(undefined);
  private readonly _skillsBusy = signal(false);
  private readonly _publicSkillCatalog = this._skillCatalog.asReadonly();
  private readonly _publicBuiltinSkills = this._builtinSkills.asReadonly();
  private readonly _publicActiveSkill = this._activeSkill.asReadonly();
  private readonly _publicSkillsBusy = this._skillsBusy.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Constructs the skill store.
   *
   * @public
   */
  public constructor(
    @Inject(SKILLS_CONTEXT) context: ISkillsContext = inject(SKILLS_CONTEXT),
    @Inject(SKILLS_ASSIGNMENTS) assignments: ISkillsAssignments = inject(SKILLS_ASSIGNMENTS),
    @Inject(SKILLS_SNAPSHOT_REFRESH)
    snapshot: ISkillsSnapshotRefresh = inject(SKILLS_SNAPSHOT_REFRESH),
    @Inject(SKILLS_CLIENT) client: ISkillsClient = inject(SKILLS_CLIENT),
    @Inject(NotificationService)
    notifications: Pick<NotificationService, 'showSuccess' | 'showError'> = inject(
      NotificationService,
    ),
  ) {
    this._context = context;
    this._assignments = assignments;
    this._snapshot = snapshot;
    this._client = client;
    this._notifications = notifications;
  }

  // #endregion

  // #region Properties

  /**
   * The single feature-owned skill catalog.
   *
   * @public
   * @readonly
   */
  public get skillCatalog(): Signal<SkillPackageCatalogDto | undefined> {
    return this._publicSkillCatalog;
  }

  /**
   * The single feature-owned built-in role projection.
   *
   * @public
   * @readonly
   */
  public get builtinSkills(): Signal<readonly BuiltinSkillDto[]> {
    return this._publicBuiltinSkills;
  }

  /**
   * The package currently loaded for editing.
   *
   * @public
   * @readonly
   */
  public get activeSkill(): Signal<SkillPackageDocumentDto | undefined> {
    return this._publicActiveSkill;
  }

  /**
   * Whether a Skills operation is active.
   *
   * @public
   * @readonly
   */
  public get skillsBusy(): Signal<boolean> {
    return this._publicSkillsBusy;
  }

  /**
   * Whether the authoritative configuration owner is saving.
   *
   * @public
   * @readonly
   */
  public get configurationBusy(): Signal<boolean> {
    return this._context.configurationBusy;
  }

  // #endregion

  // #region Methods

  /**
   * Whether it is skill active.
   *
   * @param id - Id.
   * @public
   */
  public isSkillActive(id: string): boolean {
    return (
      this._context.activeTeam()?.assignments.some((assignment) => assignment.skillId === id) ??
      false
    );
  }

  /**
   * Returns the skill flow role.
   *
   * @param id - Id.
   * @public
   */
  public skillFlowRole(id: string): SkillFlowRole | undefined {
    return this._context.activeTeam()?.assignments.find((assignment) => assignment.skillId === id)
      ?.role;
  }

  /**
   * Returns the skill ID for flow role.
   *
   * @param role - Role.
   * @public
   */
  public skillIdForFlowRole(role: SkillFlowRole): string | undefined {
    return (
      this._context.activeTeam()?.assignments.find((assignment) => assignment.role === role)
        ?.skillId ?? undefined
    );
  }

  /**
   * Returns the skill for flow role.
   *
   * @param role - Role.
   * @public
   */
  public skillForFlowRole(role: SkillFlowRole): ISkillManifest | undefined {
    const skillId = this.skillIdForFlowRole(role);
    return skillId
      ? this._context.skillManifests().find((skill) => skill.id === skillId)
      : undefined;
  }

  /**
   * Returns the activate skill.
   *
   * @param id - Id.
   * @param role - Role.
   * @public
   */
  public async activateSkill(id: string, role: SkillFlowRole): Promise<boolean> {
    const team = this._context.activeTeam();
    if (!team) return false;
    if (team.assignments.some((assignment) => assignment.skillId === id))
      return this.assignSkillToFlow(id, role);
    return this.saveSkillFlowAssignment(id, role, true);
  }

  /**
   * Assigns the skill to flow.
   *
   * @param id - Id.
   * @param role - Role.
   * @public
   */
  public async assignSkillToFlow(id: string, role: SkillFlowRole): Promise<boolean> {
    const team = this._context.activeTeam();
    if (!team || !team.assignments.some((assignment) => assignment.skillId === id)) return false;
    if (this.skillFlowRole(id) === role) return true;
    return this.saveSkillFlowAssignment(id, role, false);
  }

  /**
   * Returns the deactivate skill.
   *
   * @param id - Id.
   * @public
   */
  public async deactivateSkill(id: string): Promise<boolean> {
    const team = this._context.activeTeam();
    if (!team) return false;
    const saved = await this._assignments.saveAssignments(
      team.id,
      team.assignments.map((assignment) =>
        assignment.skillId === id ? { ...assignment, skillId: null } : assignment,
      ),
    );
    if (saved) {
      this._notifications.showSuccess('Skill deactivated.');
      await this._snapshot.refresh();
    }
    return saved;
  }

  /**
   * Refreshes the skills.
   *
   * @public
   */
  public async refreshSkills(): Promise<void> {
    this._skillsBusy.set(true);
    try {
      const [catalog, builtin] = await Promise.all([
        this._client.request('skills.list', {}),
        this._client.request('skills.builtin.list', {}),
      ]);
      this._skillCatalog.set(catalog);
      this._builtinSkills.set(builtin.skills);
    } catch (cause) {
      this.showError(cause, 'Unable to load skills.');
    } finally {
      this._skillsBusy.set(false);
    }
  }

  /**
   * Stores the installation's additional instructions for one built-in role.
   *
   * @param role - Role.
   * @param additionalInstructions - Additional instructions.
   * @public
   */
  public async customizeBuiltinSkill(
    role: BuiltinSkillDto['role'],
    additionalInstructions: string,
  ): Promise<void> {
    this._skillsBusy.set(true);
    try {
      await this._assignments.customizeBuiltinSkill(role, additionalInstructions);
      this._builtinSkills.update((skills) =>
        skills.map((skill) => (skill.role === role ? { ...skill, additionalInstructions } : skill)),
      );
      this._notifications.showSuccess('Instructions saved.', 'The role uses them on its next run.');
    } catch (cause) {
      this.showError(cause, 'Unable to save the additional instructions.');
    } finally {
      this._skillsBusy.set(false);
    }
  }

  /**
   * Loads the skill.
   *
   * @param id - Id.
   * @public
   */
  public async loadSkill(id: string): Promise<boolean> {
    this._skillsBusy.set(true);
    try {
      this._activeSkill.set(await this._client.request('skills.get', { id }));
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to open skill.');
      return false;
    } finally {
      this._skillsBusy.set(false);
    }
  }

  /**
   * Saves the skill.
   *
   * @param skill - Skill.
   * @public
   */
  public async saveSkill(skill: EditableSkillPackageDto): Promise<boolean> {
    this._skillsBusy.set(true);
    try {
      this._activeSkill.set(await this._client.request('skills.save', { skill }));
      this._notifications.showSuccess(
        'Skill saved.',
        'The portable package is available in Symphony.',
      );
      await this.refreshSkills();
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to save skill.');
      return false;
    } finally {
      this._skillsBusy.set(false);
    }
  }

  /**
   * Imports the skill.
   *
   * @param sourcePath - Source path.
   * @public
   */
  public async importSkill(sourcePath: string): Promise<boolean> {
    this._skillsBusy.set(true);
    try {
      this._activeSkill.set(await this._client.request('skills.import', { sourcePath }));
      this._notifications.showSuccess(
        'Skill imported.',
        'The portable package is available in Symphony.',
      );
      await this.refreshSkills();
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to import skill.');
      return false;
    } finally {
      this._skillsBusy.set(false);
    }
  }

  /**
   * Exports the skill.
   *
   * @param id - Id.
   * @param destinationRoot - Destination root.
   * @public
   */
  public async exportSkill(id: string, destinationRoot: string): Promise<boolean> {
    return this.runSkillOperation('skills.export', { id, destinationRoot });
  }

  /**
   * Deletes the skill.
   *
   * @param name - Name.
   * @public
   */
  public async deleteSkill(name: string): Promise<boolean> {
    const deleted = await this.runSkillOperation('skills.delete', { name });
    if (deleted) {
      this._activeSkill.set(undefined);
      await this.refreshSkills();
    }
    return deleted;
  }

  private async saveSkillFlowAssignment(
    id: string,
    role: SkillFlowRole,
    activating: boolean,
  ): Promise<boolean> {
    const team = this._context.activeTeam();
    if (!team) return false;
    const previousSkillId = team.assignments.find(
      (assignment) => assignment.role === role,
    )?.skillId;
    const saved = await this._assignments.saveAssignments(
      team.id,
      team.assignments.map((assignment) =>
        assignment.role === role
          ? { ...assignment, skillId: id }
          : assignment.skillId === id
            ? { ...assignment, skillId: null }
            : assignment,
      ),
    );
    if (saved) {
      this._notifications.showSuccess(
        previousSkillId && previousSkillId !== id
          ? 'Skill assigned to the selected flow step. The previous skill was deactivated.'
          : activating
            ? 'Skill activated and assigned to the selected flow step.'
            : 'Skill flow assignment updated.',
      );
      await this._snapshot.refresh();
    }
    return saved;
  }

  private async runSkillOperation<M extends 'skills.export' | 'skills.delete'>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<boolean> {
    this._skillsBusy.set(true);
    try {
      const result = await this._client.request(method, payload);
      this._notifications.showSuccess(result.message);
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to update skill.');
      return false;
    } finally {
      this._skillsBusy.set(false);
    }
  }

  /**
   * Reports a failure through the existing secret-safe notification formatter.
   *
   * @param cause - Operation failure retained for safe formatting.
   * @param fallback - Existing user-facing operation context.
   * @private
   */
  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}
