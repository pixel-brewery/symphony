// #region Imports

import { z } from 'zod';
import { mobileProjectFieldDefinitionSchema } from './MobileProjectFieldDefinitionSchema';

// #endregion

export type MobileProjectFieldDefinition = z.infer<typeof mobileProjectFieldDefinitionSchema>;
