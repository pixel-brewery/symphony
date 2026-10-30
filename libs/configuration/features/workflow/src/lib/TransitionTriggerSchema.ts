// #region Imports

import { z } from 'zod';
import { processRoles, runOutcomes } from '@symphony/domain-workflow';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const transitionTriggerSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('outcome'),
      role: z.enum(processRoles),
      outcome: z.enum(runOutcomes),
    })
    .strict(),
  z.object({ kind: z.literal('claim'), role: z.enum(processRoles) }).strict(),
  z.object({ kind: z.literal('decision'), optionId: identifierSchema.max(64) }).strict(),
  z.object({ kind: z.literal('reconciliation') }).strict(),
]);
