// #region Imports

import { z } from 'zod';

// #endregion

export const labelSchema = z.string().trim().min(1).max(64);
