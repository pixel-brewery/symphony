// #region Imports

import { z } from 'zod';

// #endregion

export const agentAppearanceSchema = z.object({
  figure: z.enum(['dot', 'pebble', 'arch', 'kite', 'sprout']),
  color: z.enum(['coral', 'mint', 'blue', 'violet', 'gold', 'rose']),
  accessories: z
    .array(z.enum(['glasses', 'headphones', 'badge']))
    .max(3)
    .refine((items) => new Set(items).size === items.length, 'Accessories must be unique.'),
  image: z
    .string()
    .max(1_400_000)
    .regex(/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]+={0,2}$/u)
    .optional(),
});
