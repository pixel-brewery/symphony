// #region Imports

import { z } from 'zod';

// #endregion

export const executionKindSchema = z.enum(['analysis', 'solution', 'revision']);
