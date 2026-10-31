// #region Imports

import { z } from 'zod';
import { codexConfigurationSchema } from './CodexConfigurationSchema';

// #endregion

export type CodexConfigurationDto = z.infer<typeof codexConfigurationSchema>;
