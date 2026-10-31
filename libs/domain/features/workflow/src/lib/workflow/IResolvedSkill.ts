// #region Imports

import type { ProcessRole } from './ProcessRole';

// #endregion

/**
 * A role's shipped definition combined with the installation's additional instructions.
 * This is what an execution records and what an agent adapter receives - never a mutable
 * catalog entry, so a restarted run reproduces the instructions it started with.
 */
export interface IResolvedSkill {
  readonly role: ProcessRole;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
  readonly promptVersion: number;
  readonly instructions: string;
  /** Present when the installation appended instructions; identifies which text was used. */
  readonly customizationHash?: string;
  readonly mutatesWorkspace: boolean;
  readonly publishesPullRequest: boolean;
}
