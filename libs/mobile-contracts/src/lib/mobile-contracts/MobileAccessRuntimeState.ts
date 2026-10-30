// #region Imports

import { z } from 'zod';
import { mobileAccessRuntimeStateSchema } from './MobileAccessRuntimeStateSchema';

// #endregion

export type MobileAccessRuntimeState = z.infer<typeof mobileAccessRuntimeStateSchema>;
