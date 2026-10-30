// #region Imports
import { type IProvideDeliveryOrchestratorFeatureDependencies } from './IProvideDeliveryOrchestratorFeatureDependencies';
import { deliveryRequestSchemas, deliveryResponseSchemas } from '@symphony/ipc-contracts-delivery';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns delivery commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideDeliveryOrchestratorFeature(
  dependencies: IProvideDeliveryOrchestratorFeatureDependencies,
) {
  const {
    settingsState,
    service,
    github,
    simulatedPullRequestDelivery,
    deliveryService,
    snapshotService,
    simulatedPullRequestBranches,
    simulatedPullRequestComparison,
    simulatedPullRequestCreation,
  } = dependencies;

  const assertDeliveryScope = (repositoryId: string): void => {
    if (
      !settingsState.current.repositoryBindings.some(
        (repo) =>
          repo.id === repositoryId &&
          repo.enabled &&
          settingsState.current.activeViewScope.workspaceIds.includes(repo.workspaceId),
      )
    )
      throw new Error('Select this delivery repository’s workspace before continuing.');
  };
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'pull-request.publish',
      deliveryRequestSchemas['pull-request.publish'],
      deliveryResponseSchemas['pull-request.publish'],
      async (input) => {
        return service.publishPullRequest(input.executionId);
      },
    ),
    createOrchestratorRequestHandler(
      'pull-request.branches',
      deliveryRequestSchemas['pull-request.branches'],
      deliveryResponseSchemas['pull-request.branches'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return simulatedPullRequestBranches(input.repositoryBindingId);
        }
        return github.listBranches(input.repositoryBindingId);
      },
    ),
    createOrchestratorRequestHandler(
      'pull-request.compare',
      deliveryRequestSchemas['pull-request.compare'],
      deliveryResponseSchemas['pull-request.compare'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return simulatedPullRequestComparison(input);
        }
        return github.compareBranches(
          input.repositoryBindingId,
          input.targetBranch,
          input.sourceBranch,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'pull-request.create',
      deliveryRequestSchemas['pull-request.create'],
      deliveryResponseSchemas['pull-request.create'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return simulatedPullRequestCreation(input);
        }
        return github.createPullRequest(input);
      },
    ),
    createOrchestratorRequestHandler(
      'pull-request.update-branch',
      deliveryRequestSchemas['pull-request.update-branch'],
      deliveryResponseSchemas['pull-request.update-branch'],
      async (input) => {
        if (
          process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated' &&
          simulatedPullRequestDelivery
        ) {
          return simulatedPullRequestDelivery.updateListedPullRequestBranch(
            input.repositoryBindingId,
            input.pullRequestNumber,
          );
        }
        return github.updateListedPullRequestBranch(
          input.repositoryBindingId,
          input.pullRequestNumber,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'delivery.preview',
      deliveryRequestSchemas['delivery.preview'],
      deliveryResponseSchemas['delivery.preview'],
      async (input) => {
        const target = settingsState.current.deliveryTargets?.find(
          (item) => item.id === input.targetId,
        );
        if (!target) throw new Error('This delivery target is unavailable.');
        assertDeliveryScope(target.repositoryBindingId);
        return deliveryService.preview(input.targetId, input.ref);
      },
    ),
    createOrchestratorRequestHandler(
      'delivery.start',
      deliveryRequestSchemas['delivery.start'],
      deliveryResponseSchemas['delivery.start'],
      async (input) => {
        assertDeliveryScope(input.plan.repositoryBindingId);
        return deliveryService.start(input.operationId, input.plan);
      },
    ),
    createOrchestratorRequestHandler(
      'delivery.operations',
      deliveryRequestSchemas['delivery.operations'],
      deliveryResponseSchemas['delivery.operations'],
      async () => {
        const selected = new Set(settingsState.current.activeViewScope.workspaceIds);
        return deliveryService
          .list()
          .filter((operation) =>
            settingsState.current.repositoryBindings.some(
              (repo) =>
                repo.id === operation.plan.repositoryBindingId && selected.has(repo.workspaceId),
            ),
          );
      },
    ),
    createOrchestratorRequestHandler(
      'delivery.reconcile',
      deliveryRequestSchemas['delivery.reconcile'],
      deliveryResponseSchemas['delivery.reconcile'],
      async (input) => {
        const operation = deliveryService.list().find((item) => item.id === input.operationId);
        if (!operation) throw new Error('This delivery request is unavailable.');
        assertDeliveryScope(operation.plan.repositoryBindingId);
        return deliveryService.reconcile(input.operationId);
      },
    ),
    createOrchestratorRequestHandler(
      'delivery.refresh',
      deliveryRequestSchemas['delivery.refresh'],
      deliveryResponseSchemas['delivery.refresh'],
      async () => {
        const snapshot = await snapshotService.snapshot();
        return github.readDelivery(snapshot.workItems, snapshot.executions);
      },
    ),
  ]);
  return Object.freeze({ id: 'delivery', handlers });
}
