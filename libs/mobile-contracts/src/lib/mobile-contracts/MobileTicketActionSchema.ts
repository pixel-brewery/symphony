// #region Imports

import { z } from 'zod';
import { mobileHumanDecisionEffectSchema } from './MobileHumanDecisionEffectSchema';
import { mobileTicketActionKindSchema } from './MobileTicketActionKindSchema';

// #endregion

/**
 * One step the desktop offers for a ticket, resolved from the stage it rests in. The desktop
 * board resolves the same list from the same rule, so both surfaces always offer the same work.
 */
export const mobileTicketActionSchema = z.object({
  id: z.string().min(1).max(200),
  kind: mobileTicketActionKindSchema,
  label: z.string().min(1).max(200),
  /** Why the step cannot run. It stays visible and explains the stage. */
  blockedReason: z.string().max(500).optional(),
  /** The step needs a written description before it starts. */
  requiresFeedback: z.boolean().optional(),
  /** The step repeats work that already ran. */
  repeat: z.boolean().optional(),
  effect: mobileHumanDecisionEffectSchema.optional(),
  executionId: z.string().min(1).max(500).optional(),
  /** Queue entry a `dequeue` action withdraws. */
  queueEntryId: z.string().min(1).max(500).optional(),
  optionId: z.string().min(1).max(500).optional(),
});
