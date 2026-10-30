// #region Imports

import { z } from 'zod';

// #endregion

export const assistanceActionSchema = z.enum(['none', 'create', 'analyze', 'solve']);
