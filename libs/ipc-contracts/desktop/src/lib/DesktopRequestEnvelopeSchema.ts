// #region Imports

import { z } from 'zod';

// #endregion

export const desktopRequestEnvelopeSchema = z.object({
  correlationId: z.string().min(1).max(200),
  method: z.enum([
    'updates.get',
    'updates.check',
    'updates.download',
    'updates.channel.set',
    'updates.install',
    'window.show',
    'menu-bar.resize',
    'menu-bar.status.set',
    'app.quit',
    'power.get',
    'power.keep-awake.set',
    'speech.start',
    'speech.stop',
    'speech.cancel',
    'settings.open',
  ]),
  payload: z.unknown(),
});
