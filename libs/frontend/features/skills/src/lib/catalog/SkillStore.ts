// #region Imports

import { Inject, inject, Injectable, signal, type Signal } from '@angular/core';
import type { ISkillManifest, SkillFlowRole } from '@symphony/domain-skills';
import { type ISkillsOperations } from '@symphony/frontend-core';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import { deliveryFlowSteps } from '@symphony/frontend-ui';
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
  private readonly _notifications: Pick<
    NotificationService,
    'showSuccess' | 'showError' | 'showWarning'
  >;
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
    notifications: Pick<NotificationService, 'showSuccess' | 'showError' | 'showWarning'> = inject(
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
   * Whether any workspace's AI team runs the package on a step.
   *
   * @param id - Package id.
   * @public
   */
  public isSkillActive(id: string): boolean {
    return this.assignmentsOfAllTeams().some((assignment) => assignment.skillId === id);
  }

  /**
   * The step the package runs on, as the first workspace that runs it assigns it.
   *
   * @param id - Package id.
   * @public
   */
  public skillFlowRole(id: string): SkillFlowRole | undefined {
    return this.assignmentsOfAllTeams().find((assignment) => assignment.skillId === id)?.role;
  }

  /**
   * The package attached to a step, as the first workspace with a package on that step assigns it.
   *
   * @param role - Skill-flow role of the step.
   * @public
   */
  public skillIdForFlowRole(role: SkillFlowRole): string | undefined {
    return (
      this.assignmentsOfAllTeams().find(
        (assignment) => assignment.role === role && assignment.skillId,
      )?.skillId ?? undefined
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
   * Attaches a package to a step in every workspace whose AI team has someone on that step, and
   * detaches it from any other step. Without anyone on the step nothing changes, and a warning
   * says so instead of a success.
   *
   * @param id - Package id.
   * @param role - Skill-flow role of the step.
   * @returns Whether the assignment changed or already held.
   * @public
   */
  public async activateSkill(id: string, role: SkillFlowRole): Promise<boolean> {
    return this.saveSkillFlowAssignment(id, role, !this.isSkillActive(id));
  }

  /**
   * Moves an attached package to another step in every workspace whose AI team has someone on it.
   *
   * @param id - Package id.
   * @param role - Skill-flow role of the new step.
   * @returns Whether the assignment changed or already held.
   * @public
   */
  public async assignSkillToFlow(id: string, role: SkillFlowRole): Promise<boolean> {
    if (!this.isSkillActive(id)) return false;
    return this.saveSkillFlowAssignment(id, role, false);
  }

  /**
   * Detaches a package from every step of every workspace's AI team.
   *
   * @param id - Package id.
   * @returns Whether the package is detached afterwards.
   * @public
   */
  public async deactivateSkill(id: string): Promise<boolean> {
    const changes = this._context.workspaceTeams().flatMap(({ team }) =>
      team.assignments.some((assignment) => assignment.skillId === id)
        ? [
            {
              teamId: team.id,
              assignments: team.assignments.map((assignment) =>
                assignment.skillId === id ? { ...assignment, skillId: null } : assignment,
              ),
            },
          ]
        : [],
    );
    if (!changes.length) return true;
    const saved = await this._assignments.saveAssignments(changes);
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
    const teams = this._context.workspaceTeams();
    const staffed = teams.filter(({ team }) =>
      team.assignments.some((assignment) => assignment.role === role),
    );
    const step = deliveryFlowSteps.find((candidate) => candidate.skillFlowRoles.includes(role));
    const stepLabel = step?.label ?? role;
    if (!staffed.length) {
      this._notifications.showWarning(
        `Nobody works on ${stepLabel}`,
        teams.length
          ? `No AI team has someone on ${stepLabel}. Assign an agent to it under AI team, then attach the skill.`
          : 'Add a workspace with an AI team first, then attach the skill.',
      );
      return false;
    }
    const staffedTeamIds = new Set(staffed.map(({ team }) => team.id));
    let replaced = false;
    const changes = teams.flatMap(({ team }) => {
      let changed = false;
      const assignments = team.assignments.map((assignment) => {
        if (assignment.role === role && staffedTeamIds.has(team.id)) {
          if (assignment.skillId === id) return assignment;
          if (assignment.skillId) replaced = true;
          changed = true;
          return { ...assignment, skillId: id };
        }
        if (assignment.skillId !== id) return assignment;
        changed = true;
        return { ...assignment, skillId: null };
      });
      return changed ? [{ teamId: team.id, assignments }] : [];
    });
    if (!changes.length) return true;
    const saved = await this._assignments.saveAssignments(changes);
    if (saved) {
      const skipped = teams
        .filter(({ team }) => !staffedTeamIds.has(team.id))
        .map(({ workspaceName }) => workspaceName);
      this._notifications.showSuccess(
        replaced
          ? 'Skill assigned to the selected flow step. The previous skill was deactivated.'
          : activating
            ? 'Skill activated and assigned to the selected flow step.'
            : 'Skill flow assignment updated.',
        skipped.length
          ? `Not attached in ${skipped.join(', ')}: nobody works on ${stepLabel} there.`
          : '',
      );
      await this._snapshot.refresh();
    }
    return saved;
  }

  /** Every responsibility of every workspace's AI team, in workspace order. */
  private assignmentsOfAllTeams() {
    return this._context.workspaceTeams().flatMap(({ team }) => team.assignments);
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
