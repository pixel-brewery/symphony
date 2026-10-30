// #region Imports

import { z } from 'zod';
import { modelIntelligenceSchema } from './ModelIntelligenceSchema';

// #endregion

export type ModelIntelligenceDto = z.infer<typeof modelIntelligenceSchema>;
