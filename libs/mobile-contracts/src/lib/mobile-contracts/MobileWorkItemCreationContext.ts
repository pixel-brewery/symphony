// #region Imports

import { z } from 'zod';
import { mobileWorkItemCreationContextSchema } from './MobileWorkItemCreationContextSchema';

// #endregion

export type MobileWorkItemCreationContext = z.infer<typeof mobileWorkItemCreationContextSchema>;
