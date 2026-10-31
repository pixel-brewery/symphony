// #region Imports

import { z } from 'zod';

// #endregion

export const azureDevOpsCredentialReferenceSchema = z
  .string()
  .regex(/^vault:azure-devops:[A-Za-z0-9._-]+$/u);
