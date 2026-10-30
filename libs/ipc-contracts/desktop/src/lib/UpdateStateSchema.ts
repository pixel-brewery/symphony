// #region Imports

import { z } from 'zod';
import { updateChannelSchema } from './UpdateChannelSchema';
import { updateDisabledReasonSchema } from './UpdateDisabledReasonSchema';
const updateStateBaseSchema = z.object({
  currentVersion: z.string().min(1).max(100),
  channel: updateChannelSchema,
  lastCheckedAt: z.iso.datetime().optional(),
});

// #endregion

export const updateStateSchema = z.discriminatedUnion('kind', [
  updateStateBaseSchema.extend({
    kind: z.literal('disabled'),
    reason: updateDisabledReasonSchema,
  }),
  updateStateBaseSchema.extend({ kind: z.literal('idle') }),
  updateStateBaseSchema.extend({ kind: z.literal('checking') }),
  updateStateBaseSchema.extend({
    kind: z.literal('available'),
    targetVersion: z.string().min(1).max(100),
  }),
  updateStateBaseSchema.extend({ kind: z.literal('downloading') }),
  updateStateBaseSchema.extend({
    kind: z.literal('ready'),
    targetVersion: z.string().min(1).max(100),
    releaseNotes: z.string().max(20_000).optional(),
    downloadedAt: z.iso.datetime(),
  }),
  updateStateBaseSchema.extend({
    kind: z.literal('failed'),
    code: z.enum(['CHECK_FAILED', 'DOWNLOAD_FAILED', 'INSTALL_FAILED']),
    message: z.string().min(1).max(1_000),
  }),
]);
