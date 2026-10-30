// #region Imports

import { z } from 'zod';
import { pullRequestSummarySchema } from './PullRequestSummarySchema';

// #endregion

export type PullRequestSummaryDto = z.infer<typeof pullRequestSummarySchema>;
