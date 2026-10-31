// #region Imports

import { z } from 'zod';
import { connectionStatusSchema } from './ConnectionStatusSchema';

// #endregion

export type ConnectionStatusDto = z.infer<typeof connectionStatusSchema>;
