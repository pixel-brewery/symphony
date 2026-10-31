// #region Imports

import { z } from 'zod';

// #endregion

export const mobileAssistanceActionSchema = z.enum(['none', 'create', 'analyze', 'solve']);
