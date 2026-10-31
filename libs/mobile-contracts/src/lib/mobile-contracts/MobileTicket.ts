// #region Imports

import { z } from 'zod';
import { mobileTicketSchema } from './MobileTicketSchema';

// #endregion

export type MobileTicket = z.infer<typeof mobileTicketSchema>;
