// #region Imports

import { z } from 'zod';
import { mobileIssueDraftSchema } from './MobileIssueDraftSchema';

// #endregion

export type MobileIssueDraft = z.infer<typeof mobileIssueDraftSchema>;
