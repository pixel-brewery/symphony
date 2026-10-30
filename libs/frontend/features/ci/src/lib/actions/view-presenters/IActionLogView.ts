// #region Imports

import type { IActionLogJobView } from './IActionLogJobView';
import type { IActionRunProtocolView } from './IActionRunProtocolView';

// #endregion

export interface IActionLogView {
  readonly jobs: readonly IActionLogJobView[];
  readonly runProtocols: readonly IActionRunProtocolView[];
}
