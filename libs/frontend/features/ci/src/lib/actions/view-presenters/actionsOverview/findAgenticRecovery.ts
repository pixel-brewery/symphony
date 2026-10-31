// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { ICiAgentExecution } from '../../../ports/ICiAgentExecution';
import type { IAgenticRecovery } from './IAgenticRecovery';

// #endregion

function latest(
  executions: readonly ICiAgentExecution[],
  role: string,
): ICiAgentExecution | undefined {
  return executions
    .filter((execution) => execution.skillFlowRole === role)
    .reduce<ICiAgentExecution | undefined>(
      (current, execution) =>
        !current || execution.startedAt.localeCompare(current.startedAt) > 0 ? execution : current,
      undefined,
    );
}

/**
 * Finds the AI diagnosis and repair Symphony's agentic delivery ran for one failed run.
 *
 * The orchestrator keys its recovery journal by workspace, repository, run and run attempt
 * (`agentic:<workspace>:<repository>:<run>:<attempt>`) and stamps that key on every execution it
 * starts for the failure, so the key identifies the run's own diagnosis and repair exactly.
 *
 * @param executions - Agent executions of the snapshot.
 * @param run - The failed run.
 * @returns The diagnosis and repair, when they exist.
 * @public
 */
export function findAgenticRecovery(
  executions: readonly ICiAgentExecution[],
  run: ICiRun | undefined,
): IAgenticRecovery {
  if (!run) return {};
  const deliveryId = `agentic:${run.workspaceId}:${run.repositoryBindingId}:${run.id}:${run.runAttempt ?? 1}`;
  const related = executions.filter((execution) => execution.agenticDeliveryId === deliveryId);
  const diagnosis = latest(related, 'ci-diagnosis');
  const repair = latest(related, 'ci-repair');
  return { ...(diagnosis ? { diagnosis } : {}), ...(repair ? { repair } : {}) };
}
