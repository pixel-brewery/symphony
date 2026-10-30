// #region Imports

import { z } from 'zod';
import { mobileWorkItemCreationContextRequestSchema } from './MobileWorkItemCreationContextRequestSchema';

// #endregion

export type MobileWorkItemCreationContextRequest = z.infer<
  typeof mobileWorkItemCreationContextRequestSchema
>;
