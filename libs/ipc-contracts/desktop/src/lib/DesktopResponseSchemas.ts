// #region Imports

import { z } from 'zod';
import { powerStateSchema } from './PowerStateSchema';
import { updateStateSchema } from './UpdateStateSchema';

// #endregion

export const desktopResponseSchemas = {
  'updates.get': updateStateSchema,
  'updates.check': updateStateSchema,
  'updates.download': z.object({ outcome: z.enum(['started', 'opened', 'not-available']) }),
  'updates.channel.set': updateStateSchema,
  'updates.install': z.object({ outcome: z.enum(['installing', 'deferred', 'not-ready']) }),
  'window.show': z.object({ completed: z.literal(true) }),
  'menu-bar.resize': z.object({ completed: z.literal(true) }),
  'menu-bar.status.set': z.object({ completed: z.literal(true) }),
  'app.quit': z.object({ accepted: z.literal(true) }),
  'power.get': powerStateSchema,
  'power.keep-awake.set': powerStateSchema,
  'speech.start': z.object({ started: z.literal(true) }),
  'speech.stop': z.object({ stopped: z.literal(true) }),
  'speech.cancel': z.object({ cancelled: z.literal(true) }),
  'settings.open': z.object({ completed: z.literal(true) }),
} as const;
