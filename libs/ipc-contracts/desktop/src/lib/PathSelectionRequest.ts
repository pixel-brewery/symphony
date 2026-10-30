// #region Imports

import { z } from 'zod';
import { pathSelectionRequestSchema } from './PathSelectionRequestSchema';

// #endregion

export type PathSelectionRequest = z.infer<typeof pathSelectionRequestSchema>;
