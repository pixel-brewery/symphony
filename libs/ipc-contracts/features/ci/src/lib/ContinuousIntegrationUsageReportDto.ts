// #region Imports

import { z } from 'zod';
import { continuousIntegrationUsageReportSchema } from './ContinuousIntegrationUsageReportSchema';

// #endregion

export type ContinuousIntegrationUsageReportDto = z.infer<
  typeof continuousIntegrationUsageReportSchema
>;
