// #region Imports

import { assistanceActions } from './AssistanceActions';

// #endregion

export type AssistanceAction = (typeof assistanceActions)[number];
