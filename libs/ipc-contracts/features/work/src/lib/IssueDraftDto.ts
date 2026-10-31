// #region Imports

import { z } from 'zod';
import { issueDraftSchema } from './IssueDraftSchema';

// #endregion

export type IssueDraftDto = z.infer<typeof issueDraftSchema>;
