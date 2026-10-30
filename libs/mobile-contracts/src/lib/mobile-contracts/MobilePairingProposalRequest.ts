// #region Imports

import { z } from 'zod';
import { mobilePairingProposalRequestSchema } from './MobilePairingProposalRequestSchema';

// #endregion

export type MobilePairingProposalRequest = z.infer<typeof mobilePairingProposalRequestSchema>;
