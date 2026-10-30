// #region Imports

import { z } from 'zod';

// #endregion

export const runnerImageCatalogEntrySchema = z.object({
  releaseTag: z.string().min(1).max(128),
  family: z.string().min(1).max(32),
  architecture: z.enum(['arm64', 'x64']),
  ubuntuVersion: z.string().min(1).max(16),
  imageVersion: z.string().min(1).max(32),
  publishedAt: z.iso.datetime(),
  reportUrl: z.url(),
  latest: z.boolean(),
});
