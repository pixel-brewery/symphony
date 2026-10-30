// #region Imports

import type { Signal } from '@angular/core';
import type { IAgentTeam } from '@symphony/domain-team';
import type { ISkillManifest } from '@symphony/domain-skills';

// #endregion

/**
 * Projects only the active team, manifests and configuration activity needed by Skills.
 *
 * @public
 */
export interface ISkillsContext {
  /**
   * The existing active-team projection.
   *
   * @public
   * @readonly
   */
  readonly activeTeam: Signal<IAgentTeam | undefined>;
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
