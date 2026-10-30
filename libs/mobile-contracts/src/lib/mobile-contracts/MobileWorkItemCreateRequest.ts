// #region Imports

import { z } from 'zod';
import { mobileWorkItemCreateRequestSchema } from './MobileWorkItemCreateRequestSchema';

// #endregion

export type MobileWorkItemCreateRequest = z.infer<typeof mobileWorkItemCreateRequestSchema>;
