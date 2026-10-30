// #region Imports

import { z } from 'zod';
import { mobileEventSchema } from './MobileEventSchema';

// #endregion

export type MobileEvent = z.infer<typeof mobileEventSchema>;
