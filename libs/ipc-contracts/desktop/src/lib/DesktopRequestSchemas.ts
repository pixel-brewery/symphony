// #region Imports

import { z } from 'zod';
import { updateChannelSchema } from './UpdateChannelSchema';

// #endregion

export const desktopRequestSchemas = {
  'updates.get': z.object({}),
  'updates.check': z.object({}),
  'updates.download': z.object({}),
  'updates.channel.set': z.object({ channel: updateChannelSchema }),
  'updates.install': z.object({}),
  'window.show': z.object({
    route: z
      .enum(['current', 'settings', 'actions', 'inbox', 'notifications', 'new-work-item'])
      .default('current'),
  }),
  'menu-bar.resize': z.object({ height: z.number().int().min(180).max(760) }),
  'menu-bar.status.set': z.object({ status: z.enum(['idle', 'running', 'failed']) }),
  'app.quit': z.object({}),
  'power.get': z.object({}),
  'power.keep-awake.set': z.object({ enabled: z.boolean() }),
  'speech.start': z.object({ locale: z.string().trim().min(2).max(35) }),
  'speech.stop': z.object({}),
  'speech.cancel': z.object({}),
  'settings.open': z.object({
    /**
     * Settings location to show, as the Settings route reads it: `workspace`, `section` and the
     * section's own keys such as `repository` or `target`.
     */
    parameters: z
      .record(
        z.string().regex(/^[a-z][a-zA-Z-]{0,31}$/u),
        z.string().regex(/^[A-Za-z0-9._~-]{1,200}$/u),
      )
      .refine((record) => Object.keys(record).length <= 8)
      .optional(),
  }),
} as const;
