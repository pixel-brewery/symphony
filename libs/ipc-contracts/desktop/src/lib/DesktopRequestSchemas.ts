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
    route: z.enum(['current', 'settings', 'actions']).default('current'),
  }),
  'menu-bar.resize': z.object({ height: z.number().int().min(180).max(620) }),
  'menu-bar.status.set': z.object({ status: z.enum(['idle', 'running', 'failed']) }),
  'app.quit': z.object({}),
  'power.get': z.object({}),
  'power.keep-awake.set': z.object({ enabled: z.boolean() }),
  'speech.start': z.object({ locale: z.string().trim().min(2).max(35) }),
  'speech.stop': z.object({}),
  'speech.cancel': z.object({}),
} as const;
