// #region Imports

import type { IHumanDecision } from '../workflow/IHumanDecision';
import type { IWorkflowDefinition } from '../workflow/IWorkflowDefinition';
import type { IWorkflowRecord } from '../workflow/IWorkflowRecord';
import type { RoutingDecision } from './RoutingDecision';
import { transitionFor } from './transitionFor';

// #endregion

/**
 * Routes a human decision. A gate can only be passed through this path, which is why the
 * supervisor never derives an approval from a run result.
 */
export function routeHumanDecision(
  workflow: IWorkflowDefinition,
  record: IWorkflowRecord,
  decision: IHumanDecision,
): RoutingDecision {
  const stage = workflow.stages.find((candidate) => candidate.id === record.stageId);
  const option = stage?.decisions?.find((candidate) => candidate.id === decision.optionId);
  if (!option) return { kind: 'escalate', reasonCode: 'guard-not-satisfiable' };

  switch (option.effect) {
    case 'advance':
    case 'route': {
      const transition = transitionFor(
        workflow,
        record.stageId,
        (candidate) =>
          candidate.trigger.kind === 'decision' && candidate.trigger.optionId === option.id,
      );
      if (!transition) return { kind: 'escalate', reasonCode: 'guard-not-satisfiable' };
      return {
        kind: 'transition',
        transition,
        invalidates: [...(transition.invalidates ?? []), ...(option.invalidates ?? [])],
      };
    }
    case 'hold':
      return { kind: 'hold', runtimeState: 'human-required', reasonCode: 'decision-required' };
    case 'split':
      return { kind: 'hold', runtimeState: 'awaiting-human-review' };
    case 'close':
      return { kind: 'close', closureReason: option.closureReason ?? 'cancelled' };
  }
}
