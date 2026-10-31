// #region Imports

import { z } from 'zod';
import { availableAiModelsSchema } from './AvailableAiModelsSchema';

// #endregion

export type AvailableAiModelsDto = z.infer<typeof availableAiModelsSchema>;
