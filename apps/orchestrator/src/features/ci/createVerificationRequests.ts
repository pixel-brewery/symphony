// #region Imports
import { type ICreateVerificationRequestsDependencies } from './ICreateVerificationRequestsDependencies';
import { ciRequestSchemas, ciResponseSchemas } from '@symphony/ipc-contracts-ci';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
import { type IActiveOperation } from '../../composition/IActiveOperation';
// #endregion

/**
 * Owns verification commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createVerificationRequests(dependencies: ICreateVerificationRequestsDependencies) {
  const { repositoryRuntime, storageGovernor, workspaceIdForRepository } = dependencies;
  const activeVerificationRuns = new Map<
    string,
    { readonly controller: AbortController; readonly completion: Promise<unknown> }
  >();
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'verification.plan',
      ciRequestSchemas['verification.plan'],
      ciResponseSchemas['verification.plan'],
      async (input) => {
        return repositoryRuntime.createVerificationPlan(
          input.repositoryBindingId,
          new AbortController().signal,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'verification.run',
      ciRequestSchemas['verification.run'],
      ciResponseSchemas['verification.run'],
      async (input) => {
        storageGovernor.assertWritable({
          workspaceId: workspaceIdForRepository(input.repositoryBindingId),
          workload: 'implementation',
        });
        if (activeVerificationRuns.has(input.repositoryBindingId)) {
          throw new Error('Local verification is already running for this repository.');
        }
        const controller = new AbortController();
        const completion = repositoryRuntime.runVerification(
          input.repositoryBindingId,
          input.planId,
          input.approval,
          controller.signal,
        );
        activeVerificationRuns.set(input.repositoryBindingId, { controller, completion });
        try {
          return await completion;
        } finally {
          if (activeVerificationRuns.get(input.repositoryBindingId)?.controller === controller) {
            activeVerificationRuns.delete(input.repositoryBindingId);
          }
        }
      },
    ),
    createOrchestratorRequestHandler(
      'verification.cancel',
      ciRequestSchemas['verification.cancel'],
      ciResponseSchemas['verification.cancel'],
      async (input) => {
        activeVerificationRuns.get(input.repositoryBindingId)?.controller.abort();
        return { completed: true as const };
      },
    ),
  ]);
  return Object.freeze({
    handlers,
    activeRuns: (): ReadonlyMap<string, IActiveOperation> => activeVerificationRuns,
  });
}
