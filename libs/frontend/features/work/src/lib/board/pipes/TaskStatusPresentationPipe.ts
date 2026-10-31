// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { stageRoles, type IWorkflowStage } from '@symphony/domain-workflow';
import { type IExecutionRecord } from '@symphony/domain-execution';

// #endregion

interface IExternalCoordination {
  readonly action: 'analyze' | 'solve';
}

interface ITaskStatusPresentation {
  readonly label: string;
  readonly variant: 'primary' | 'neutral' | 'info' | 'success' | 'danger' | 'warning';
}

@Pipe({ name: 'taskStatusPresentation', standalone: true, pure: true })
export class TaskStatusPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param execution - Execution.
   * @param externalCoordination - External coordination.
   * @param isStarting - Is starting.
   * @param isSolving - Is solving.
   * @param hasWorkItem - Has work item.
   * @param stage - Stage.
   * @public
   */
  public transform(
    execution: IExecutionRecord | undefined,
    externalCoordination: IExternalCoordination | undefined,
    isStarting: boolean,
    isSolving: boolean,
    hasWorkItem: boolean,
    stage: IWorkflowStage | undefined,
  ): ITaskStatusPresentation {
    if (isStarting) return { label: 'Starting', variant: 'primary' };
    if (isSolving) return { label: 'Starting Solver', variant: 'primary' };
    if (externalCoordination) {
      return {
        label:
          externalCoordination.action === 'solve'
            ? 'Solution is running on another instance'
            : 'Analysis is running on another instance',
        variant: 'warning',
      };
    }
    // Without a run, the stage is the only thing that says what the item waits for. Naming
    // the analysis here regardless of the stage is what makes an item look ready for a step
    // its stage would refuse to run.
    if (!execution) {
      if (!hasWorkItem) return { label: 'Unavailable', variant: 'primary' };
      if (!stage) return { label: 'Column is not mapped', variant: 'warning' };
      if (stage.kind === 'terminal') return { label: 'Closed', variant: 'success' };
      if (stage.kind === 'human-gate')
        return { label: 'Waiting for a decision', variant: 'primary' };
      const roles = stageRoles([stage], stage.id);
      if (roles.includes('analyze')) return { label: 'Ready to analyze', variant: 'primary' };
      if (roles.includes('solve'))
        return { label: 'Waiting for implementation', variant: 'primary' };
      return { label: `${stage.label} runs no step`, variant: 'warning' };
    }
    const solution = execution.kind === 'solution' || execution.kind === 'revision';
    const labels = solution
      ? {
          queued: 'Solve queued',
          running: 'Solving',
          waiting: 'Solve waiting to resume',
          succeeded: 'Solved',
          failed: 'Solve failed',
          cancelled: 'Solve cancelled',
        }
      : {
          queued: 'Analysis queued',
          running: 'Analyzing',
          waiting: 'Analysis waiting to resume',
          succeeded: 'Analyzed',
          failed: 'Analysis failed',
          cancelled: 'Analysis cancelled',
        };
    const variants = {
      queued: 'neutral',
      running: 'info',
      waiting: 'neutral',
      succeeded: 'success',
      failed: 'danger',
      cancelled: 'primary',
    } as const;
    return { label: labels[execution.state], variant: variants[execution.state] };
  }

  // #endregion
}
