// #region Imports

import { requestSchemas } from './RequestSchemas';

// #endregion

export type RequestMethod = keyof typeof requestSchemas;
