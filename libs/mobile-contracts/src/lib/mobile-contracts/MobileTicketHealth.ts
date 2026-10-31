// #region Imports

import { z } from 'zod';
import { mobileTicketHealthSchema } from './MobileTicketHealthSchema';

// #endregion

export type MobileTicketHealth = z.infer<typeof mobileTicketHealthSchema>;
