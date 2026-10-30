// #region Imports

import { z } from 'zod';
import { mobileAccessStatusSchema } from './MobileAccessStatusSchema';

// #endregion

export type MobileAccessStatus = z.infer<typeof mobileAccessStatusSchema>;
