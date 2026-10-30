// #region Imports

import { z } from 'zod';
import { mobileCommandRequestSchema } from './MobileCommandRequestSchema';

// #endregion

export type MobileCommandRequest = z.infer<typeof mobileCommandRequestSchema>;
