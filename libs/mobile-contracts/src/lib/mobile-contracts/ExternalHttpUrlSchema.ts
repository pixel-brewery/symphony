// #region Imports

import { z } from 'zod';

// #endregion

export const externalHttpUrlSchema = z.url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
});
