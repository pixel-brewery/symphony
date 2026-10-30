// #region Imports

import { z } from 'zod';
import { runtimeHealthSchema } from './RuntimeHealthSchema';

// #endregion

export type RuntimeHealthDto = z.infer<typeof runtimeHealthSchema>;
