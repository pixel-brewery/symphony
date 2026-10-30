// #region Imports

import { z } from 'zod';

// #endregion

export const verificationStepSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['restore', 'build', 'lint', 'unit-test', 'e2e-test']),
  label: z.string().min(1),
  executable: z.string().min(1),
  arguments: z.array(z.string()).max(100).readonly(),
  workingDirectory: z.string().min(1),
  timeoutSeconds: z.number().int().min(1).max(3_600),
  network: z.enum(['none', 'dependencies', 'tests']),
  artifactPaths: z.array(z.string()).max(100).readonly(),
});
