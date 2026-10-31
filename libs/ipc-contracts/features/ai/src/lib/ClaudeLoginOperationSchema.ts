// #region Imports

import { z } from 'zod';
import { configurationOperationSchema } from '@symphony/ipc-contracts-core';
const claudeAuthorizationUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    url.hostname === 'claude.com' &&
    url.pathname === '/cai/oauth/authorize'
  );
}, 'Expected a Claude authorization URL.');

// #endregion

export const claudeLoginOperationSchema = configurationOperationSchema.extend({
  authorizationUrl: claudeAuthorizationUrlSchema.optional(),
});
