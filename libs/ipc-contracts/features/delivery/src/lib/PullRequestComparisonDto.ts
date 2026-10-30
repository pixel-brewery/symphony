// #region Imports

import { z } from 'zod';
import { pullRequestComparisonSchema } from './PullRequestComparisonSchema';

// #endregion

export type PullRequestComparisonDto = z.infer<typeof pullRequestComparisonSchema>;
