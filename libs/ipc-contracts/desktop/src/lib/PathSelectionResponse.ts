// #region Imports

import { z } from 'zod';
import { pathSelectionResponseSchema } from './PathSelectionResponseSchema';

// #endregion

export type PathSelectionResponse = z.infer<typeof pathSelectionResponseSchema>;
