// #region Imports

import { z } from 'zod';
import { platformConfigSchema } from './PlatformConfigSchema';

// #endregion

export type PlatformConfig = z.infer<typeof platformConfigSchema>;
