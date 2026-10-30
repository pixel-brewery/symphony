// #region Imports

import { z } from 'zod';
import { mobileCommandResponseSchema } from './MobileCommandResponseSchema';

// #endregion

export type MobileCommandResponse = z.infer<typeof mobileCommandResponseSchema>;
