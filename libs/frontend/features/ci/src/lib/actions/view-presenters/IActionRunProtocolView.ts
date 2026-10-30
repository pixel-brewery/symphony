// #region Imports

import type { CiRunLogState } from '@symphony/domain-ci';

// #endregion

export interface IActionRunProtocolView {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly status: CiRunLogState;
}
