// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const LABELS = {
  'agent-name': 'Agent name',
  position: 'Job title',
  responsibility: 'At least one responsibility',
  'operating-skill': 'One operating skill for every responsibility',
  account: 'A connected AI account',
  'account-name': 'AI account name',
  'runtime-codex': 'Codex CLI must be installed',
  'runtime-claude': 'Claude Code CLI must be installed',
  'runtime-opencode': 'OpenCode CLI must be installed',
  model: 'AI model',
} as const;

type Issue = keyof typeof LABELS;

@Pipe({ name: 'aiValidationIssuesLabel', standalone: true, pure: true })
export class AiValidationIssuesLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param issues - Issues.
   * @public
   */
  public transform(issues: readonly Issue[]): string {
    return issues.map((issue) => LABELS[issue]).join(' · ');
  }

  // #endregion
}
