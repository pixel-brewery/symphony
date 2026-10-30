// #region Imports

import { z } from 'zod';
import { updateStateSchema } from './UpdateStateSchema';

// #endregion

export type UpdateState = z.infer<typeof updateStateSchema>;
