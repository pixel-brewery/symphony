// #region Imports

import { z } from 'zod';

// #endregion

export const mobileProjectFieldRoleSchema = z.enum([
  'workflow-state',
  'assistance-action',
  'custom',
]);
