// #region Imports

import { z } from 'zod';
import type { RequestMethod } from './RequestMethod';
import { requestSchemas } from './RequestSchemas';

// #endregion

export type RequestPayload<M extends RequestMethod> = z.infer<(typeof requestSchemas)[M]>;
