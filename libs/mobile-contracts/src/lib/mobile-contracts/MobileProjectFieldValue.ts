// #region Imports

import { z } from 'zod';
import { mobileProjectFieldValueSchema } from './MobileProjectFieldValueSchema';

// #endregion

export type MobileProjectFieldValue = z.infer<typeof mobileProjectFieldValueSchema>;
