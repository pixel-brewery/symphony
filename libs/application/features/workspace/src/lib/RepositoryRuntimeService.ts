// #region Imports

import type {
  IRepositoryBinding,
  IRepositoryRuntimeStatus,
  IRepositoryTrustGrant,
  RepositoryExecutionCapability,
} from '@symphony/domain-workspace';
import type { IVerificationPlan, IVerificationRun, IVerificationStep } from '@symphony/domain-ci';
import type { IWorkItem } from '@symphony/domain-work';
import { repositoryBindingsFor } from '@symphony/configuration-composition';
import type { IRepositoryRuntimeDependencies } from './IRepositoryRuntimeDependencies';
import type { RepositoryExecutionApproval } from './RepositoryExecutionApproval';
import { repositoryIdentity } from './repositoryIdentity';
import { skipsDependencyBuilds } from './skipsDependencyBuilds';

// #endregion

export class RepositoryRuntimeService {
  // #region Ctor

  public constructor(private readonly _dependencies: IRepositoryRuntimeDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Returns the statuses.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public async statuses(
    repositoryBindingId?: string,
  ): Promise<readonly IRepositoryRuntimeStatus[]> {
    const repositories = this._dependencies
      .settings()
      .repositoryBindings.filter(
        (candidate) => !repositoryBindingId || candidate.id === repositoryBindingId,
      );
    if (repositoryBindingId && !repositories.length) {
      throw new Error(`Unknown repository binding: ${repositoryBindingId}`);
    }
    return Promise.all(repositories.map((repository) => this.status(repository)));
  }

  /**
   * Prepares.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param signal - Signal.
   * @public
   */
  public async prepare(
    repositoryBindingId: string,
    signal: AbortSignal,
  ): Promise<IRepositoryRuntimeStatus> {
    const repository = this.repository(repositoryBindingId);
    const prepared = await this._dependencies.acquisition.prepare(
      repository,
      this._dependencies.managedRepositoryRoot(repository.workspaceId),
      signal,
    );
    if (prepared.path !== repository.localPath) {
      await this._dependencies.saveRepositoryPath(repository.id, prepared.path);
    }
    return this.status({ ...repository, localPath: prepared.path });
  }

  /**
   * Creates the verification plan.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param signal - Signal.
   * @public
   */
  public async createVerificationPlan(
    repositoryBindingId: string,
    signal: AbortSignal,
  ): Promise<IVerificationPlan> {
    const repository = this.repository(repositoryBindingId);
    const prepared = await this.prepared(repository);
    const draft = await this._dependencies.planner.plan(repository, prepared, signal);
    if (!draft.steps.length) {
      throw new Error('No local verification steps were found for this repository.');
    }
    const plan: IVerificationPlan = {
      id: this._dependencies.ids.next('verification-plan'),
      workspaceId: repository.workspaceId,
      repositoryBindingId: repository.id,
      repositoryIdentity: repositoryIdentity(repository),
      revision: prepared.revision,
      createdAt: this._dependencies.clock.now(),
      technologies: [
        ...new Set(draft.technologies.map((technology) => technology.trim()).filter(Boolean)),
      ],
      evidence: draft.evidence,
      capabilities: requiredCapabilities(draft.steps),
      steps: draft.steps,
    };
    this._dependencies.verification.saveVerificationPlan(plan);
    return plan;
  }

  /**
   * Runs the verification.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param planId - Plan id.
   * @param approval - Approval.
   * @param signal - Signal.
   * @public
   */
  public async runVerification(
    repositoryBindingId: string,
    planId: string,
    approval: RepositoryExecutionApproval,
    signal: AbortSignal,
  ): Promise<IVerificationRun> {
    const repository = this.repository(repositoryBindingId);
    const plan = this._dependencies.verification.verificationPlan(planId);
    if (!plan || plan.repositoryBindingId !== repository.id) {
      throw new Error('The local verification plan is unavailable. Create a new plan.');
    }
    const prepared = await this.prepared(repository);
    if (
      prepared.revision !== plan.revision ||
      plan.repositoryIdentity !== repositoryIdentity(repository)
    ) {
      throw new Error(
        'The repository changed after the verification plan was created. Review a new plan.',
      );
    }
    this.authorize(repository, plan.capabilities, approval);

    const runId = this._dependencies.ids.next('verification-run');
    const startedAt = this._dependencies.clock.now();
    const workspacePath = await this._dependencies.verificationWorkspace.prepareVerification(
      runId,
      repository,
      plan.revision,
    );
    let steps: IVerificationRun['steps'];
    try {
      steps = await this._dependencies.executor.execute(
        workspacePath,
        this._dependencies.verificationRuntimeRoot(repository.workspaceId, runId),
        plan.steps,
        signal,
      );
    } finally {
      await this._dependencies.verificationWorkspace.release(workspacePath);
    }
    const state: IVerificationRun['state'] = signal.aborted
      ? 'cancelled'
      : steps.every((step) => step.state === 'succeeded')
        ? 'succeeded'
        : 'failed';
    const run: IVerificationRun = {
      id: runId,
      workspaceId: repository.workspaceId,
      repositoryBindingId: repository.id,
      planId: plan.id,
      revision: plan.revision,
      approval,
      state,
      startedAt,
      finishedAt: this._dependencies.clock.now(),
      steps,
    };
    this._dependencies.verification.saveVerificationRun(run);
    return run;
  }

  /**
   * Returns the authorize agent execution.
   *
   * @param workItem - Work item.
   * @param approval - Approval.
   * @public
   */
  public async authorizeAgentExecution(
    workItem: IWorkItem,
    approval: RepositoryExecutionApproval | undefined,
  ): Promise<void> {
    void approval;
    const repository = this.repositoryForWorkItem(workItem);
    await this.prepared(repository);
  }

  /**
   * Returns the grant agent trust.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public grantAgentTrust(repositoryBindingId: string): IRepositoryTrustGrant {
    return this.saveTrust(this.repository(repositoryBindingId), ['agent-execution']);
  }

  /**
   * Revokes the trust.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public revokeTrust(repositoryBindingId: string): void {
    this.repository(repositoryBindingId);
    this._dependencies.trust.revokeTrustGrant(repositoryBindingId);
  }

  private async status(repository: IRepositoryBinding): Promise<IRepositoryRuntimeStatus> {
    const prepared = await this._dependencies.acquisition.inspect(
      repository,
      this._dependencies.managedRepositoryRoot(repository.workspaceId),
    );
    const trust = this.validTrust(repository);
    return {
      repositoryBindingId: repository.id,
      workspaceId: repository.workspaceId,
      displayName: repository.displayName,
      repositoryIdentity: repositoryIdentity(repository),
      preparation: prepared
        ? {
            state: 'prepared',
            path: prepared.path,
            revision: prepared.revision,
            managed: prepared.managed,
          }
        : { state: 'unprepared' },
      trust: trust
        ? {
            state: 'trusted',
            capabilities: trust.capabilities,
            grantedAt: trust.grantedAt,
          }
        : { state: 'restricted', capabilities: [] },
    };
  }

  private async prepared(repository: IRepositoryBinding) {
    const prepared = await this._dependencies.acquisition.inspect(
      repository,
      this._dependencies.managedRepositoryRoot(repository.workspaceId),
    );
    if (!prepared) {
      throw new Error('Prepare this repository locally before running code or verification.');
    }
    return prepared;
  }

  private authorize(
    repository: IRepositoryBinding,
    capabilities: readonly RepositoryExecutionCapability[],
    approval: RepositoryExecutionApproval,
  ): void {
    const trust = this.validTrust(repository);
    if (approval === 'stored') {
      if (!trust || capabilities.some((capability) => !trust.capabilities.includes(capability))) {
        throw new Error('Local repository execution requires explicit approval on this machine.');
      }
      return;
    }
    if (approval === 'repository') this.saveTrust(repository, capabilities);
  }

  private saveTrust(
    repository: IRepositoryBinding,
    capabilities: readonly RepositoryExecutionCapability[],
  ): IRepositoryTrustGrant {
    const existing = this.validTrust(repository);
    const grant: IRepositoryTrustGrant = {
      id: existing?.id ?? this._dependencies.ids.next('repository-trust'),
      workspaceId: repository.workspaceId,
      repositoryBindingId: repository.id,
      repositoryIdentity: repositoryIdentity(repository),
      capabilities: [...new Set([...(existing?.capabilities ?? []), ...capabilities])],
      grantedAt: this._dependencies.clock.now(),
    };
    this._dependencies.trust.saveTrustGrant(grant);
    return grant;
  }

  private validTrust(repository: IRepositoryBinding): IRepositoryTrustGrant | undefined {
    const grant = this._dependencies.trust.trustGrant(repository.id);
    return grant?.workspaceId === repository.workspaceId &&
      grant.repositoryIdentity === repositoryIdentity(repository)
      ? grant
      : undefined;
  }

  private repository(repositoryBindingId: string): IRepositoryBinding {
    const repository = this._dependencies
      .settings()
      .repositoryBindings.find((candidate) => candidate.id === repositoryBindingId);
    if (!repository) throw new Error(`Unknown repository binding: ${repositoryBindingId}`);
    if (!repository.enabled) throw new Error(`Repository ${repository.displayName} is disabled.`);
    return repository;
  }

  private repositoryForWorkItem(workItem: IWorkItem): IRepositoryBinding {
    const candidates = repositoryBindingsFor(this._dependencies.settings(), workItem);
    if (candidates.length !== 1) {
      throw new Error(`Choose one repository for ${workItem.externalId} before local execution.`);
    }
    return candidates[0]!;
  }

  // #endregion
}

function requiredCapabilities(
  steps: readonly IVerificationStep[],
): readonly RepositoryExecutionCapability[] {
  const capabilities = new Set<RepositoryExecutionCapability>(['host-execution']);
  for (const step of steps) {
    if (step.kind === 'restore' && !skipsDependencyBuilds(step)) {
      capabilities.add('dependency-build');
    }
    if (step.network === 'dependencies') capabilities.add('dependency-network');
    if (step.network === 'tests') capabilities.add('test-network');
    if (step.kind === 'e2e-test') capabilities.add('host-browser');
    if (/^(?:docker|podman)$/iu.test(step.executable)) capabilities.add('container-engine');
  }
  return [...capabilities];
}
