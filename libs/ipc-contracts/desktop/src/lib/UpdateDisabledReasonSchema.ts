// #region Imports

import { z } from 'zod';

// #endregion

export const updateDisabledReasonSchema = z.enum([
  'development',
  'not-configured',
  'unsupported-platform',
]);
