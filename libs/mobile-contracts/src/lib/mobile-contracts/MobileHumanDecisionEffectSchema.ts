// #region Imports

import { z } from 'zod';

// #endregion

export const mobileHumanDecisionEffectSchema = z.enum([
  'advance',
  'route',
  'hold',
  'close',
  'split',
]);
