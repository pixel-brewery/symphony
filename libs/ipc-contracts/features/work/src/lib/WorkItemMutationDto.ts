// #region Imports

import { z } from 'zod';
import { workItemMutationSchema } from './WorkItemMutationSchema';

// #endregion

export type WorkItemMutationDto = z.infer<typeof workItemMutationSchema>;
