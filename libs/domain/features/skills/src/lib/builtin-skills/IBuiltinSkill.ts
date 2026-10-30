// #region Imports

import type { ProcessRole } from '@symphony/domain-workflow';
import type { BuiltinSkillResultContract } from './BuiltinSkillResultContract';

// #endregion

/**
 * Built-in process roles.
 *
 * Roles are code, not importable packages: the instructions, the output contract, and the
 * permissions of a role ship with the application and are versioned with it. An installation
 * customizes a role by appending instructions in settings, which can narrow behavior but can
 * never widen permissions - those are enforced outside the prompt.
 */
export interface IBuiltinSkill {
  readonly role: ProcessRole;
  readonly displayName: string;
  readonly description: string;
  /** Semantic version of the shipped instructions; recorded on every run. */
  readonly version: string;
  /** Increments whenever the composed prompt changes; recorded on every run. */
  readonly promptVersion: number;
  readonly instructions: string;
  /** Whether the role may modify workspace files. Enforced by the runtime, not the prompt. */
  readonly mutatesWorkspace: boolean;
  /** Whether the role may create or update a pull request. */
  readonly publishesPullRequest: boolean;
  /** Shape the role must return, named for the schema registry in the orchestrator. */
  readonly resultContract: BuiltinSkillResultContract;
}
