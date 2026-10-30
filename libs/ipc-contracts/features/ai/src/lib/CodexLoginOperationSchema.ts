// #region Imports

import { z } from 'zod';
import { configurationOperationSchema } from '@symphony/ipc-contracts-core';
const codexAuthorizationUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    url.hostname === 'auth.openai.com' &&
    url.pathname === '/oauth/authorize'
  );
}, 'Expected an OpenAI authorization URL.');

// #endregion

export const codexLoginOperationSchema = configurationOperationSchema.extend({
  authorizationUrl: codexAuthorizationUrlSchema.optional(),
});
