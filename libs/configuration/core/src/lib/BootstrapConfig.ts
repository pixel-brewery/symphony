// #region Imports

import type { PlatformConfig } from './PlatformConfig';
import { platformConfigSchema } from './PlatformConfigSchema';

// #endregion

export const bootstrapConfig: PlatformConfig = platformConfigSchema.parse({
  version: 1,
  targetProjects: [
    {
      id: 'simulated-platform',
      displayName: 'Platform engineering',
      tracker: { provider: 'simulated', project: 'Local orchestration bootstrap' },
      repository: { provider: 'simulated', name: 'example/platform' },
    },
  ],
});
