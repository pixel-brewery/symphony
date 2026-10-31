// #region Imports

import { z } from 'zod';
import { executionEventSchema } from './ExecutionEventSchema';

// #endregion

export type ExecutionEventDto = z.infer<typeof executionEventSchema>;
