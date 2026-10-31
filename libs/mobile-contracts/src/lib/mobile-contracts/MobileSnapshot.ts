// #region Imports

import { z } from 'zod';
import { mobileSnapshotSchema } from './MobileSnapshotSchema';

// #endregion

export type MobileSnapshot = z.infer<typeof mobileSnapshotSchema>;
