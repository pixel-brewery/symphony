// #region Imports

import { z } from 'zod';
import type { IGraphMessage } from './IGraphMessage';
import { identitySchema } from './IdentitySchema';

// #endregion

export const messageSchema: z.ZodType<IGraphMessage> = z
  .object({
    id: z.string().min(1),
    createdDateTime: z.string().min(1),
    webUrl: z.string().url().optional(),
    body: z
      .object({ content: z.string().default('') })
      .passthrough()
      .default({ content: '' }),
    from: identitySchema.nullable().optional(),
    mentions: z.array(z.object({ mentionText: z.string().default('') }).passthrough()).default([]),
    attachments: z
      .array(
        z
          .object({
            contentType: z.string().default(''),
            content: z.unknown().optional(),
          })
          .passthrough(),
      )
      .default([]),
    replies: z.array(z.lazy(() => messageSchema)).default([]),
    'replies@odata.nextLink': z.string().url().optional(),
  })
  .passthrough();
