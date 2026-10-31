// #region Imports

import type {
  IIssueDraft,
  IIssueDraftRequest,
  IWorkItemEditorMetadata,
} from '@symphony/domain-work';
import type { ISkillPackageDocument } from '@symphony/domain-skills';

// #endregion

/**
 * Invokes the selected Work Item Creator without exposing a concrete agent runtime.
 *
 * @public
 */
export interface IIssueDraftingPort {
  /**
   * Drafts a provider-neutral item from current metadata and the selected Skill package.
   *
   * @public
   */
  draftIssue(
    request: IIssueDraftRequest,
    metadata: IWorkItemEditorMetadata,
    skill: ISkillPackageDocument,
    workingDirectory: string,
    signal: AbortSignal,
  ): Promise<IIssueDraft>;
}
