// #region Imports

import { z } from 'zod';

// #endregion

export const updateChannelSchema = z.enum(['stable', 'canary']);
