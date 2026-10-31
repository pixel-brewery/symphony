// #region Imports

import { z } from 'zod';

// #endregion

export const repositoryExecutionCapabilitySchema = z.enum([
  'agent-execution',
  'host-execution',
  'dependency-network',
  'dependency-build',
  'test-network',
  'container-engine',
  'host-browser',
  'native-ui',
  'test-credentials',
]);
