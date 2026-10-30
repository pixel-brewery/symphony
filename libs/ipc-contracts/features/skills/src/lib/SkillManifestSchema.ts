// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Validates the public manifest of an activated skill.
 *
 * @public
 */
export const skillManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()).readonly(),
  source: z.enum(['bundled', 'workspace', 'user']),
});
