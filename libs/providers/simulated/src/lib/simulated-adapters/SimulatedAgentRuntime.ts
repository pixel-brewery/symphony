// #region Imports

import type { IAgentProgress, IAgentRuntimePort } from '@symphony/application-execution';
import type { IIssueDraftingPort } from '@symphony/application-work';
import type { IExecutionContext } from '@symphony/application-execution';
import type {
  IIssueDraft,
  IIssueDraftRequest,
  IWorkItemEditorMetadata,
  ProjectFieldValue,
} from '@symphony/domain-work';
import type { ISkillPackageDocument } from '@symphony/domain-skills';
import { setTimeout as delay } from 'node:timers/promises';
import { simulatedFieldValues } from './simulatedFieldValues';

// #endregion

export class SimulatedAgentRuntime implements IAgentRuntimePort, IIssueDraftingPort {
  // #region Ctor

  public constructor(private readonly _stepDelayMs = 280) {}

  // #endregion

  // #region Methods

  /**
   * Returns the analyze.
   *
   * @param context - Context.
   * @param _skill - Skill.
   * @param request - Request.
   * @param onProgress - On progress.
   * @param simulateFailure - Simulate failure.
   * @param signal - Signal.
   * @public
   */
  public async analyze(
    context: IExecutionContext,
    _skill: ISkillPackageDocument,
    request: string | undefined,
    onProgress: (progress: IAgentProgress) => Promise<void>,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<string> {
    await delay(this._stepDelayMs, undefined, { signal });
    await onProgress({
      category: 'message',
      message: `Read tracker context for ${context.workItem.externalId}.`,
    });
    await delay(this._stepDelayMs, undefined, { signal });
    await onProgress({
      category: 'command',
      message: 'Inspected repository evidence in the managed workspace.',
    });
    await delay(this._stepDelayMs, undefined, { signal });
    if (simulateFailure) {
      throw new Error(
        'Simulated agent failure; the managed workspace was preserved for diagnosis.',
      );
    }
    await onProgress({
      category: 'reasoning',
      message: 'Compared constraints and prepared a staged implementation plan.',
    });
    await delay(180, undefined, { signal });
    return [
      '## Analysis complete',
      '',
      'Reconcile **workspace metadata** first.',
      '',
      '- Recover drifted workspaces',
      '- Quarantine unsafe workspaces',
      '',
      '| Area | Decision |',
      '| --- | --- |',
      '| Workspace | Recover |',
      '| Unsafe state | Quarantine |',
      '',
      '[Open the recovery guide](https://example.com/recovery?source=symphony&mode=analysis)',
      ...(request ? ['', '### Requested focus', '', request] : []),
      '',
      '## Definition of ready',
      '',
      '```json',
      JSON.stringify(
        {
          feasible: true,
          ready_for_solve: true,
          unresolved_questions: [],
          test_strategy: ['unit'],
          acceptance_mapping: [
            {
              criterion: 'Recover drifted workspaces',
              implementation_step: 1,
              verification: 'unit test',
            },
            {
              criterion: 'Quarantine unsafe workspaces',
              implementation_step: 2,
              verification: 'unit test',
            },
          ],
          risk: { class: 'low', reasons: [] },
        },
        null,
        2,
      ),
      '```',
    ].join('\n');
  }

  /**
   * Returns the solve.
   *
   * @param context - Context.
   * @param _skill - Skill.
   * @param _analysis - Analysis.
   * @param feedback - Feedback.
   * @param onProgress - On progress.
   * @param simulateFailure - Simulate failure.
   * @param signal - Signal.
   * @public
   */
  public async solve(
    context: IExecutionContext,
    _skill: ISkillPackageDocument,
    _analysis: string,
    feedback: string | undefined,
    onProgress: (progress: IAgentProgress) => Promise<void>,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<string> {
    await delay(this._stepDelayMs, undefined, { signal });
    await onProgress({
      category: 'file-change',
      message: feedback
        ? `Applying requested revision for ${context.workItem.externalId}.`
        : `Implementing ${context.workItem.externalId} in the managed worktree.`,
    });
    await delay(this._stepDelayMs, undefined, { signal });
    if (simulateFailure) throw new Error('Simulated Solver failure; workspace preserved.');
    return [
      feedback ? '## Revision complete' : '## Implementation complete',
      '',
      feedback ? `Applied feedback: **${feedback}**` : 'Implemented the analyzed change.',
      '',
      '- Updated the isolated worktree',
      '- Ran focused verification',
    ].join('\n');
  }

  /**
   * Drafts the issue.
   *
   * @param request - Request.
   * @param metadata - Metadata.
   * @param skill - Skill.
   * @param _workingDirectory - Working directory.
   * @param signal - Signal.
   * @public
   */
  public async draftIssue(
    request: IIssueDraftRequest,
    metadata: IWorkItemEditorMetadata,
    skill: ISkillPackageDocument,
    _workingDirectory: string,
    signal: AbortSignal,
  ): Promise<IIssueDraft> {
    await delay(this._stepDelayMs, undefined, { signal });
    const currentFields = request.projectFields ?? simulatedFieldValues('backlog', '');
    const projectFields = currentFields.map((value): ProjectFieldValue => {
      switch (value.fieldId) {
        case 'field-keywords':
          return { ...value, type: 'text', value: 'issue creation, project workflow' };
        case 'field-estimate':
          return { ...value, type: 'number', value: 5 };
        case 'field-target-date':
          return { ...value, type: 'date', value: '2026-08-28' };
        case 'field-priority':
          return { ...value, type: 'single-select', value: 'priority-high' };
        case 'field-areas':
          return { ...value, type: 'multi-select', value: ['area-projects'] };
        case 'field-iteration':
          return { ...value, type: 'iteration', value: 'iteration-august' };
        default:
          return value;
      }
    });
    return {
      title: request.title?.trim() || 'Add complete issue creation to the workspace board',
      body: [
        '## Problem',
        '',
        request.prompt,
        '',
        `Drafted with **${skill.displayName}**.`,
        '',
        '## Acceptance criteria',
        '',
        '- The requested behavior is implemented.',
        '- Failure states remain actionable.',
        '- The workflow is covered by focused verification.',
      ].join('\n'),
      projectFields,
      labels: metadata.labels.some((label) => label.name === 'bug') ? ['bug'] : [],
      assignees: metadata.assignees[0] ? [metadata.assignees[0].login] : [],
    };
  }

  // #endregion
}
