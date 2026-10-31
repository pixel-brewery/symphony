// #region Imports

import type { IAgentAppearance } from './IAgentAppearance';

// #endregion

export interface IAgentProfile {
  id: string;
  workspaceId: string;
  displayName: string;
  positionId: string;
  routePolicyId: string;
  qualificationTags: readonly string[];
  enabled: boolean;
  /** Omitted on legacy profiles; the stable ID-derived identity is used. */
  appearance?: IAgentAppearance;
}
