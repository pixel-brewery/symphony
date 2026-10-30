// #region Imports

import { z } from 'zod';

// #endregion

export const gitHubProjectCandidateSchema = z.object({
  id: z.string().min(1),
  ownerType: z.enum(['organization', 'user']),
  owner: z.string().min(1),
  projectNumber: z.number().int().positive(),
  title: z.string(),
  url: z.string(),
  closed: z.boolean(),
  origin: z.enum(['account', 'repository']),
});
