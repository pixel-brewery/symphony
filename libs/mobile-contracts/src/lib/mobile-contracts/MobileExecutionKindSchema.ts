// #region Imports

import { z } from 'zod';

// #endregion

export const mobileExecutionKindSchema = z.enum(['analysis', 'solution', 'revision']);
