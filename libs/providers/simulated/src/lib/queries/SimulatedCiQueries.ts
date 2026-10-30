// #region Imports
import { type IApplicationSettings } from '@symphony/configuration-composition';
import { type ICiRunDetails, type ILocalCiExecution } from '@symphony/domain-ci';
// #endregion

/**
 * Supplies the existing deterministic SimulatedCiQueries provider behavior.
 *
 * @public
 */
export class SimulatedCiQueries {
  // #region Fields
  private readonly _settings: () => Pick<
    IApplicationSettings,
    'repositoryBindings' | 'activeViewScope' | 'ciBindings'
  >;
  private readonly _localCiExecutions: () => readonly ILocalCiExecution[];
  // #endregion
  // #region Ctor
  /**
   * Reads the live configuration and existing local evidence on demand.
   *
   * @public
   */
  public constructor(
    settings: () => Pick<
      IApplicationSettings,
      'repositoryBindings' | 'activeViewScope' | 'ciBindings'
    >,
    localCiExecutions: () => readonly ILocalCiExecution[],
  ) {
    this._settings = settings;
    this._localCiExecutions = localCiExecutions;
  }
  // #endregion
  // #region Methods
  /**
   * Projects the existing deterministic readUsage response.
   *
   * @public
   */
  public readUsage(repositoryBindingIds: readonly string[]) {
    const included = 3_000;
    const configuredRemaining = Number(
      process.env['SYMPHONY_SIMULATED_GITHUB_REMAINING_MINUTES'] ?? '840',
    );
    const remaining = Number.isFinite(configuredRemaining)
      ? Math.min(included, Math.max(0, configuredRemaining))
      : 840;
    const used = included - remaining;
    const usedPercent = Math.min(100, Math.round((used / included) * 100));
    return repositoryBindingIds.map((repositoryBindingId) => {
      const repositoryBinding = this._settings().repositoryBindings.find(
        (candidate) => candidate.id === repositoryBindingId,
      );
      if (!repositoryBinding) {
        return {
          repositoryBindingId,
          error: 'The GitHub repository is unavailable.',
        };
      }
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      return {
        repositoryBindingId,
        account: {
          type: 'organization' as const,
          login: repositoryBinding.owner,
          planName: 'team',
        },
        period: {
          startedAt: new Date(Date.UTC(year, month, 1)).toISOString(),
          resetsAt: new Date(Date.UTC(year, month + 1, 1)).toISOString(),
        },
        minutes: {
          used,
          included,
          remaining,
          usedPercent,
          remainingPercent: 100 - usedPercent,
        },
      };
    });
  }

  /**
   * Projects the existing deterministic continuousIntegration response.
   *
   * @public
   */
  public continuousIntegration() {
    const now = new Date().toISOString();
    const selectedWorkspaceIds = new Set(this._settings().activeViewScope.workspaceIds);
    const bindings = this._settings().ciBindings.filter(
      (binding) =>
        binding.enabled &&
        binding.provider === 'github-actions' &&
        selectedWorkspaceIds.has(binding.workspaceId),
    );
    const ciWorkflows = bindings.flatMap((binding, bindingIndex) => {
      const repository = this._settings().repositoryBindings.find(
        (candidate) =>
          candidate.enabled &&
          candidate.id === binding.repositoryBindingId &&
          candidate.workspaceId === binding.workspaceId,
      );
      if (!repository) return [];
      return [
        {
          id: `${binding.id}:101`,
          workspaceId: binding.workspaceId,
          ciBindingId: binding.id,
          repositoryBindingId: repository.id,
          name: 'PR Quality',
          path: '.github/workflows/ci.yml',
          state: 'active' as const,
          defaultBranch: repository.defaultBranch,
          supportsManualDispatch: true,
          externalUrl: `https://${repository.host}/${repository.owner}/${repository.name}/actions/workflows/ci.yml`,
        },
        {
          id: `${binding.id}:102`,
          workspaceId: binding.workspaceId,
          ciBindingId: binding.id,
          repositoryBindingId: repository.id,
          name: bindingIndex ? 'Deploy Preview' : 'Deploy Dev',
          path: '.github/workflows/deploy.yml',
          state: 'active' as const,
          defaultBranch: repository.defaultBranch,
          supportsManualDispatch: true,
          externalUrl: `https://${repository.host}/${repository.owner}/${repository.name}/actions/workflows/deploy.yml`,
        },
        {
          id: `${binding.id}:103`,
          workspaceId: binding.workspaceId,
          ciBindingId: binding.id,
          repositoryBindingId: repository.id,
          name: 'Cache Maintenance',
          path: '.github/workflows/cache.yml',
          state: 'active' as const,
          defaultBranch: repository.defaultBranch,
          supportsManualDispatch: false,
          externalUrl: `https://${repository.host}/${repository.owner}/${repository.name}/actions/workflows/cache.yml`,
        },
      ];
    });
    const ciRuns = ciWorkflows.flatMap((workflow, index) => {
      const repository = this._settings().repositoryBindings.find(
        (candidate) => candidate.id === workflow.repositoryBindingId,
      );
      if (!repository) return [];
      const startedAt = new Date(Date.now() - (index + 1) * 11 * 60_000).toISOString();
      return [
        {
          id: `${workflow.ciBindingId}:${7_000 + index}`,
          workspaceId: workflow.workspaceId,
          ciBindingId: workflow.ciBindingId,
          repositoryBindingId: workflow.repositoryBindingId,
          workflowId: workflow.id,
          name: workflow.name,
          title: index === 0 ? 'Improve pull request quality checks' : workflow.name,
          event: index === 0 ? 'pull_request' : 'workflow_dispatch',
          actor: 'local-developer',
          runNumber: 350 - index,
          status: index === 1 ? ('queued' as const) : ('succeeded' as const),
          branch: repository.defaultBranch,
          revision: `simulated-${index + 1}`,
          externalUrl: `https://${repository.host}/${repository.owner}/${repository.name}/actions/runs/${7_000 + index}`,
          startedAt,
          ...(index === 1
            ? {}
            : { finishedAt: new Date(Date.parse(startedAt) + 45_000).toISOString() }),
          runAttempt: 1,
        },
      ];
    });
    return {
      ciWorkflows,
      ciRuns,
      localCiExecutions: this._localCiExecutions(),
      remoteData: { state: 'current' as const, lastSuccessfulRefreshAt: now },
    };
  }

  /**
   * Projects the existing deterministic dispatchWorkflow response.
   *
   * @public
   */
  public dispatchWorkflow(workflowId: string, ref: string) {
    const workflow = this.continuousIntegration().ciWorkflows.find(
      (candidate) => candidate.id === workflowId,
    );
    if (!workflow || !workflow.supportsManualDispatch || workflow.state !== 'active') {
      throw new Error('Refresh the workflow or choose one with a workflow_dispatch trigger.');
    }
    const repository = this._settings().repositoryBindings.find(
      (candidate) => candidate.id === workflow.repositoryBindingId,
    );
    const providerRunId = Date.now();
    return {
      id: `${workflow.ciBindingId}:${providerRunId}`,
      workspaceId: workflow.workspaceId,
      ciBindingId: workflow.ciBindingId,
      repositoryBindingId: workflow.repositoryBindingId,
      workflowId: workflow.id,
      name: workflow.name,
      title: workflow.name,
      event: 'workflow_dispatch',
      actor: 'local-developer',
      runNumber: providerRunId % 10_000,
      status: 'queued' as const,
      branch: ref,
      ...(repository
        ? {
            externalUrl: `https://${repository.host}/${repository.owner}/${repository.name}/actions/runs/${providerRunId}`,
          }
        : {}),
      startedAt: new Date().toISOString(),
      runAttempt: 1,
    };
  }

  /**
   * Projects the existing deterministic runDetails response.
   *
   * @public
   */
  public runDetails(runId: string): ICiRunDetails {
    const count = Math.max(
      1,
      Math.min(200, Number(process.env['SYMPHONY_SIMULATED_CI_JOB_COUNT']) || 1),
    );
    const definitions = Array.from({ length: count }, (_, index) => ({
      id: index === 0 ? 'quality' : `job-${index}`,
      name: index === 0 ? 'PR Quality' : `Parallel verification ${index}`,
      needs: index === 0 ? [] : ['quality'],
      matrix: index === 0 && count > 1,
    }));
    return {
      runId,
      logOutput: 'Typecheck and test completed successfully.',
      localDiagnostics: 'Resources\nCPUs: 4\nMem: 8Gi\nSwap: 4Gi',
      workflowGraph: {
        revision: 'fixture-ci-revision',
        path: '.github/workflows/ci.yml',
        jobs: definitions,
        unresolved: [],
      },
      jobs: [
        {
          id: `${runId}:job:quality`,
          workflowJobId: 'quality',
          name: 'PR Quality',
          status: 'succeeded' as const,
          startedAt: '2026-08-15T06:00:00.000Z',
          finishedAt: '2026-08-15T06:05:00.000Z',
          steps: [
            {
              id: `${runId}:job:quality:step:checkout`,
              name: 'Checkout',
              status: 'succeeded' as const,
            },
            {
              id: `${runId}:job:quality:step:test`,
              name: 'Typecheck and test',
              status: 'succeeded' as const,
            },
          ],
        },
        ...definitions.slice(1).map((job) => ({
          id: `${runId}:job:${job.id}`,
          workflowJobId: job.id,
          name: job.name,
          status: 'succeeded' as const,
          steps: [],
        })),
        ...(count > 1
          ? [
              {
                id: `${runId}:job:quality-matrix`,
                workflowJobId: 'quality',
                name: 'PR Quality (Linux)',
                status: 'succeeded' as const,
                steps: [],
              },
            ]
          : []),
      ],
    };
  }

  // #endregion
}
