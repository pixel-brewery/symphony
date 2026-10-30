// #region Imports

import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IFeedbackIntakeSource } from '@symphony/domain-feedback';

// #endregion

export interface IMicrosoftTeamsFeedbackIntakeOptions {
  readonly settings: () => IApplicationSettings;
  readonly credential: (source: IFeedbackIntakeSource) => string | undefined;
  readonly fetcher?: typeof fetch;
  readonly wait?: (milliseconds: number) => Promise<void>;
}
