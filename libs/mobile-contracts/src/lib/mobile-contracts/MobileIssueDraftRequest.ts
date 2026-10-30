// #region Imports

import { z } from 'zod';
import { mobileIssueDraftRequestSchema } from './MobileIssueDraftRequestSchema';

// #endregion

export type MobileIssueDraftRequest = z.infer<typeof mobileIssueDraftRequestSchema>;
