// #region Imports

import { z } from 'zod';
import { WorkspaceAvatarValidator } from '@symphony/domain-workspace';

// #endregion

/**
 * Validates portable workspace glyphs and normalizes entered emoji and monograms.
 *
 * @public
 */
export const workspaceAvatarSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('icon'),
    value: z
      .string()
      .max(80)
      .regex(/^[A-Za-z][A-Za-z0-9_-]*$/u),
  }),
  z.strictObject({
    kind: z.literal('emoji'),
    value: z.string().trim().max(32).refine(WorkspaceAvatarValidator.isEmoji, 'Select one emoji.'),
  }),
  z.strictObject({
    kind: z.literal('monogram'),
    value: z
      .string()
      .trim()
      .toUpperCase()
      .refine(WorkspaceAvatarValidator.isMonogram, 'Select one or two letters or numbers.'),
  }),
]);
