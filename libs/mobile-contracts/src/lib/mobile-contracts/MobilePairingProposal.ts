// #region Imports

import { z } from 'zod';
import { mobilePairingProposalSchema } from './MobilePairingProposalSchema';

// #endregion

export type MobilePairingProposal = z.infer<typeof mobilePairingProposalSchema>;
