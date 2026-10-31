// #region Imports

import { z } from 'zod';
import type { RequestMethod } from './RequestMethod';
import { responseSchemas } from './ResponseSchemas';

// #endregion

export type ResponsePayload<M extends RequestMethod> = z.infer<(typeof responseSchemas)[M]>;
