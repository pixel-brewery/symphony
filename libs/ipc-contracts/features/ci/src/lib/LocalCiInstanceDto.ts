// #region Imports

import { z } from 'zod';
import { localCiInstanceSchema } from './LocalCiInstanceSchema';

// #endregion

export type LocalCiInstanceDto = z.infer<typeof localCiInstanceSchema>;
