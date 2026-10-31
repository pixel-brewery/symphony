// #region Imports

import { z } from 'zod';
import { workspaceBundleSchema } from './WorkspaceBundleSchema';

// #endregion

export type WorkspaceBundle = z.infer<typeof workspaceBundleSchema>;
