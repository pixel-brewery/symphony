// #region Imports

import { z } from 'zod';
import { internalCredentialMessageSchema } from './InternalCredentialMessageSchema';

// #endregion

export type InternalCredentialMessage = z.infer<typeof internalCredentialMessageSchema>;
