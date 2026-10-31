// #region Imports

import { z } from 'zod';

// #endregion

export const mobileExecutionStateSchema = z.enum([
  'queued',
  'running',
  'waiting',
  'succeeded',
  'failed',
  'cancelled',
]);
