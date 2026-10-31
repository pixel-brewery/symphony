// #region Imports

import type { IAgentAppearance } from '@symphony/domain-team';

// #endregion

/** Saved project identity used by ambient flights, independent of execution state. @public */
export interface IOrbitCrewMember {
  readonly id: string;
  readonly name: string;
  readonly appearance?: IAgentAppearance;
}
