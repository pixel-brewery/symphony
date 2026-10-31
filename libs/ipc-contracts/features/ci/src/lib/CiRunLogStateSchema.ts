// #region Imports

import { z } from 'zod';

// #endregion

export const ciRunLogStateSchema = z.enum([
  'queued',
  'in-progress',
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
]);
