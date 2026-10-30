// #region Imports

import { z } from 'zod';
import { applicationSettingsSchema } from '@symphony/configuration-composition';

// #endregion

export type ApplicationSettingsDto = z.infer<typeof applicationSettingsSchema>;
