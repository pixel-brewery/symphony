// #region Imports

import { z } from 'zod';

// #endregion

export /** Stages are configuration, so the boundary carries the configured identifier. */
const workflowStageIdSchema = z.string().trim().min(1).max(64);
