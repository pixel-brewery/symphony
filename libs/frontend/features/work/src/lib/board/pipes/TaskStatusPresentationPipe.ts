// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { stageRoles, type IWorkflowStage } from '@symphony/domain-workflow';
import { type IExecutionRecord } from '@symphony/domain-execution';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IExternalCoordination {
  readonly action: 'analyze' | 'solve';
}

interface ITaskStatusPresentation {
  readonly label: string;
  readonly variant: 'primary' | 'neutral' | 'info' | 'success' | 'danger' | 'warning';
}

@Pipe({ name: 'taskStatusPresentation', standalone: true, pure: false })
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
    if (isStarting)
      return {
        get label() {
          return translateLabel('loc.symphony.labels.starting.aeed4d2');
        },
        variant: 'primary',
      };
    if (isSolving)
      return {
        get label() {
          return translateLabel('loc.symphony.labels.starting.solver.13fce56');
        },
        variant: 'primary',
      };
    if (externalCoordination) {
      return {
        get label() {
          return externalCoordination.action === 'solve'
            ? translateLabel('loc.symphony.labels.solution.is.running.on.another.instance.f6073e8')
            : translateLabel('loc.symphony.labels.analysis.is.running.on.another.instance.ced0557');
        },
        variant: 'warning',
      };
    }
    // Without a run, the stage is the only thing that says what the item waits for. Naming
    // the analysis here regardless of the stage is what makes an item look ready for a step
    // its stage would refuse to run.
    if (!execution) {
      if (!hasWorkItem)
        return {
          get label() {
            return translateLabel('loc.symphony.labels.unavailable.ca18449');
          },
          variant: 'primary',
        };
      if (!stage)
        return {
          get label() {
            return translateLabel('loc.symphony.labels.column.is.not.mapped.9f4b3c5');
          },
          variant: 'warning',
        };
      if (stage.kind === 'terminal')
        return {
          get label() {
            return translateLabel('loc.symphony.labels.closed.c21ead0');
          },
          variant: 'success',
        };
      if (stage.kind === 'human-gate')
        return {
          get label() {
            return translateLabel('loc.symphony.labels.waiting.for.a.decision.7dfb0b7');
          },
          variant: 'primary',
        };
      const roles = stageRoles([stage], stage.id);
      if (roles.includes('analyze'))
        return {
          get label() {
            return translateLabel('loc.symphony.labels.ready.to.analyze.d5d5edf');
          },
          variant: 'primary',
        };
      if (roles.includes('solve'))
        return {
          get label() {
            return translateLabel('loc.symphony.labels.waiting.for.implementation.74131e4');
          },
          variant: 'primary',
        };
      return {
        get label() {
          return translateLabel('loc.symphony.labels.runs.no.step.ab0ceee', stage.label);
        },
        variant: 'warning',
      };
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
