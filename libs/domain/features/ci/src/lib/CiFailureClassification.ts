// #region Imports

import { ciFailureClassifications } from './CiFailureClassifications';

// #endregion

export type CiFailureClassification = (typeof ciFailureClassifications)[number];
