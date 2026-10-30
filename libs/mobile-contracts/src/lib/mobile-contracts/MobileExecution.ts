// #region Imports

import { z } from 'zod';
import { mobileExecutionSchema } from './MobileExecutionSchema';

// #endregion

export type MobileExecution = z.infer<typeof mobileExecutionSchema>;
