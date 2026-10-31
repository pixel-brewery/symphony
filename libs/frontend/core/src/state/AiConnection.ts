// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { AiUsageProvider } from './AiUsageProvider';

// #endregion

/** Canonical configured AI account shape consumed across feature boundaries. @public */
export type AiConnection = Extract<
  ApplicationSettingsDto['connections'][number],
  { kind: AiUsageProvider }
>;
