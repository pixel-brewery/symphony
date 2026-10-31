// #region Imports

import { z } from 'zod';
import { mobileMergeRequestSchema } from './MobileMergeRequestSchema';

// #endregion

export type MobileMergeRequest = z.infer<typeof mobileMergeRequestSchema>;
