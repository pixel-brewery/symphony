// #region Imports

import { z } from 'zod';
import { ciRunHistorySchema } from './CiRunHistorySchema';

// #endregion

/**
 * Validated workflow-run history as the renderer receives it.
 *
 * @public
 */
export type CiRunHistoryDto = z.infer<typeof ciRunHistorySchema>;
