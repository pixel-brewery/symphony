// #region Imports

import { z } from 'zod';
import { powerStateSchema } from './PowerStateSchema';

// #endregion

export type PowerState = z.infer<typeof powerStateSchema>;
