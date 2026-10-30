// #region Imports

import { z } from 'zod';
import { mobileBoardColumnSchema } from './MobileBoardColumnSchema';

// #endregion

export type MobileBoardColumn = z.infer<typeof mobileBoardColumnSchema>;
