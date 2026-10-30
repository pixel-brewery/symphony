// #region Imports

import { z } from 'zod';
import { ciRunSchema } from '@symphony/ipc-contracts-ci';
import { deliveryLaunchPlanSchema } from './DeliveryLaunchPlanSchema';

// #endregion

export const deliveryOperationSchema = z.object({
  id: z.string().min(1),
  plan: deliveryLaunchPlanSchema,
  state: z.enum(['submitting', 'accepted', 'uncertain', 'rejected']),
  startedAt: z.iso.datetime(),
  run: ciRunSchema.optional(),
  message: z.string().max(4000).optional(),
});
