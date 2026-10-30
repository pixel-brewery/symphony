// #region Imports

import type { IIssueAutomationIssue } from './IIssueAutomationIssue';
import type { IIssueCommentConnection } from './IIssueCommentConnection';

// #endregion

export interface IIssueDetailIssue extends IIssueAutomationIssue {
  readonly comments?: IIssueCommentConnection;
}
