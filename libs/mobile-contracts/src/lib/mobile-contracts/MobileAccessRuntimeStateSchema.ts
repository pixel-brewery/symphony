// #region Imports

import { z } from 'zod';

// #endregion

export const mobileAccessRuntimeStateSchema = z.enum([
  'disabled',
  'starting',
  'available',
  'rebinding',
  'stopping',
  'unavailable',
]);
