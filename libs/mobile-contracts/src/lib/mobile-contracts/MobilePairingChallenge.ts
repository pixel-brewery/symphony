// #region Imports

import { z } from 'zod';
import { mobilePairingChallengeSchema } from './MobilePairingChallengeSchema';

// #endregion

export type MobilePairingChallenge = z.infer<typeof mobilePairingChallengeSchema>;
