// #region Imports

import type { Signal } from '@angular/core';
import type { ISkillManifest } from '@symphony/domain-skills';
import type { ISkillsWorkspaceTeam } from './ISkillsWorkspaceTeam';

// #endregion

/**
 * Projects only the workspace teams, manifests and configuration activity needed by Skills.
 *
 * @public
 */
export interface ISkillsContext {
  /**
   * The AI team of every enabled workspace in workspace order, each team once. Skills is a global
   * section: package assignments apply to every one of them that has the step.
   *
   * @public
   * @readonly
   */
  readonly workspaceTeams: Signal<readonly ISkillsWorkspaceTeam[]>;
  /**
   * The manifests in the current authoritative snapshot.
   *
   * @public
   * @readonly
   */
  readonly skillManifests: Signal<readonly ISkillManifest[]>;
  /**
   * Whether an aggregate configuration operation is active.
   *
   * @public
   * @readonly
   */
  readonly configurationBusy: Signal<boolean>;
}
