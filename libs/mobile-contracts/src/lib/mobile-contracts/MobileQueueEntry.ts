// #region Imports

import { z } from 'zod';
import { mobileQueueEntrySchema } from './MobileQueueEntrySchema';

// #endregion

export type MobileQueueEntry = z.infer<typeof mobileQueueEntrySchema>;
