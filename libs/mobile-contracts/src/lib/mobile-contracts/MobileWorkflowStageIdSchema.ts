// #region Imports

import { z } from 'zod';

// #endregion

/** Workflow stages are configured per installation, so the wire format carries the id. */
export const mobileWorkflowStageIdSchema = z.string().trim().min(1).max(64);
