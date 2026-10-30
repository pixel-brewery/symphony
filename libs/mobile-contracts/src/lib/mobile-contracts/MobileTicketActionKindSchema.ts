// #region Imports

import { z } from 'zod';

// #endregion

export const mobileTicketActionKindSchema = z.enum([
  'analyze',
  'solve',
  'cancel',
  'dequeue',
  'publish-pull-request',
  'decide',
]);
