// #region Imports

import { z } from 'zod';

// #endregion

export const projectFieldRoleSchema = z.enum(['workflow-state', 'assistance-action', 'custom']);
