// #region Imports

import { z } from 'zod';
import { mobileWorkItemCreateResponseSchema } from './MobileWorkItemCreateResponseSchema';

// #endregion

export type MobileWorkItemCreateResponse = z.infer<typeof mobileWorkItemCreateResponseSchema>;
