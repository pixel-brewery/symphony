// #region Imports

import { z } from 'zod';
import { mobileTicketActionKindSchema } from './MobileTicketActionKindSchema';

// #endregion

export type MobileTicketActionKind = z.infer<typeof mobileTicketActionKindSchema>;
