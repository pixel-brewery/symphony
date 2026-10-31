// #region Imports

import { z } from 'zod';
import { legacyBoardColumnMappingSchema } from './LegacyBoardColumnMappingSchema';

// #endregion

export const versionThreeSourceSchema = z
  .object({
    columnMappings: z.array(legacyBoardColumnMappingSchema).optional(),
  })
  .passthrough();
