// #region Imports

import { z } from 'zod';
import { mobileTicketActionSchema } from './MobileTicketActionSchema';

// #endregion

export type MobileTicketAction = z.infer<typeof mobileTicketActionSchema>;
