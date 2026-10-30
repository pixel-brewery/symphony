// #region Imports

import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const stageIdSchema = identifierSchema.max(64);
