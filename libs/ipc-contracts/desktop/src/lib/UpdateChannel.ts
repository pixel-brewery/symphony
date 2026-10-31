// #region Imports

import { z } from 'zod';
import { updateChannelSchema } from './UpdateChannelSchema';

// #endregion

export type UpdateChannel = z.infer<typeof updateChannelSchema>;
