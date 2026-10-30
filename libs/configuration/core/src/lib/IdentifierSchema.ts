// #region Imports

import { z } from 'zod';

// #endregion

export const identifierSchema = z.string().trim().min(1);
