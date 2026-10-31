// #region Imports

import { createHash } from 'node:crypto';
import type { IDeliveryLaunchPlan } from '@symphony/domain-delivery';
import { GitHubDeliveryAdapter } from './GitHubDeliveryAdapter';
import type { IDeliverySnapshot } from '@symphony/domain-delivery';
import { projectWorkflowGraph } from './projectWorkflowGraph';
import { projectDispatchInputs } from './projectDispatchInputs';
import { validateDispatchInputs } from './validateDispatchInputs';
import type { ICiDispatchInput, ICiWorkflowGraph, ICiPendingApproval } from '@symphony/domain-ci';
import type {
  IContinuousIntegrationPort,
  IContinuousIntegrationUsagePort,
  IContinuousIntegrationUsageReport,
} from '@symphony/application-ci';
import type {
  IPullRequestAuthoringPort,
  IPullRequestCollectionPort,
} from '@symphony/application-delivery';
import type { IPullRequestDeliveryPort } from '@symphony/application-execution';
import type { ISourceControlPort, ISourceControlRepository } from '@symphony/application-workspace';
import type { IGithubLocalRunnerSession } from '@symphony/providers-lima';
import {
  GitHubRateLimitError,
  GitHubRequestGovernor,
  type IGitHubRateLimitSnapshot,
} from '../github-request-governor';
import type {
  CiRunLogState,
  ICiBinding,
  ICiRun,
  ICiRunDetails,
  ICiRunLogChunk,
  ICiWorkflow,
  ILocalCiExecution,
  ILocalCiHostCapacity,
} from '@symphony/domain-ci';
import type { IApplicationSettings, ProviderConnection } from '@symphony/configuration-composition';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type {
  IPullRequestBranchInventory,
  IPullRequestComparison,
  IPullRequestDraft,
  IPullRequestReference,
  IPullRequestStatus,
  IPullRequestSummary,
} from '@symphony/domain-delivery';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IWorkItem } from '@symphony/domain-work';
import { resolveLocalCiResourcePreset } from '@symphony/domain-ci';
import { parse as parseYaml } from 'yaml';
import { resolveAllowedCommand } from '@symphony/providers-core';
import { existsSync, realpathSync, statfsSync } from 'node:fs';
import { toolchainSearchPath } from '@symphony/providers-core';
import { forgetGitHubToken, isGitHubAuthenticationFailure } from '../provider-connections';
import { dirname, resolve } from 'node:path';
import { availableParallelism, totalmem } from 'node:os';
import type { IGitHubCloudProviderOptions } from './IGitHubCloudProviderOptions';
import type { IGitHubWorkflowJobsResponse } from './IGitHubWorkflowJobsResponse';
import type { IGitHubWorkflowRunSummary } from './IGitHubWorkflowRunSummary';
import { LOCAL_CI_DISPATCH_INPUT } from './LocalCiDispatchInput';
import { boundedRedactedLog } from './boundedRedactedLog';
import { normalizeLogStatus } from './normalizeLogStatus';
import { normalizeRunStatus } from './normalizeRunStatus';
import { redactedLog } from './redactedLog';
import { execFileAsync } from '@symphony/providers-core';

interface IGitHubWorkflowRunsResponse {
  readonly workflow_runs?: readonly IGitHubWorkflowRunSummary[];
}

interface IGitHubWorkflowsResponse {
  readonly workflows?: readonly {
    readonly id: number;
    readonly name?: string;
    readonly path?: string;
    readonly state?: string;
    readonly html_url?: string;
  }[];
}

interface IGitHubContentResponse {
  readonly type?: string;
  readonly encoding?: string;
  readonly content?: string;
}

interface IGitHubApiOutput {
  readonly body: string;
  readonly rateLimit: IGitHubRateLimitSnapshot;
}

interface IGitHubWorkflowRunResponse {
  readonly id: number;
  readonly status?: string;
  readonly conclusion?: string | null;
  readonly head_sha?: string;
  readonly path?: string;
  readonly run_attempt?: number;
}

interface IGitHubRunnerRegistrationTokenResponse {
  readonly token?: string;
}

interface IGitHubCliWorkflowJobsResponse {
  readonly jobs?: readonly {
    readonly databaseId?: number;
    readonly name?: string;
    readonly status?: string;
    readonly conclusion?: string | null;
    readonly startedAt?: string;
    readonly completedAt?: string | null;
    readonly url?: string;
    readonly steps?: readonly {
      readonly number?: number;
      readonly name?: string;
      readonly status?: string;
      readonly conclusion?: string | null;
      readonly startedAt?: string | null;
      readonly completedAt?: string | null;
    }[];
  }[];
}

interface IGitHubRunnersResponse {
  readonly runners?: readonly {
    readonly id: number;
    readonly name: string;
  }[];
}

interface IRunTarget {
  readonly runId: string;
  readonly repository: IRepositoryBinding;
  readonly connection: Extract<ProviderConnection, { kind: 'github' }>;
  readonly workflowId?: number;
  readonly branch?: string;
}

interface IWorkflowTarget {
  readonly providerWorkflowId: string;
  readonly workflow: ICiWorkflow;
  readonly binding: ICiBinding;
  readonly repository: IRepositoryBinding;
  readonly connection: Extract<ProviderConnection, { kind: 'github' }>;
  readonly supportsLocalDispatchInput: boolean;
}

interface IGitHubPullRequestResponse {
  readonly number: number;
  readonly html_url: string;
  readonly title?: string;
  readonly body?: string | null;
  readonly state?: 'open' | 'closed';
  readonly draft?: boolean;
  readonly merged_at?: string | null;
  readonly mergeable?: boolean | null;
  readonly mergeable_state?: string;
  readonly user?: { readonly login?: string };
  readonly merge_commit_sha?: string;
  readonly head?: { readonly ref?: string; readonly sha?: string };
  readonly base?: { readonly ref?: string };
  readonly requested_reviewers?: readonly { readonly login?: string }[] | null;
  readonly requested_teams?:
    | readonly {
        readonly slug?: string;
        readonly organization?: { readonly login?: string };
      }[]
    | null;
  readonly created_at?: string;
  readonly updated_at?: string;
}

interface IGitHubBranchResponse {
  readonly name?: string;
  readonly protected?: boolean;
}

interface IGitHubComparisonResponse {
  readonly status?: 'identical' | 'ahead' | 'behind' | 'diverged';
  readonly ahead_by?: number;
  readonly behind_by?: number;
  readonly files?: readonly unknown[];
  readonly commits?: readonly {
    readonly sha?: string;
    readonly commit?: {
      readonly message?: string;
      readonly author?: { readonly name?: string; readonly date?: string };
    };
    readonly author?: { readonly login?: string };
  }[];
}

interface IGitHubRepositoryResponse {
  readonly owner?: {
    readonly login?: string;
    readonly type?: string;
  };
}

interface IGitHubAccountResponse {
  readonly login?: string;
  readonly plan?: {
    readonly name?: string;
  };
}

interface IGitHubBillingUsageSummaryResponse {
  readonly usageItems?: readonly {
    readonly product?: string;
    readonly sku?: string;
    readonly unitType?: string;
    readonly grossQuantity?: number;
  }[];
}

interface IUsageTarget {
  readonly repository: IRepositoryBinding;
  readonly connection: Extract<ProviderConnection, { kind: 'github' }>;
}

const GITHUB_API_VERSION = '2026-03-10';

const GITHUB_RATE_LIMIT_FALLBACK_MILLISECONDS = 15 * 60_000;

const GITHUB_BRANCH_PAGE_LIMIT = 10;

const GITHUB_COMPARISON_COMMIT_LIMIT = 20;

const GITHUB_RUN_CANCEL_CHECKS = 150;

const GITHUB_RUN_STATUS_RETRIES = 5;

const GITHUB_RUN_FORCE_CANCEL_FIRST_CHECK = 5;

const GITHUB_RUN_FORCE_CANCEL_REPEAT_CHECKS = 15;

const includedActionsMinutesByPlan = new Map<string, number>([
  ['free', 2_000],
  ['pro', 3_000],
  ['team', 3_000],
]);

const includedActionsMinuteSkus = new Set([
  'actions_linux',
  'actions_linux_arm',
  'actions_linux_slim',
  'actions_macos',
  'actions_windows',
  'actions_windows_arm',
]);

function boundedRedactedFailureLog(value: string): string | undefined {
  const lines = value.split(/\r?\n/u);
  const primaryDiagnostic =
    /##\[error\]|\bassertion\b|(?:^|[\s:])error(?::|\s)|expect\(|locator\(/iu;
  const testDiagnostic = /\.(?:spec|test)\.[cm]?[jt]sx?/iu;
  const hasPrimaryDiagnostics = lines.some((line) => primaryDiagnostic.test(line));
  const hasTestDiagnostics = lines.some((line) => testDiagnostic.test(line));
  const diagnosticLines = new Set<number>();
  for (const [index, line] of lines.entries()) {
    if (
      !(hasPrimaryDiagnostics
        ? primaryDiagnostic.test(line)
        : hasTestDiagnostics
          ? testDiagnostic.test(line)
          : /\b(?:failed|failure|timeout)\b/iu.test(line))
    ) {
      continue;
    }
    for (let contextIndex = index; contextIndex <= index + 3; contextIndex += 1) {
      if (contextIndex < lines.length) diagnosticLines.add(contextIndex);
    }
  }
  if (!diagnosticLines.size) {
    return boundedRedactedLog(value, '… earlier failed output omitted.');
  }
  const excerpts: string[] = [];
  let previous = -2;
  for (const index of [...diagnosticLines].toSorted((left, right) => left - right)) {
    if (excerpts.length && index > previous + 1) excerpts.push('…');
    excerpts.push(lines[index] ?? '');
    previous = index;
  }
  return boundedRedactedLog(excerpts.join('\n'), '… earlier diagnostic failure excerpts omitted.');
}

function detectLocalCiHostCapacity(
  runtimeRoot: string,
  settings: IApplicationSettings,
): ILocalCiHostCapacity {
  let filesystemPath = resolve(runtimeRoot);
  while (!existsSync(filesystemPath)) {
    const parent = dirname(filesystemPath);
    if (parent === filesystemPath) break;
    filesystemPath = parent;
  }
  const filesystem = statfsSync(filesystemPath);
  const availableBytes = Number(filesystem.bavail) * Number(filesystem.bsize);
  const reservedBytes = settings.runtime.minimumFreeDiskGiB * 1024 ** 3;
  return {
    logicalCpus: availableParallelism(),
    memoryGiB: Math.floor(totalmem() / 1024 ** 3),
    availableStorageGiB: Math.floor(Math.max(0, availableBytes - reservedBytes) / 1024 ** 3),
    storageLimitGiB: settings.localCi.storageLimitGiB,
  };
}

function currentAttemptJobs(
  jobs: readonly NonNullable<IGitHubWorkflowJobsResponse['jobs']>[number][],
): readonly NonNullable<IGitHubWorkflowJobsResponse['jobs']>[number][] {
  const latestAttempt = Math.max(0, ...jobs.map((job) => job.run_attempt ?? 0));
  return latestAttempt ? jobs.filter((job) => job.run_attempt === latestAttempt) : jobs;
}

function hasWorkflowDispatch(document: unknown): boolean {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return false;
  const trigger = (document as Record<string, unknown>)['on'];
  if (trigger === 'workflow_dispatch') return true;
  if (Array.isArray(trigger)) return trigger.includes('workflow_dispatch');
  return Boolean(
    trigger &&
    typeof trigger === 'object' &&
    !Array.isArray(trigger) &&
    Object.hasOwn(trigger, 'workflow_dispatch'),
  );
}

function declaresLocalCiDispatchInput(document: unknown): boolean {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return false;
  const trigger = (document as Record<string, unknown>)['on'];
  if (!trigger || typeof trigger !== 'object' || Array.isArray(trigger)) return false;
  const dispatch = (trigger as Record<string, unknown>)['workflow_dispatch'];
  if (!dispatch || typeof dispatch !== 'object' || Array.isArray(dispatch)) return false;
  const inputs = (dispatch as Record<string, unknown>)['inputs'];
  return Boolean(
    inputs &&
    typeof inputs === 'object' &&
    !Array.isArray(inputs) &&
    Object.hasOwn(inputs, LOCAL_CI_DISPATCH_INPUT),
  );
}

function normalizeJobStepStatuses(
  jobStatus: CiRunLogState,
  steps: readonly NonNullable<
    NonNullable<IGitHubWorkflowJobsResponse['jobs']>[number]['steps']
  >[number][],
): readonly CiRunLogState[] {
  const statuses = steps.map((step) => normalizeLogStatus(step.status, step.conclusion));
  if (jobStatus === 'in-progress') {
    const latestObservedStep = statuses.findLastIndex(
      (status) => status !== 'queued' && status !== 'skipped',
    );
    return statuses.map((status, index) =>
      status === 'in-progress' && index < latestObservedStep ? 'succeeded' : status,
    );
  }
  if (jobStatus === 'queued') return statuses;

  const hasReportedFailure = statuses.includes('failed');
  let projectedFailure = false;
  return statuses.map((status) => {
    if (status !== 'in-progress' && status !== 'queued') return status;
    if (
      jobStatus === 'failed' &&
      !hasReportedFailure &&
      !projectedFailure &&
      status === 'in-progress'
    ) {
      projectedFailure = true;
      return 'failed';
    }
    if (jobStatus === 'cancelled' && status === 'in-progress') return 'cancelled';
    return 'skipped';
  });
}

function workflowRunState(status?: string, conclusion?: string | null): ILocalCiExecution['state'] {
  if (status !== 'completed') return 'cancelled';
  if (conclusion === 'success' || conclusion === 'neutral' || conclusion === 'skipped') {
    return 'succeeded';
  }
  if (conclusion === 'cancelled') return 'cancelled';
  return 'failed';
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const finish = (): void => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timeout = setTimeout(finish, milliseconds);
    timeout.unref();
    signal?.addEventListener('abort', finish, { once: true });
  });
}

/**
 * How the pull request has to name the issue so GitHub links the two.
 *
 * `#42` inside the delivery repository, `owner/repo#42` for an issue that lives in another
 * repository on the same host, and nothing at all for a work item that is not a GitHub issue -
 * a keyword GitHub cannot resolve would claim a link that does not exist.
 */
function issueReference(workItem: IWorkItem, repository: IRepositoryBinding): string | undefined {
  const match = /^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/issues\/(\d+)(?:[?#].*)?$/u.exec(
    workItem.externalUrl ?? '',
  );
  const [, host = '', owner = '', name = '', number = ''] = match ?? [];
  if (!number || host.toLowerCase() !== repository.host.toLowerCase()) return undefined;
  return owner.toLowerCase() === repository.owner.toLowerCase() &&
    name.toLowerCase() === repository.name.toLowerCase()
    ? `#${number}`
    : `${owner}/${name}#${number}`;
}

/** True when the description already carries a keyword GitHub reads as a link to that issue. */
function closesIssue(body: string, reference: string): boolean {
  const escaped = reference.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+${escaped}(?!\\d)`, 'iu').test(
    body,
  );
}

/** Every distinct GitHub issue delivered by this execution, with the root first. */
function issueReferences(
  workItem: IWorkItem,
  execution: IExecutionRecord,
  repository: IRepositoryBinding,
): readonly string[] {
  const items = [workItem, ...(execution.workItemSnapshots ?? [])];
  return Array.from(
    new Set(items.map((item) => issueReference(item, repository)).filter(Boolean) as string[]),
  );
}

/** Appends every missing GitHub closing reference without rewriting operator-authored content. */
function appendClosingReferences(body: string, references: readonly string[]): string {
  const missing = references.filter((reference) => !closesIssue(body, reference));
  if (missing.length === 0) return body;
  const keyword = references.length > 1 ? 'Resolves' : 'Closes';
  return `${body.trimEnd()}\n\n${missing.map((reference) => `${keyword} ${reference}`).join('\n')}`.trimStart();
}

// #endregion

export class GitHubCloudProvider
  implements
    ISourceControlPort,
    IContinuousIntegrationPort,
    IContinuousIntegrationUsagePort,
    IPullRequestAuthoringPort,
    IPullRequestCollectionPort,
    IPullRequestDeliveryPort
{
  // #region Fields

  private readonly _runTargets = new Map<string, IRunTarget>();
  private readonly _managedLocalRunIds = new Set<string>();
  private readonly _workflowTargets = new Map<string, IWorkflowTarget>();
  private readonly _activeLocalRunners = new Map<string, IGithubLocalRunnerSession>();
  private readonly _localRunnerDiagnostics = new Map<string, string>();
  private readonly _completedRunLogs = new Map<string, string>();
  private readonly _governor: GitHubRequestGovernor;
  private readonly _deliveryAdapter: GitHubDeliveryAdapter;

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IGitHubCloudProviderOptions) {
    this._governor = _options.governor ?? new GitHubRequestGovernor();
    this._deliveryAdapter = new GitHubDeliveryAdapter(
      _options.settings,
      {
        request: <T>(
          repositoryBindingId: string,
          path: string,
          method: 'GET' | 'POST',
          fields?: Readonly<Record<string, string | number | boolean>>,
        ) => {
          const settings = _options.settings();
          const repository = settings.repositoryBindings.find(
            (repo) => repo.id === repositoryBindingId && repo.enabled,
          );
          const connection = settings.connections.find(
            (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
              candidate.kind === 'github' &&
              candidate.id === repository?.sourceControlConnectionId &&
              candidate.workspaceId === repository?.workspaceId,
          );
          if (!repository || !connection)
            throw new Error('The delivery repository or account is unavailable.');
          return this.api<T>(
            connection,
            `${this.repositoryPath(repository)}/${path}`,
            method,
            fields,
          );
        },
      },
      () => this.now().toISOString(),
    );
  }

  // #endregion

  // #region Methods

  /** Inspects an unsaved repository binding without writing to GitHub or local settings. @public */
  public async inspectDraftRepository(
    draft: IApplicationSettings,
    repositoryBindingId: string,
  ): Promise<{ defaultBranch: string; workflows: readonly ICiWorkflow[] }> {
    const repository = draft.repositoryBindings.find(
      (item) => item.id === repositoryBindingId && item.enabled,
    );
    const connection = draft.connections.find(
      (item) => item.id === repository?.sourceControlConnectionId && item.kind === 'github',
    );
    if (
      !repository ||
      !connection ||
      connection.kind !== 'github' ||
      connection.workspaceId !== repository.workspaceId
    )
      throw new Error('Choose a repository and a GitHub account in the same workspace.');
    const response = await this.api<{ default_branch: string }>(
      connection,
      `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`,
      'GET',
    );
    const provider = new GitHubCloudProvider({
      ...this._options,
      settings: () => ({
        ...draft,
        repositoryBindings: draft.repositoryBindings.map((item) =>
          item.id === repository.id ? { ...item, defaultBranch: response.default_branch } : item,
        ),
      }),
    });
    return { defaultBranch: response.default_branch, workflows: await provider.listWorkflows() };
  }

  /** Loads a concrete version and the workflow definition without dispatching. @public */
  public async previewDelivery(targetId: string, ref: string): Promise<IDeliveryLaunchPlan> {
    const target = this._options.settings().deliveryTargets?.find((item) => item.id === targetId);
    if (!target?.workflowId || !target.versionInput)
      throw new Error(
        'Bind a workflow and its immutable version input in setup before launching delivery.',
      );
    const workflow = await this.requireWorkflowTarget(target.workflowId);
    if (workflow.repository.id !== target.repositoryBindingId)
      throw new Error('The delivery workflow belongs to another repository.');
    const commit = await this.api<{ sha: string }>(
      workflow.connection,
      `${this.repositoryPath(workflow.repository)}/commits/${encodeURIComponent(ref)}`,
      'GET',
    );
    const document = await this.readWorkflowDocument(
      workflow.connection,
      workflow.repository,
      workflow.workflow.path,
      commit.sha,
    );
    if (!hasWorkflowDispatch(document))
      throw new Error('This revision does not declare workflow_dispatch.');
    if (target.operationInput) {
      const runName =
        typeof document === 'object' && document !== null
          ? (document as Record<string, unknown>)['run-name']
          : undefined;
      if (typeof runName !== 'string' || !runName.includes(`inputs.${target.operationInput}`))
        throw new Error(
          'The workflow run-name must include its operation input so interrupted dispatches can be reconciled.',
        );
    }
    const inputs = {
      ...(target.operationInput ? { [target.operationInput]: 'symphony-operation-preview' } : {}),
      [target.versionInput]: commit.sha,
      ...(target.environmentInput ? { [target.environmentInput]: target.environment } : {}),
    };
    validateDispatchInputs(projectDispatchInputs(document), inputs);
    return {
      targetId,
      targetName: target.displayName,
      repositoryBindingId: target.repositoryBindingId,
      workflowId: target.workflowId,
      workflowPath: workflow.workflow.path,
      ref,
      revision: commit.sha,
      definitionHash: createHash('sha256').update(JSON.stringify(document)).digest('hex'),
      ...(target.operationInput ? { operationInput: target.operationInput } : {}),
      inputs,
    };
  }

  /** Rechecks configuration, version and declared inputs immediately before a write. @public */
  public async checkDelivery(plan: IDeliveryLaunchPlan): Promise<void> {
    const current = await this.previewDelivery(plan.targetId, plan.ref);
    if (JSON.stringify(current) !== JSON.stringify(plan))
      throw new Error('The target, version or workflow changed. Review a new delivery proposal.');
  }

  /** Dispatch follows the already checked version proposal; no automatic retries. @public */
  public dispatchDelivery(plan: IDeliveryLaunchPlan, operationId: string): Promise<ICiRun> {
    return this.dispatchWorkflow(plan.workflowId, plan.ref, {
      inputs: {
        ...plan.inputs,
        ...(plan.operationInput ? { [plan.operationInput]: operationId } : {}),
      },
      requireProof: true,
      ...(plan.operationInput ? { correlationId: operationId } : {}),
    });
  }

  /** Reads the known provider run ID for an accepted, journaled dispatch. @public */
  public async readDeliveryRun(plan: IDeliveryLaunchPlan, runId: string): Promise<ICiRun> {
    const target = await this.requireWorkflowTarget(plan.workflowId);
    if (
      target.repository.id !== plan.repositoryBindingId ||
      !runId.startsWith(`${target.binding.id}:`)
    )
      throw new Error('The run belongs to another delivery repository.');
    const providerId = runId.slice(target.binding.id.length + 1);
    if (!/^\d+$/u.test(providerId)) throw new Error('The delivery run ID is invalid.');
    const run = await this.api<IGitHubWorkflowRunSummary>(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/runs/${providerId}`,
      'GET',
    );
    return this.projectRun(target.binding, target.repository, target.connection, run);
  }

  /** Reads an explicit operation marker; timestamps or branch names never prove ownership. @public */
  public async reconcileDelivery(
    plan: IDeliveryLaunchPlan,
    startedAt: string,
    operationId: string,
  ): Promise<ICiRun | undefined> {
    if (!plan.operationInput) return undefined;
    const target = await this.requireWorkflowTarget(plan.workflowId);
    const response = await this.api<IGitHubWorkflowRunsResponse>(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/workflows/${target.providerWorkflowId}/runs?event=workflow_dispatch&per_page=100`,
      'GET',
    );
    const matching = (response.workflow_runs ?? []).filter(
      (run) =>
        run.display_title?.includes(operationId) &&
        Date.parse(run.created_at ?? '') >= Date.parse(startedAt) - 5000,
    );
    return matching.length === 1
      ? this.projectRun(target.binding, target.repository, target.connection, matching[0]!)
      : undefined;
  }

  /** Repository evidence through the existing governed, account-scoped transport. @public */
  public readDelivery(
    items: readonly IWorkItem[],
    executions: readonly IExecutionRecord[],
  ): Promise<IDeliverySnapshot> {
    return this._deliveryAdapter.refresh(items, executions);
  }

  /**
   * Lists the repositories.
   *
   * @public
   */
  public async listRepositories(): Promise<readonly ISourceControlRepository[]> {
    const settings = this._options.settings();
    const selectedWorkspaceIds = new Set(settings.activeViewScope.workspaceIds);
    return settings.repositoryBindings
      .filter(
        (repository) =>
          repository.enabled &&
          repository.provider === 'github' &&
          selectedWorkspaceIds.has(repository.workspaceId),
      )
      .map((repository) => ({
        id: repository.id,
        owner: repository.owner,
        name: repository.name,
        defaultBranch: repository.defaultBranch,
        externalUrl: `https://${repository.host}/${repository.owner}/${repository.name}`,
      }));
  }

  /**
   * Lists the pull requests.
   *
   * @public
   */
  public async listPullRequests(): Promise<readonly IPullRequestSummary[]> {
    const settings = this._options.settings();
    const selectedWorkspaceIds = new Set(settings.activeViewScope.workspaceIds);
    const repositories = settings.repositoryBindings.filter(
      (repository) =>
        repository.enabled &&
        repository.provider === 'github' &&
        selectedWorkspaceIds.has(repository.workspaceId),
    );
    const results = await Promise.all(
      repositories.map(async (repository): Promise<readonly IPullRequestSummary[]> => {
        const connection = settings.connections.find(
          (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
            candidate.kind === 'github' &&
            candidate.id === repository.sourceControlConnectionId &&
            candidate.workspaceId === repository.workspaceId,
        );
        if (!connection) return [];
        const repositoryPath = `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
        const pullRequests: IGitHubPullRequestResponse[] = [];
        for (let page = 1; ; page += 1) {
          const response = await this.api<readonly IGitHubPullRequestResponse[]>(
            connection,
            `${repositoryPath}/pulls?state=open&per_page=100&page=${page}`,
            'GET',
          );
          pullRequests.push(...response);
          if (response.length < 100) break;
        }
        const detailedPullRequests: IGitHubPullRequestResponse[] = [];
        for (let offset = 0; offset < pullRequests.length; offset += 10) {
          const batch = pullRequests.slice(offset, offset + 10);
          detailedPullRequests.push(
            ...(await Promise.all(
              batch.map(async (pullRequest) => {
                if (
                  pullRequest.mergeable_state &&
                  pullRequest.mergeable_state !== 'unknown' &&
                  pullRequest.mergeable !== null
                ) {
                  return pullRequest;
                }
                try {
                  return await this.api<IGitHubPullRequestResponse>(
                    connection,
                    `${repositoryPath}/pulls/${pullRequest.number}`,
                    'GET',
                  );
                } catch (cause) {
                  if (cause instanceof GitHubRateLimitError) throw cause;
                  return pullRequest;
                }
              }),
            )),
          );
        }
        return detailedPullRequests.map((pullRequest) =>
          this.projectPullRequest(repository, pullRequest),
        );
      }),
    );
    return results.flat().toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  /**
   * Updates one listed pull-request branch with the latest target-branch revision.
   *
   * GitHub creates the merge commit and rejects a current, conflicting, or concurrently changed
   * head. Symphony does not push the default branch or mutate a local checkout.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param pullRequestNumber - Pull request number.
   * @public
   */
  public async updateListedPullRequestBranch(
    repositoryBindingId: string,
    pullRequestNumber: number,
  ): Promise<IPullRequestSummary> {
    const { repository, connection } = this.authoringTarget(repositoryBindingId);
    const repositoryPath = `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
    const pullRequestPath = `${repositoryPath}/pulls/${pullRequestNumber}`;
    const current = await this.api<IGitHubPullRequestResponse>(connection, pullRequestPath, 'GET');
    if (current.merged_at || current.state !== 'open') {
      throw new Error('Only an open pull-request branch can be updated.');
    }
    if (!current.head?.sha) {
      throw new Error('GitHub did not report the pull-request head revision.');
    }
    const baseBranchStatus = this.pullRequestBaseBranchStatus(current);
    if (baseBranchStatus === 'current') return this.projectPullRequest(repository, current);
    if (baseBranchStatus === 'conflicting') {
      throw new Error('Resolve the pull-request branch conflicts before updating it.');
    }
    if (baseBranchStatus !== 'behind') {
      throw new Error('GitHub has not finished calculating the pull-request branch status.');
    }
    await this.api(connection, `${pullRequestPath}/update-branch`, 'PUT', {
      expected_head_sha: current.head.sha,
    });
    const updated = await this.api<IGitHubPullRequestResponse>(connection, pullRequestPath, 'GET');
    return this.projectPullRequest(repository, updated);
  }

  /**
   * Lists the runs.
   *
   * @param scope - Scope.
   * @public
   */
  public async listRuns(
    scope: 'selected' | 'operational' = 'selected',
  ): Promise<readonly ICiRun[]> {
    const settings = this._options.settings();
    const selectedWorkspaceIds = new Set(settings.activeViewScope.workspaceIds);
    return this.listRunsForWorkspaces(
      settings,
      scope === 'operational' ? undefined : selectedWorkspaceIds,
    );
  }

  /**
   * Lists queued runs that explicitly request Symphony's managed local runner, oldest first.
   *
   * @public
   */
  public async listManagedLocalRunCandidates(): Promise<readonly ICiRun[]> {
    const settings = this._options.settings();
    const enabledWorkspaceIds = new Set(
      settings.workspaces
        .filter((workspace) => workspace.localCiEnabled)
        .map((workspace) => workspace.id),
    );
    if (!enabledWorkspaceIds.size) return [];
    const runs = await this.listRunsForWorkspaces(settings, enabledWorkspaceIds);
    return runs
      .filter(
        (run) =>
          enabledWorkspaceIds.has(run.workspaceId) &&
          run.status === 'queued' &&
          this._managedLocalRunIds.has(run.id),
      )
      .toSorted((left, right) =>
        (left.startedAt ?? '9999').localeCompare(right.startedAt ?? '9999'),
      );
  }

  /**
   * Lists the workflows.
   *
   * @public
   */
  public async listWorkflows(): Promise<readonly ICiWorkflow[]> {
    const settings = this._options.settings();
    const selectedWorkspaceIds = new Set(settings.activeViewScope.workspaceIds);
    const bindings = settings.ciBindings.filter(
      (binding) =>
        binding.enabled &&
        binding.provider === 'github-actions' &&
        selectedWorkspaceIds.has(binding.workspaceId),
    );
    const results = await Promise.all(
      bindings.map(async (binding): Promise<readonly ICiWorkflow[]> => {
        const repository = settings.repositoryBindings.find(
          (candidate) =>
            candidate.id === binding.repositoryBindingId &&
            candidate.workspaceId === binding.workspaceId,
        );
        const connection = settings.connections.find(
          (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
            candidate.kind === 'github' &&
            candidate.id === binding.sourceControlConnectionId &&
            candidate.workspaceId === binding.workspaceId,
        );
        if (!repository || !connection) return [];
        const repositoryPath = this.repositoryPath(repository);
        const definitions: NonNullable<IGitHubWorkflowsResponse['workflows']>[number][] = [];
        for (let page = 1; ; page += 1) {
          const response = await this.api<IGitHubWorkflowsResponse>(
            connection,
            `${repositoryPath}/actions/workflows?per_page=100&page=${page}`,
            'GET',
          );
          const pageDefinitions = response.workflows ?? [];
          definitions.push(...pageDefinitions);
          if (pageDefinitions.length < 100) break;
        }
        return Promise.all(
          definitions.map(async (definition) => {
            const path = definition.path?.trim() || `.github/workflows/${definition.id}.yml`;
            const dispatchCapabilities = await this.readDispatchCapabilities(
              connection,
              repository,
              path,
            );
            const workflow: ICiWorkflow = {
              id: `${binding.id}:${definition.id}`,
              workspaceId: binding.workspaceId,
              ciBindingId: binding.id,
              repositoryBindingId: repository.id,
              name:
                definition.name?.trim() || path.split('/').at(-1) || `Workflow ${definition.id}`,
              path,
              state: definition.state === 'active' ? 'active' : 'disabled',
              defaultBranch: repository.defaultBranch,
              supportsManualDispatch: dispatchCapabilities.manualDispatch,
              inputs: dispatchCapabilities.inputs,
              ...(definition.html_url ? { externalUrl: definition.html_url } : {}),
            };
            this._workflowTargets.set(workflow.id, {
              providerWorkflowId: String(definition.id),
              workflow,
              binding,
              repository,
              connection,
              supportsLocalDispatchInput: dispatchCapabilities.localCiInput,
            });
            return workflow;
          }),
        );
      }),
    );
    return results.flat().toSorted((left, right) => left.name.localeCompare(right.name));
  }

  /**
   * Dispatches the workflow.
   *
   * @param workflowId - Workflow id.
   * @param ref - Ref.
   * @param options - Options.
   * @public
   */
  public async dispatchWorkflow(
    workflowId: string,
    ref: string,
    options?: {
      readonly local?: boolean;
      readonly inputs?: Readonly<Record<string, string>>;
      readonly correlationId?: string;
      readonly requireProof?: boolean;
    },
  ): Promise<ICiRun> {
    const target = await this.requireWorkflowTarget(workflowId);
    if (target.workflow.state !== 'active' || !target.workflow.supportsManualDispatch) {
      throw new Error(
        `${target.workflow.name} does not expose an active workflow_dispatch trigger.`,
      );
    }
    if (options?.local && !target.supportsLocalDispatchInput) {
      throw new Error(
        `${target.workflow.name} is not prepared for managed local CI. Declare the workflow_dispatch input "${LOCAL_CI_DISPATCH_INPUT}" on the default branch and request self-hosted, Linux, symphony-local-ci, and symphony-run-\${{ github.run_id }} when it is true.`,
      );
    }
    const definition = await this.readWorkflowDocument(
      target.connection,
      target.repository,
      target.workflow.path,
      ref,
    );
    const inputs = {
      ...(options?.inputs ?? {}),
      ...(options?.local ? { [LOCAL_CI_DISPATCH_INPUT]: 'true' } : {}),
    };
    validateDispatchInputs(projectDispatchInputs(definition), inputs);
    const dispatchedAt = this.now().getTime();
    const repositoryPath = this.repositoryPath(target.repository);
    const dispatched = await this.api<{ workflow_run_id?: number }>(
      target.connection,
      `${repositoryPath}/actions/workflows/${target.providerWorkflowId}/dispatches`,
      'POST',
      {
        ref,
        ...Object.fromEntries(
          Object.entries(inputs).map(([id, value]) => [`inputs[${id}]`, value]),
        ),
      },
      target.connection.hostname === 'github.com'
        ? { 'X-GitHub-Api-Version': '2026-03-10' }
        : undefined,
    );
    if (dispatched.workflow_run_id) {
      const exact = await this.api<IGitHubWorkflowRunSummary>(
        target.connection,
        `${repositoryPath}/actions/runs/${dispatched.workflow_run_id}`,
        'GET',
      );
      return this.projectRun(target.binding, target.repository, target.connection, exact);
    }
    if (options?.requireProof && !options.correlationId)
      throw new Error(
        'The workflow dispatch has no attributable response. Inspect Actions and reconcile before restarting.',
      );
    const pollMilliseconds = this._options.localRunnerPollMilliseconds ?? 2_000;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await this.api<IGitHubWorkflowRunsResponse>(
        target.connection,
        `${repositoryPath}/actions/workflows/${target.providerWorkflowId}/runs?event=workflow_dispatch&branch=${encodeURIComponent(ref)}&per_page=10`,
        'GET',
      );
      const run = (response.workflow_runs ?? []).find((candidate) => {
        const createdAt = Date.parse(candidate.created_at ?? candidate.run_started_at ?? '');
        return (
          Number.isFinite(createdAt) &&
          createdAt >= dispatchedAt - 5_000 &&
          (!options?.correlationId || candidate.display_title?.includes(options.correlationId))
        );
      });
      if (run) {
        return this.projectRun(target.binding, target.repository, target.connection, run);
      }
      await wait(pollMilliseconds);
    }
    throw new Error(
      `GitHub accepted ${target.workflow.name}, but its workflow run did not appear.`,
    );
  }

  /**
   * Returns the read usage.
   *
   * @param repositoryBindingIds - Repository binding ids.
   * @public
   */
  public async readUsage(
    repositoryBindingIds: readonly string[],
  ): Promise<readonly IContinuousIntegrationUsageReport[]> {
    const uniqueIds = [...new Set(repositoryBindingIds)];
    return Promise.all(
      uniqueIds.map(async (repositoryBindingId) => {
        try {
          return await this.readRepositoryUsage(this.usageTarget(repositoryBindingId));
        } catch (cause) {
          return {
            repositoryBindingId,
            error: this.usageError(cause),
          } satisfies IContinuousIntegrationUsageReport;
        }
      }),
    );
  }

  /**
   * Returns the get run details.
   *
   * @param runId - Run id.
   * @public
   */
  public async getRunDetails(runId: string): Promise<ICiRunDetails> {
    const target = this.requireRunTarget(runId);
    let response: IGitHubWorkflowJobsResponse;
    try {
      response = await this.workflowJobs(target);
    } catch (cause) {
      const localDiagnostics = this._localRunnerDiagnostics.get(runId);
      if (!localDiagnostics) throw cause;
      return { runId, jobs: [], localDiagnostics };
    }
    const workflowRun = await this.api<IGitHubWorkflowRunResponse>(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}`,
      'GET',
    ).catch(() => undefined);
    const graphPath = workflowRun?.path?.split('@')[0];
    const workflowGraph: ICiWorkflowGraph | undefined =
      graphPath && workflowRun?.head_sha
        ? await this.readWorkflowDocument(
            target.connection,
            target.repository,
            graphPath,
            workflowRun.head_sha,
          )
            .then((document) => projectWorkflowGraph(document, workflowRun.head_sha!, graphPath))
            .catch(() => ({
              revision: workflowRun.head_sha!,
              path: graphPath,
              jobs: [],
              unresolved: [
                'Workflow definition at this revision is unavailable. Refresh or inspect the workflow on GitHub.',
              ],
            }))
        : undefined;
    const pendingApprovals = await this.pendingApprovals(target).catch(() => undefined);
    const reportedJobs = response.jobs ?? [];
    const jobs =
      workflowRun?.run_attempt && reportedJobs.some((job) => job.run_attempt !== undefined)
        ? reportedJobs.filter((job) => job.run_attempt === workflowRun.run_attempt)
        : currentAttemptJobs(reportedJobs);
    const logJobs = [
      ...jobs.filter((job) => job.conclusion === 'failure').toReversed(),
      ...jobs.filter((job) => job.status === 'in_progress'),
    ].filter(
      (job, index, candidates) =>
        job.id !== undefined &&
        candidates.findIndex((candidate) => candidate.id === job.id) === index,
    );
    const [logOutput, failureLog, activeDiagnostics] = await Promise.all([
      this.firstAvailableJobLog(target, logJobs),
      jobs.some((job) => job.conclusion === 'failure')
        ? this.failedRunLog(target).catch(() => undefined)
        : Promise.resolve(undefined),
      this._activeLocalRunners
        .get(runId)
        ?.diagnostics()
        .catch(() => undefined),
    ]);
    const localDiagnostics = activeDiagnostics ?? this._localRunnerDiagnostics.get(runId);
    return {
      runId,
      ...(workflowGraph ? { workflowGraph } : {}),
      ...(pendingApprovals ? { pendingApprovals } : {}),
      jobs: jobs.map((job, jobIndex) => {
        const jobId = String(job.id ?? jobIndex + 1);
        const candidates =
          workflowGraph?.jobs.filter(
            (node) =>
              !node.name.includes('${{') &&
              (job.name === node.name ||
                job.name === node.id ||
                (node.matrix && job.name?.startsWith(`${node.name} (`))),
          ) ?? [];
        const status = normalizeLogStatus(job.status, job.conclusion);
        const stepStatuses = normalizeJobStepStatuses(status, job.steps ?? []);
        return {
          id: `${runId}:job:${jobId}`,
          ...(candidates.length === 1 ? { workflowJobId: candidates[0]!.id } : {}),
          name: job.name?.trim() || `Job ${jobIndex + 1}`,
          status,
          ...(job.started_at ? { startedAt: job.started_at } : {}),
          ...(job.completed_at ? { finishedAt: job.completed_at } : {}),
          ...(job.html_url ? { externalUrl: job.html_url } : {}),
          steps: (job.steps ?? []).map((step, stepIndex) => ({
            id: `${runId}:job:${jobId}:step:${step.number ?? stepIndex + 1}`,
            name: step.name?.trim() || `Step ${stepIndex + 1}`,
            status: stepStatuses[stepIndex] ?? 'skipped',
            ...(step.started_at ? { startedAt: step.started_at } : {}),
            ...(step.completed_at ? { finishedAt: step.completed_at } : {}),
          })),
        };
      }),
      ...(logOutput ? { logOutput } : {}),
      ...(failureLog ? { failureLog } : {}),
      ...(localDiagnostics ? { localDiagnostics } : {}),
    };
  }

  /**
   * Returns the get run log chunk.
   *
   * @param runId - Run id.
   * @param kind - Kind.
   * @param offset - Offset.
   * @public
   */
  public async getRunLogChunk(
    runId: string,
    kind: 'output' | 'failure',
    offset: number,
  ): Promise<ICiRunLogChunk> {
    const target = this.requireRunTarget(runId);
    const token = await this._options.token?.(target.connection);
    if (!token) {
      throw new Error(`Sign in to GitHub for ${target.connection.displayName} before continuing.`);
    }
    const cacheKey = `${runId}:${kind}`;
    const cached = kind === 'failure' ? this._completedRunLogs.get(cacheKey) : undefined;
    const redacted =
      cached ??
      redactedLog(
        await this.execute(
          resolveAllowedCommand('gh'),
          [
            'run',
            'view',
            target.runId,
            '--repo',
            `${target.repository.owner}/${target.repository.name}`,
            kind === 'failure' ? '--log-failed' : '--log',
          ],
          this.githubEnvironment(token),
          'Unable to read GitHub Actions output',
        ),
      );
    if (kind === 'failure') {
      this._completedRunLogs.set(cacheKey, redacted);
      while (this._completedRunLogs.size > 10) {
        const oldest = this._completedRunLogs.keys().next().value;
        if (!oldest) break;
        this._completedRunLogs.delete(oldest);
      }
    }
    const safeOffset = Math.min(Math.max(0, offset), redacted.length);
    const content = redacted.slice(safeOffset, safeOffset + 60_000);
    const nextOffset = safeOffset + content.length;
    return {
      runId,
      kind,
      offset: safeOffset,
      content,
      nextOffset,
      complete: nextOffset >= redacted.length,
    };
  }

  /**
   * Cancels the run.
   *
   * @param runId - Run id.
   * @public
   */
  public async cancelRun(runId: string): Promise<void> {
    await this.mutateRun(runId, 'cancel');
  }

  /**
   * Returns the rerun.
   *
   * @param runId - Run id.
   * @public
   */
  public async rerun(runId: string): Promise<void> {
    await this.mutateRun(runId, 'rerun');
  }

  /**
   * Runs the locally.
   *
   * @param runId - Run id.
   * @param executionId - Execution id.
   * @param runtimeRoot - Runtime root.
   * @param signal - Signal.
   * @public
   */
  public async runLocally(
    runId: string,
    executionId: string,
    runtimeRoot: string,
    signal: AbortSignal,
  ): Promise<ILocalCiExecution> {
    const target = this.requireRunTarget(runId);
    if (!this._options.localRunner) {
      throw new Error('Managed local CI is unavailable on this installation.');
    }
    const repositoryPath = this.repositoryPath(target.repository);
    const runLabel = `symphony-run-${target.runId}`;
    const runnerName = `symphony-${target.runId}-${executionId.slice(-12)}`.slice(0, 64);
    const startedAt = this.now().toISOString();
    let expectedAttempt: number | undefined;
    let runner: IGithubLocalRunnerSession;
    try {
      this.rememberLocalRunnerDiagnostics(
        runId,
        'Phase: Preparing GitHub workflow for local execution\nRunner: not started yet',
      );
      expectedAttempt = await this.prepareWorkflowRun(target, runId, signal);
      this.rememberLocalRunnerDiagnostics(
        runId,
        `Phase: Waiting for GitHub to publish local jobs\nRequired runner label: ${runLabel}\nRunner: not started yet`,
      );
      await this.waitForManagedLocalJobs(target, runId, runLabel, expectedAttempt, signal);
      this.rememberLocalRunnerDiagnostics(
        runId,
        'Phase: Requesting the temporary GitHub runner registration\nRunner: not started yet',
      );
      const registration = await this.api<IGitHubRunnerRegistrationTokenResponse>(
        target.connection,
        `${repositoryPath}/actions/runners/registration-token`,
        'POST',
      );
      if (!registration.token) {
        throw new Error('GitHub did not issue a local runner registration token.');
      }
      const localCiSettings = this._options.settings();
      const capacity = this._options.localCiHostCapacity
        ? this._options.localCiHostCapacity(runtimeRoot)
        : detectLocalCiHostCapacity(runtimeRoot, localCiSettings);
      const preset = resolveLocalCiResourcePreset(
        localCiSettings.localCi.resourcePreset,
        capacity,
        localCiSettings.localCi.customResources,
      );
      if (!preset.supported) {
        throw new Error(`Local CI cannot start on this Mac. ${preset.unavailableReason}`);
      }
      this.rememberLocalRunnerDiagnostics(
        runId,
        [
          'Phase: Starting managed Linux VM',
          `CPUs: ${preset.resources.cpus}`,
          `Memory: ${preset.resources.memoryGiB} GiB`,
          `Disk: ${preset.resources.diskGiB} GiB`,
          `Cache: ${preset.resources.cacheGiB} GiB`,
        ].join('\n'),
      );
      if (!this._options.localCiGuest) {
        throw new Error('Managed local CI has no configured guest image resolver.');
      }
      const guest = await this._options.localCiGuest(target.repository.id, signal);
      runner = await this._options.localRunner.start(
        {
          image: guest.image,
          ...(guest.setupScript ? { setupScript: guest.setupScript } : {}),
          ...(guest.reuse ? { reuse: true } : {}),
          ...(guest.warmInstanceKey ? { warmInstanceKey: guest.warmInstanceKey } : {}),
          repositoryUrl: `https://${target.repository.host}/${target.repository.owner}/${target.repository.name}`,
          registrationToken: registration.token,
          runnerName,
          labels: ['symphony-local-ci', runLabel],
          runtimeRoot,
          resources: preset.resources,
          storageLimitGiB: localCiSettings.localCi.storageLimitGiB,
          minimumFreeDiskGiB: localCiSettings.runtime.minimumFreeDiskGiB,
        },
        signal,
      );
    } catch (cause) {
      this.rememberLocalRunnerDiagnostics(
        runId,
        `Phase: Local runner setup failed\nError: ${cause instanceof Error ? cause.message : 'Unknown local runner error'}`,
      );
      throw cause;
    }
    this._activeLocalRunners.set(runId, runner);
    let terminal: IGitHubWorkflowRunResponse;
    try {
      terminal = await this.waitForWorkflowRun(target, runner.completion, signal);
    } finally {
      const diagnostics = await runner.diagnostics().catch(() => undefined);
      if (diagnostics) {
        this.rememberLocalRunnerDiagnostics(runId, diagnostics);
      }
      this._activeLocalRunners.delete(runId);
      await runner.stop();
      await this.deleteRunner(target, runner.runnerName);
    }
    const state: ILocalCiExecution['state'] = signal.aborted
      ? 'cancelled'
      : workflowRunState(terminal.status, terminal.conclusion);
    const localDiagnostics = this._localRunnerDiagnostics.get(runId);
    const failureLog =
      state === 'failed' ? await this.failedRunLog(target).catch(() => undefined) : undefined;
    return {
      id: executionId,
      workspaceId: target.repository.workspaceId,
      repositoryBindingId: target.repository.id,
      ciRunId: runId,
      ...((terminal.run_attempt ?? expectedAttempt)
        ? { runAttempt: terminal.run_attempt ?? expectedAttempt }
        : {}),
      ...(terminal.head_sha ? { revision: terminal.head_sha } : {}),
      state,
      startedAt,
      finishedAt: this.now().toISOString(),
      ...(failureLog ? { failureLog } : {}),
      ...(localDiagnostics ? { localDiagnostics } : {}),
      runner: {
        kind: 'managed-linux-vm',
        os: runner.os,
        architecture: runner.architecture,
        label: runLabel,
        imageVersion: runner.imageVersion,
      },
    };
  }

  /**
   * Publishes the pull request.
   *
   * @param execution - Execution.
   * @param workItem - Work item.
   * @public
   */
  public async publishPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
  ): Promise<IPullRequestReference> {
    const workspacePath = execution.workspacePath;
    const branch = execution.workspaceReference;
    if (!workspacePath || !branch || !existsSync(workspacePath)) {
      throw new Error('The managed implementation workspace is not available.');
    }
    const { repository, connection } = this.deliveryTarget(execution, workItem);
    if (branch === repository.defaultBranch) {
      throw new Error('The default branch cannot be delivered as an implementation branch.');
    }
    const realWorkspacePath = realpathSync(workspacePath);
    const currentBranch = await this.gitOutput(realWorkspacePath, ['branch', '--show-current']);
    if (currentBranch !== branch) {
      throw new Error(
        `The managed workspace is on ${currentBranch || 'a detached revision'}, not ${branch}.`,
      );
    }
    const origin = await this.gitOutput(realWorkspacePath, ['remote', 'get-url', 'origin']);
    if (!this.matchesRepository(origin, repository)) {
      throw new Error('The managed workspace origin no longer matches the configured repository.');
    }

    const status = await this.gitOutput(realWorkspacePath, [
      'status',
      '--porcelain',
      '--untracked-files=all',
    ]);
    if (status) {
      await this.git(realWorkspacePath, ['add', '--all']);
      await this.git(realWorkspacePath, ['commit', '-m', this.commitTitle(workItem)]);
    }
    const baseReference = await this.resolveBaseReference(
      realWorkspacePath,
      repository.defaultBranch,
    );
    const ahead = Number(
      await this.gitOutput(realWorkspacePath, ['rev-list', '--count', `${baseReference}..HEAD`]),
    );
    if (!Number.isInteger(ahead) || ahead < 1) {
      throw new Error(
        `The implementation branch has no commits ahead of ${repository.defaultBranch}.`,
      );
    }

    await this.configureGitAuthentication(connection);
    await this.git(realWorkspacePath, ['push', '--set-upstream', 'origin', branch]);

    const repositoryPath = `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
    const head = `${repository.owner}:${branch}`;
    const existing = await this.api<readonly IGitHubPullRequestResponse[]>(
      connection,
      `${repositoryPath}/pulls?state=open&head=${encodeURIComponent(head)}`,
      'GET',
    );
    if (
      !existing[0] &&
      execution.agenticDeliveryId &&
      execution.agenticDeliveryPolicy?.replacementPullRequestEnabled !== true
    ) {
      throw new Error(
        'The managed pull request is no longer open and replacement pull requests are disabled.',
      );
    }
    const pullRequest =
      (await this.linkExistingPullRequest(
        connection,
        repositoryPath,
        existing[0],
        workItem,
        execution,
        repository,
      )) ??
      (await this.api<IGitHubPullRequestResponse>(connection, `${repositoryPath}/pulls`, 'POST', {
        title: `${workItem.externalId} ${workItem.title}`.trim(),
        head: branch,
        base: repository.defaultBranch,
        body: this.pullRequestBody(workItem, execution, repository),
      }));
    return {
      number: pullRequest.number,
      externalUrl: pullRequest.html_url,
      branchUrl: `https://${repository.host}/${repository.owner}/${repository.name}/tree/${this.branchPath(branch)}`,
    };
  }

  /**
   * Branches an operator can pick as the source or the target of a new pull request. Paging is
   * bounded: repositories with more branches than that are unusable in a picker anyway.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public async listBranches(repositoryBindingId: string): Promise<IPullRequestBranchInventory> {
    const { repository, connection } = this.authoringTarget(repositoryBindingId);
    const repositoryPath = this.repositoryPath(repository);
    const branches: IGitHubBranchResponse[] = [];
    for (let page = 1; page <= GITHUB_BRANCH_PAGE_LIMIT; page += 1) {
      const response = await this.api<readonly IGitHubBranchResponse[]>(
        connection,
        `${repositoryPath}/branches?per_page=100&page=${page}`,
        'GET',
      );
      branches.push(...response);
      if (response.length < 100) break;
    }
    return {
      repositoryBindingId: repository.id,
      defaultBranch: repository.defaultBranch,
      branches: branches
        .filter((branch): branch is IGitHubBranchResponse & { name: string } =>
          Boolean(branch.name),
        )
        .map((branch) => ({ name: branch.name, protected: branch.protected ?? false }))
        .toSorted((left, right) => left.name.localeCompare(right.name)),
    };
  }

  /**
   * Compares two branches the way GitHub does before a pull request is opened.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param targetBranch - Target branch.
   * @param sourceBranch - Source branch.
   * @public
   */
  public async compareBranches(
    repositoryBindingId: string,
    targetBranch: string,
    sourceBranch: string,
  ): Promise<IPullRequestComparison> {
    const { repository, connection } = this.authoringTarget(repositoryBindingId);
    if (targetBranch === sourceBranch) {
      throw new Error('A pull request needs two different branches.');
    }
    const repositoryPath = this.repositoryPath(repository);
    const comparison = await this.api<IGitHubComparisonResponse>(
      connection,
      `${repositoryPath}/compare/${this.branchPath(targetBranch)}...${this.branchPath(sourceBranch)}`,
      'GET',
    );
    const existing = await this.api<readonly IGitHubPullRequestResponse[]>(
      connection,
      `${repositoryPath}/pulls?state=open&head=${encodeURIComponent(`${repository.owner}:${sourceBranch}`)}&base=${encodeURIComponent(targetBranch)}`,
      'GET',
    );
    const commits = (comparison.commits ?? [])
      .slice(-GITHUB_COMPARISON_COMMIT_LIMIT)
      .toReversed()
      .map((commit) => {
        const author = commit.author?.login ?? commit.commit?.author?.name;
        const committedAt = commit.commit?.author?.date;
        return {
          revision: commit.sha ?? 'unknown',
          title: (commit.commit?.message ?? '').split('\n')[0] ?? '',
          ...(author ? { author } : {}),
          ...(committedAt ? { committedAt } : {}),
        };
      });
    return {
      repositoryBindingId: repository.id,
      targetBranch,
      sourceBranch,
      status: comparison.status ?? 'identical',
      aheadBy: comparison.ahead_by ?? 0,
      behindBy: comparison.behind_by ?? 0,
      changedFiles: comparison.files?.length ?? 0,
      commits,
      ...(existing[0]
        ? {
            existingPullRequest: {
              number: existing[0].number,
              externalUrl: existing[0].html_url,
            },
          }
        : {}),
    };
  }

  /**
   * Opens a pull request an operator authored by hand. Unlike delivery, nothing is committed or
   * pushed here: both branches already exist on the provider.
   *
   * @param draft - Draft.
   * @public
   */
  public async createPullRequest(draft: IPullRequestDraft): Promise<IPullRequestSummary> {
    const { repository, connection } = this.authoringTarget(draft.repositoryBindingId);
    const title = draft.title.trim();
    if (!title) throw new Error('Enter a pull-request title.');
    if (draft.sourceBranch === draft.targetBranch) {
      throw new Error('A pull request needs two different branches.');
    }
    const created = await this.api<IGitHubPullRequestResponse>(
      connection,
      `${this.repositoryPath(repository)}/pulls`,
      'POST',
      {
        title,
        head: draft.sourceBranch,
        base: draft.targetBranch,
        body: draft.body,
        draft: draft.draft,
      },
    );
    return this.projectPullRequest(repository, created);
  }

  /**
   * Inspects the pull request.
   *
   * @param execution - Execution.
   * @param workItem - Work item.
   * @public
   */
  public async inspectPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
  ): Promise<IPullRequestStatus> {
    const pullRequest = execution.pullRequest;
    if (!pullRequest) throw new Error('The execution has no pull request to inspect.');
    const { repository, connection } = this.deliveryTarget(execution, workItem);
    const repositoryPath = `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
    const response = await this.api<IGitHubPullRequestResponse>(
      connection,
      `${repositoryPath}/pulls/${pullRequest.number}`,
      'GET',
    );
    return {
      state: response.merged_at ? 'merged' : (response.state ?? 'closed'),
      draft: response.draft ?? false,
      ...(response.head?.sha ? { headCommitSha: response.head.sha } : {}),
      baseBranchStatus: this.pullRequestBaseBranchStatus(response),
      ...(response.head?.ref ? { sourceBranch: response.head.ref } : {}),
      ...(response.base?.ref ? { targetBranch: response.base.ref } : {}),
    };
  }

  /**
   * Advances one Symphony-managed pull-request branch to the current base revision.
   *
   * GitHub owns the merge commit and rejects a stale expected head or an unresolvable conflict.
   * The adapter never rebases, force-pushes, merges the pull request, or touches the default
   * branch directly.
   *
   * @param execution - Execution that owns the retained managed branch.
   * @param workItem - Work item that resolves the repository binding.
   * @param expectedHeadCommitSha - Head observed immediately before the update.
   * @public
   */
  public async updatePullRequestBranch(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    expectedHeadCommitSha: string,
  ): Promise<void> {
    const pullRequest = execution.pullRequest;
    const branch = execution.workspaceReference;
    if (!pullRequest || !branch) {
      throw new Error('The execution has no managed pull-request branch to update.');
    }
    const { repository, connection } = this.deliveryTarget(execution, workItem);
    if (branch === repository.defaultBranch) {
      throw new Error('The default branch cannot be updated as an implementation branch.');
    }
    const repositoryPath = `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
    await this.api(
      connection,
      `${repositoryPath}/pulls/${pullRequest.number}/update-branch`,
      'PUT',
      { expected_head_sha: expectedHeadCommitSha },
    );
  }

  /**
   * Workspace a listed run or workflow belongs to. Local runs are decided per workspace, so the
   * caller can refuse one before anything is dispatched to GitHub. An unknown id means the
   * listing is stale and the run itself reports that.
   *
   * @param runId - Run id.
   * @public
   */
  public runWorkspaceId(runId: string): string | undefined {
    return this._runTargets.get(runId)?.repository.workspaceId;
  }

  /**
   * Returns the workflow workspace ID.
   *
   * @param workflowId - Workflow id.
   * @public
   */
  public async workflowWorkspaceId(workflowId: string): Promise<string> {
    return (await this.requireWorkflowTarget(workflowId)).repository.workspaceId;
  }

  private async listRunsForWorkspaces(
    settings: IApplicationSettings,
    workspaceIds?: ReadonlySet<string>,
  ): Promise<readonly ICiRun[]> {
    const bindings = settings.ciBindings.filter(
      (binding) =>
        binding.enabled &&
        binding.provider === 'github-actions' &&
        (workspaceIds === undefined || workspaceIds.has(binding.workspaceId)),
    );
    const results = await Promise.all(
      bindings.map(async (binding): Promise<readonly ICiRun[]> => {
        const repository = settings.repositoryBindings.find(
          (candidate) =>
            candidate.id === binding.repositoryBindingId &&
            candidate.workspaceId === binding.workspaceId,
        );
        const connection = settings.connections.find(
          (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
            candidate.kind === 'github' &&
            candidate.id === binding.sourceControlConnectionId &&
            candidate.workspaceId === binding.workspaceId,
        );
        if (!repository || !connection) return [];
        const response = await this.api<IGitHubWorkflowRunsResponse>(
          connection,
          `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/actions/runs?per_page=50`,
          'GET',
        );
        return Promise.all(
          (response.workflow_runs ?? []).map((run) =>
            this.projectRun(binding, repository, connection, run),
          ),
        );
      }),
    );
    return results.flat();
  }

  private async requireWorkflowTarget(workflowId: string): Promise<IWorkflowTarget> {
    const listedTarget = this._workflowTargets.get(workflowId);
    if (listedTarget) {
      const settings = this._options.settings();
      if (!settings.activeViewScope.workspaceIds.includes(listedTarget.binding.workspaceId))
        throw new Error('Select the workflow workspace before continuing.');
      const currentBinding = settings.ciBindings.find(
        (item) => item.id === listedTarget.binding.id && item.enabled,
      );
      const currentRepository = settings.repositoryBindings.find(
        (item) => item.id === listedTarget.repository.id && item.enabled,
      );
      const currentConnection = settings.connections.find(
        (item) => item.id === listedTarget.connection.id && item.kind === 'github',
      );
      if (
        JSON.stringify(currentBinding) === JSON.stringify(listedTarget.binding) &&
        JSON.stringify(currentRepository) === JSON.stringify(listedTarget.repository) &&
        JSON.stringify(currentConnection) === JSON.stringify(listedTarget.connection)
      )
        return listedTarget;
      this._workflowTargets.delete(workflowId);
    }

    await this.listWorkflows();
    const restoredTarget = this._workflowTargets.get(workflowId);
    if (!restoredTarget) {
      throw new Error(`The selected GitHub Actions workflow is no longer available: ${workflowId}`);
    }
    return restoredTarget;
  }

  private async projectRun(
    binding: ICiBinding,
    repository: IRepositoryBinding,
    connection: Extract<ProviderConnection, { kind: 'github' }>,
    run: IGitHubWorkflowRunSummary,
  ): Promise<ICiRun> {
    const id = `${binding.id}:${run.id}`;
    const target = {
      runId: String(run.id),
      repository,
      connection,
      ...(run.workflow_id ? { workflowId: run.workflow_id } : {}),
      ...(run.head_branch ? { branch: run.head_branch } : {}),
    };
    this._runTargets.set(id, target);
    const listedStatus = normalizeRunStatus(run.status, run.conclusion);
    this._managedLocalRunIds.delete(id);
    const queuedProjection =
      listedStatus === 'queued' ? await this.reconcileQueuedRunStatus(target) : undefined;
    if (queuedProjection?.managedLocal) this._managedLocalRunIds.add(id);
    const status = queuedProjection?.status ?? listedStatus;
    return {
      id,
      workspaceId: binding.workspaceId,
      ciBindingId: binding.id,
      repositoryBindingId: repository.id,
      ...(run.workflow_id ? { workflowId: `${binding.id}:${run.workflow_id}` } : {}),
      name: run.name ?? run.display_title ?? `Run ${run.id}`,
      ...(run.display_title ? { title: run.display_title } : {}),
      ...(run.event ? { event: run.event } : {}),
      ...(run.actor?.login ? { actor: run.actor.login } : {}),
      ...(run.run_number ? { runNumber: run.run_number } : {}),
      status,
      ...(run.head_branch ? { branch: run.head_branch } : {}),
      ...(run.head_sha ? { revision: run.head_sha } : {}),
      ...(run.html_url ? { externalUrl: run.html_url } : {}),
      ...((run.run_started_at ?? run.created_at)
        ? { startedAt: run.run_started_at ?? run.created_at }
        : {}),
      ...(run.updated_at && run.status === 'completed' ? { finishedAt: run.updated_at } : {}),
      ...(run.run_attempt ? { runAttempt: run.run_attempt } : {}),
    };
  }

  private async readWorkflowDocument(
    connection: Extract<ProviderConnection, { kind: 'github' }>,
    repository: IRepositoryBinding,
    path: string,
    revision: string,
  ): Promise<unknown> {
    const response = await this.api<IGitHubContentResponse>(
      connection,
      `${this.repositoryPath(repository)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(revision)}`,
      'GET',
    );
    if (response.encoding !== 'base64' || !response.content || response.content.length > 2_000_000)
      throw new Error('The workflow definition is unavailable or too large.');
    return parseYaml(Buffer.from(response.content.replaceAll('\n', ''), 'base64').toString('utf8'));
  }

  private async pendingApprovals(target: IRunTarget): Promise<readonly ICiPendingApproval[]> {
    const approvals = await this.api<
      readonly {
        environment: { id: number; name: string };
        current_user_can_approve: boolean;
        wait_timer?: number;
        wait_timer_started_at?: string | null;
      }[]
    >(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}/pending_deployments`,
      'GET',
    );
    return approvals.map((approval) => ({
      environmentId: approval.environment.id,
      environment: approval.environment.name,
      canApprove: approval.current_user_can_approve,
      ...(approval.wait_timer && approval.wait_timer_started_at
        ? {
            waitUntil: new Date(
              Date.parse(approval.wait_timer_started_at) + approval.wait_timer * 60_000,
            ).toISOString(),
          }
        : {}),
    }));
  }

  /** Rechecks the actual run revision and reviewer authority before approving. @public */
  public async reviewPendingApprovals(
    runId: string,
    revision: string,
    environmentIds: readonly number[],
    decision: 'approved' | 'rejected',
    comment: string,
  ): Promise<void> {
    await this.checkPendingApproval(runId, revision, environmentIds);
    const target = this.requireRunTarget(runId);
    await this.api(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}/pending_deployments`,
      'POST',
      { environment_ids: environmentIds, state: decision, comment },
    );
  }

  /** Checks version, timers and current reviewer authority without changing the run. @public */
  public async checkPendingApproval(
    runId: string,
    revision: string,
    environmentIds: readonly number[],
  ): Promise<void> {
    const target = this.requireRunTarget(runId);
    const run = await this.api<IGitHubWorkflowRunResponse>(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}`,
      'GET',
    );
    if (run.head_sha !== revision)
      throw new Error('The run revision changed. Refresh before reviewing.');
    const approvals = await this.pendingApprovals(target);
    if (
      !environmentIds.every((id) =>
        approvals.some(
          (approval) =>
            approval.environmentId === id &&
            approval.canApprove &&
            (!approval.waitUntil || Date.parse(approval.waitUntil) <= this.now().getTime()),
        ),
      )
    )
      throw new Error(
        'The approval changed, is waiting, or this account cannot approve it. Refresh the run.',
      );
  }

  /** Revalidates manual dispatch inputs against the selected revision. @public */
  public async checkWorkflowDispatch(
    workflowId: string,
    ref: string,
    inputs: Readonly<Record<string, string>>,
  ): Promise<void> {
    const target = await this.requireWorkflowTarget(workflowId);
    if (!target.workflow.supportsManualDispatch || target.workflow.state !== 'active')
      throw new Error('This workflow cannot be dispatched.');
    validateDispatchInputs(
      projectDispatchInputs(
        await this.readWorkflowDocument(
          target.connection,
          target.repository,
          target.workflow.path,
          ref,
        ),
      ),
      inputs,
    );
  }

  /** A declared operation marker enables proof after a lost manual-dispatch response. @public */
  public async workflowOperationInput(
    workflowId: string,
    ref: string,
  ): Promise<string | undefined> {
    const target = await this.requireWorkflowTarget(workflowId);
    const document = await this.readWorkflowDocument(
      target.connection,
      target.repository,
      target.workflow.path,
      ref,
    );
    const configured = this._options
      .settings()
      .deliveryTargets?.find((entry) => entry.workflowId === workflowId)?.operationInput;
    const name = configured ?? 'symphony_operation_id';
    const input = projectDispatchInputs(document).find((entry) => entry.id === name);
    const runName =
      typeof document === 'object' && document !== null
        ? (document as Record<string, unknown>)['run-name']
        : undefined;
    return input?.type === 'string' &&
      typeof runName === 'string' &&
      runName.includes(`inputs.${name}`)
      ? name
      : undefined;
  }

  /** Reads an exact unique operation marker, independently of a mutable branch. @public */
  public async reconcileWorkflowDispatch(
    workflowId: string,
    operationId: string,
    startedAt: string,
  ): Promise<ICiRun | undefined> {
    const target = await this.requireWorkflowTarget(workflowId);
    const response = await this.api<IGitHubWorkflowRunsResponse>(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/workflows/${target.providerWorkflowId}/runs?event=workflow_dispatch&per_page=100`,
      'GET',
    );
    const matches = (response.workflow_runs ?? []).filter(
      (run) =>
        run.display_title?.includes(operationId) &&
        Date.parse(run.created_at ?? '') >= Date.parse(startedAt) - 5000,
    );
    return matches.length === 1
      ? this.projectRun(target.binding, target.repository, target.connection, matches[0]!)
      : undefined;
  }

  /** An exact review comment marker proves an accepted approval after an interrupted response. @public */
  public async hasApprovalReceipt(
    runId: string,
    operationId: string,
    environmentIds: readonly number[],
  ): Promise<boolean> {
    const target = this.requireRunTarget(runId);
    const reviews = await this.api<
      readonly { comment: string; environments: readonly { id: number }[] }[]
    >(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}/approvals`,
      'GET',
    );
    return reviews.some(
      (review) =>
        review.comment.includes(`[Symphony operation ${operationId}]`) &&
        environmentIds.every((id) =>
          review.environments.some((environment) => environment.id === id),
        ),
    );
  }

  /** Reads a known CI run by its neutral ID after restart. @public */
  public async readKnownRun(runId: string): Promise<ICiRun> {
    const target = this.requireRunTarget(runId);
    const run = await this.api<IGitHubWorkflowRunSummary>(
      target.connection,
      `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}`,
      'GET',
    );
    const binding = this._options
      .settings()
      .ciBindings.find(
        (item) =>
          runId.startsWith(`${item.id}:`) && item.repositoryBindingId === target.repository.id,
      );
    if (!binding) throw new Error('The CI binding changed. Refresh Actions.');
    return this.projectRun(binding, target.repository, target.connection, run);
  }

  private async readDispatchCapabilities(
    connection: Extract<ProviderConnection, { kind: 'github' }>,
    repository: IRepositoryBinding,
    workflowPath: string,
  ): Promise<{
    manualDispatch: boolean;
    localCiInput: boolean;
    inputs: readonly ICiDispatchInput[];
  }> {
    try {
      const encodedPath = workflowPath
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
      const response = await this.api<IGitHubContentResponse>(
        connection,
        `${this.repositoryPath(repository)}/contents/${encodedPath}?ref=${encodeURIComponent(repository.defaultBranch)}`,
        'GET',
      );
      if (response.type !== 'file' || response.encoding !== 'base64' || !response.content) {
        return { manualDispatch: false, localCiInput: false, inputs: [] };
      }
      const source = Buffer.from(response.content.replaceAll('\n', ''), 'base64').toString('utf8');
      const document = parseYaml(source);
      return {
        manualDispatch: hasWorkflowDispatch(document),
        localCiInput: declaresLocalCiDispatchInput(document),
        inputs: projectDispatchInputs(document),
      };
    } catch (cause) {
      if (cause instanceof GitHubRateLimitError) throw cause;
      return { manualDispatch: false, localCiInput: false, inputs: [] };
    }
  }

  private async reconcileQueuedRunStatus(
    target: IRunTarget,
  ): Promise<{ readonly status: ICiRun['status']; readonly managedLocal: boolean }> {
    try {
      const response = await this.api<IGitHubWorkflowJobsResponse>(
        target.connection,
        `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}/jobs?filter=all&per_page=100`,
        'GET',
      );
      const jobs = currentAttemptJobs(response.jobs ?? []);
      const status = jobs.some(
        (job) => normalizeLogStatus(job.status, job.conclusion) === 'in-progress',
      )
        ? 'in-progress'
        : 'queued';
      return {
        status,
        managedLocal: this.hasManagedLocalJobs(jobs, `symphony-run-${target.runId}`),
      };
    } catch (cause) {
      if (cause instanceof GitHubRateLimitError) throw cause;
      return { status: 'queued', managedLocal: false };
    }
  }

  private hasManagedLocalJobs(
    jobs: readonly NonNullable<IGitHubWorkflowJobsResponse['jobs']>[number][],
    runLabel: string,
  ): boolean {
    const pendingJobs = jobs.filter((job) => job.status !== 'completed');
    if (!pendingJobs.length) return false;
    const required = ['self-hosted', 'linux', 'symphony-local-ci', runLabel].map((label) =>
      label.toLowerCase(),
    );
    return pendingJobs.every((job) => {
      const labels = new Set((job.labels ?? []).map((label) => label.toLowerCase()));
      return required.every((label) => labels.has(label));
    });
  }

  private async workflowJobs(target: IRunTarget): Promise<IGitHubWorkflowJobsResponse> {
    try {
      return await this.api<IGitHubWorkflowJobsResponse>(
        target.connection,
        `${this.repositoryPath(target.repository)}/actions/runs/${target.runId}/jobs?filter=all&per_page=100`,
        'GET',
      );
    } catch {
      return this.workflowJobsFromCli(target);
    }
  }

  private async workflowJobsFromCli(target: IRunTarget): Promise<IGitHubWorkflowJobsResponse> {
    const token = await this._options.token?.(target.connection);
    if (!token) {
      throw new Error(`Sign in to GitHub for ${target.connection.displayName} before continuing.`);
    }
    const output = await this.execute(
      resolveAllowedCommand('gh'),
      [
        'run',
        'view',
        target.runId,
        '--repo',
        `${target.repository.owner}/${target.repository.name}`,
        '--json',
        'jobs',
      ],
      this.githubEnvironment(token),
      'Unable to read GitHub Actions jobs',
    );
    const response = JSON.parse(output) as IGitHubCliWorkflowJobsResponse;
    return {
      jobs: (response.jobs ?? []).map((job) => ({
        ...(job.databaseId !== undefined ? { id: job.databaseId } : {}),
        ...(job.name ? { name: job.name } : {}),
        ...(job.status ? { status: job.status } : {}),
        ...(job.conclusion !== undefined ? { conclusion: job.conclusion } : {}),
        ...(job.startedAt ? { started_at: job.startedAt } : {}),
        ...(job.completedAt !== undefined ? { completed_at: job.completedAt } : {}),
        ...(job.url ? { html_url: job.url } : {}),
        steps: (job.steps ?? []).map((step) => ({
          ...(step.number !== undefined ? { number: step.number } : {}),
          ...(step.name ? { name: step.name } : {}),
          ...(step.status ? { status: step.status } : {}),
          ...(step.conclusion !== undefined ? { conclusion: step.conclusion } : {}),
          ...(step.startedAt !== undefined ? { started_at: step.startedAt } : {}),
          ...(step.completedAt !== undefined ? { completed_at: step.completedAt } : {}),
        })),
      })),
    };
  }

  private async firstAvailableJobLog(
    target: IRunTarget,
    jobs: readonly NonNullable<IGitHubWorkflowJobsResponse['jobs']>[number][],
  ): Promise<string | undefined> {
    const unavailable: string[] = [];
    for (const job of jobs) {
      if (job.id === undefined) continue;
      try {
        const output = await this.jobLog(target, job.id);
        // Re-bound the composed value: the job header must not push a full log past the
        // 64k response-contract limit.
        if (output) {
          return boundedRedactedLog(
            `Job: ${job.name?.trim() || job.id}\n${output}`,
            '… earlier job output omitted.',
          );
        }
      } catch (cause) {
        unavailable.push(
          `Job ${job.name?.trim() || job.id}: ${cause instanceof Error ? cause.message : 'Output unavailable'}`,
        );
      }
    }
    return boundedRedactedLog(unavailable.join('\n'), '… earlier output errors omitted.');
  }

  private async jobLog(target: IRunTarget, jobId: number): Promise<string | undefined> {
    const token = await this._options.token?.(target.connection);
    if (!token) {
      throw new Error(`Sign in to GitHub for ${target.connection.displayName} before continuing.`);
    }
    const environment = this.githubEnvironment(token);
    const command = resolveAllowedCommand('gh');
    const output = await this.execute(
      command,
      [
        'api',
        '--hostname',
        target.connection.hostname,
        '--method',
        'GET',
        `${this.repositoryPath(target.repository)}/actions/jobs/${jobId}/logs`,
      ],
      environment,
      'Unable to read completed GitHub Actions job output',
    ).catch(() =>
      this.execute(
        command,
        [
          'run',
          'view',
          target.runId,
          '--repo',
          `${target.repository.owner}/${target.repository.name}`,
          '--job',
          String(jobId),
          '--log',
        ],
        environment,
        'Unable to read GitHub Actions job output',
      ),
    );
    return boundedRedactedLog(output, '… earlier job output omitted.');
  }

  private async failedRunLog(target: IRunTarget): Promise<string | undefined> {
    const token = await this._options.token?.(target.connection);
    if (!token) {
      throw new Error(`Sign in to GitHub for ${target.connection.displayName} before continuing.`);
    }
    const output = await this.execute(
      resolveAllowedCommand('gh'),
      [
        'run',
        'view',
        target.runId,
        '--repo',
        `${target.repository.owner}/${target.repository.name}`,
        '--log-failed',
      ],
      this.githubEnvironment(token),
      'Unable to read failed GitHub Actions output',
    );
    return boundedRedactedFailureLog(output);
  }

  private async mutateRun(runId: string, action: 'cancel' | 'rerun'): Promise<void> {
    const target = this.requireRunTarget(runId);
    const settings = this._options.settings();
    const repository = settings.repositoryBindings.find(
      (candidate) =>
        candidate.enabled &&
        candidate.id === target.repository.id &&
        candidate.workspaceId === target.repository.workspaceId,
    );
    const connection = settings.connections.find(
      (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
        candidate.kind === 'github' &&
        candidate.id === target.connection.id &&
        candidate.workspaceId === target.repository.workspaceId,
    );
    if (!repository || !connection) {
      throw new Error(`The GitHub Actions binding changed; refresh the run before changing it.`);
    }
    await this.api(
      connection,
      `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/actions/runs/${target.runId}/${action}`,
      'POST',
    );
  }

  private async api<T>(
    connection: Extract<ProviderConnection, { kind: 'github' }>,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    fields?: Readonly<Record<string, string | number | boolean | readonly number[]>>,
    headers?: Readonly<Record<string, string>>,
  ): Promise<T> {
    const token = await this._options.token?.(connection);
    if (!token) {
      throw new Error(`Sign in to GitHub for ${connection.displayName} before continuing.`);
    }
    const environment = this.githubEnvironment(token);
    const stdout = await this.executeAuthenticated(
      connection,
      resolveAllowedCommand('gh'),
      [
        'api',
        '--hostname',
        connection.hostname,
        '--method',
        method,
        '--include',
        ...Object.entries(headers ?? {}).flatMap(([name, value]) => [
          '--header',
          `${name}: ${value}`,
        ]),
        // Strings stay raw so branch names and titles are never reinterpreted; booleans and
        // numbers go through --field, which sends them as JSON literals.
        ...Object.entries(fields ?? {}).flatMap(([name, value]) =>
          Array.isArray(value)
            ? value.flatMap((item) => ['--field', `${name}[]=${String(item)}`])
            : typeof value === 'string'
              ? ['--raw-field', `${name}=${value}`]
              : ['--field', `${name}=${String(value)}`],
        ),
        path,
      ],
      environment,
      'Unable to query GitHub Cloud',
    );
    const output = parseGitHubApiOutput(stdout);
    this._governor.observe(output.rateLimit, 'GitHub REST API rate limit exhausted.');
    try {
      return output.body.trim() ? (JSON.parse(output.body) as T) : ({} as T);
    } catch (cause) {
      throw new Error('GitHub returned an invalid JSON response.', { cause });
    }
  }

  private requireRunTarget(runId: string): IRunTarget {
    const settings = this._options.settings();
    const binding = settings.ciBindings.find(
      (item) =>
        item.enabled &&
        item.provider === 'github-actions' &&
        runId.startsWith(`${item.id}:`) &&
        settings.activeViewScope.workspaceIds.includes(item.workspaceId),
    );
    const repository = settings.repositoryBindings.find(
      (item) =>
        item.enabled &&
        item.id === binding?.repositoryBindingId &&
        item.workspaceId === binding?.workspaceId,
    );
    const connection = settings.connections.find(
      (item): item is Extract<ProviderConnection, { kind: 'github' }> =>
        item.kind === 'github' &&
        item.id === binding?.sourceControlConnectionId &&
        item.workspaceId === binding?.workspaceId,
    );
    const providerRunId = binding ? runId.slice(binding.id.length + 1) : '';
    if (!repository || !connection || !/^\d+$/u.test(providerRunId))
      throw new Error(`Refresh the GitHub Actions run before changing it: ${runId}`);
    return { ...this._runTargets.get(runId), runId: providerRunId, repository, connection };
  }

  private assertManagedLocalJobs(jobs: IGitHubWorkflowJobsResponse, runLabel: string): void {
    const pendingJobs = (jobs.jobs ?? []).filter((job) => job.status !== 'completed');
    const required = ['self-hosted', 'linux', 'symphony-local-ci', runLabel].map((label) =>
      label.toLowerCase(),
    );
    if (
      !pendingJobs.length ||
      pendingJobs.some((job) => {
        const labels = new Set((job.labels ?? []).map((label) => label.toLowerCase()));
        return required.some((label) => !labels.has(label));
      })
    ) {
      throw new Error(
        `This workflow is not prepared for managed local CI. Every pending job must request self-hosted, Linux, symphony-local-ci, and ${runLabel}.`,
      );
    }
  }

  private async prepareWorkflowRun(
    target: IRunTarget,
    diagnosticsRunId: string,
    signal: AbortSignal,
  ): Promise<number | undefined> {
    const repositoryPath = this.repositoryPath(target.repository);
    const workflowRun = await this.api<IGitHubWorkflowRunResponse>(
      target.connection,
      `${repositoryPath}/actions/runs/${target.runId}`,
      'GET',
    );
    const jobs = await this.api<IGitHubWorkflowJobsResponse>(
      target.connection,
      `${repositoryPath}/actions/runs/${target.runId}/jobs?filter=all&per_page=100`,
      'GET',
    );
    const attemptJobs = currentAttemptJobs(jobs.jobs ?? []);
    const previousAttempt =
      workflowRun.run_attempt ?? Math.max(0, ...attemptJobs.map((job) => job.run_attempt ?? 0));
    const attemptHasStarted = attemptJobs.some(
      (job) => job.status === 'completed' || job.status === 'in_progress',
    );
    if (workflowRun.status !== 'completed' && attemptJobs.length > 0 && !attemptHasStarted) {
      return previousAttempt || undefined;
    }

    if (workflowRun.status !== 'completed' && attemptJobs.length === 0) {
      await this.cancelQueuedBlockingRun(target, diagnosticsRunId, signal);
      return previousAttempt || undefined;
    }

    if (workflowRun.status !== 'completed') {
      await this.cancelWorkflowRunAttempt(
        target,
        diagnosticsRunId,
        target.runId,
        previousAttempt || undefined,
        'incomplete-attempt',
        signal,
      );
    }

    await this.api(
      target.connection,
      `${repositoryPath}/actions/runs/${target.runId}/rerun`,
      'POST',
    );
    const expectedAttempt = previousAttempt ? previousAttempt + 1 : undefined;
    this.rememberLocalRunnerDiagnostics(
      diagnosticsRunId,
      `Phase: Waiting for GitHub to publish the fresh workflow attempt\nExpected attempt: ${expectedAttempt ?? 'next'}\nRunner: not started yet`,
    );
    return expectedAttempt;
  }

  private async cancelQueuedBlockingRun(
    target: IRunTarget,
    diagnosticsRunId: string,
    signal: AbortSignal,
  ): Promise<void> {
    if (!target.workflowId || !target.branch) return;
    const repositoryPath = this.repositoryPath(target.repository);
    const response = await this.api<IGitHubWorkflowRunsResponse>(
      target.connection,
      `${repositoryPath}/actions/workflows/${target.workflowId}/runs?branch=${encodeURIComponent(target.branch)}&per_page=20`,
      'GET',
    );
    const targetRunId = Number(target.runId);
    const candidates = (response.workflow_runs ?? [])
      .filter(
        (run) =>
          String(run.id) !== target.runId &&
          (!Number.isFinite(targetRunId) || run.id < targetRunId) &&
          run.status !== 'completed',
      )
      .toSorted((left, right) => right.id - left.id);

    for (const candidate of candidates) {
      const jobs = await this.api<IGitHubWorkflowJobsResponse>(
        target.connection,
        `${repositoryPath}/actions/runs/${candidate.id}/jobs?filter=all&per_page=100`,
        'GET',
      );
      const attemptJobs = currentAttemptJobs(jobs.jobs ?? []);
      const waitingJobs = attemptJobs.filter((job) => job.status !== 'completed');
      if (!waitingJobs.length || waitingJobs.some((job) => job.status === 'in_progress')) continue;

      const jobNames = waitingJobs
        .map((job) => job.name?.trim())
        .filter((name): name is string => Boolean(name));
      this.rememberLocalRunnerDiagnostics(
        diagnosticsRunId,
        [
          'Phase: Cancelling a workflow run that blocks local CI',
          `Blocking run: ${candidate.id}`,
          `Branch: ${target.branch}`,
          `Waiting jobs: ${jobNames.length ? jobNames.join(', ') : waitingJobs.length}`,
          'Reason: The selected run is pending without jobs while an older run of the same workflow and branch is still waiting.',
          'Runner: not started yet',
        ].join('\n'),
      );
      await this.cancelWorkflowRunAttempt(
        target,
        diagnosticsRunId,
        String(candidate.id),
        candidate.run_attempt,
        'blocking-run',
        signal,
      );
      return;
    }
  }

  private async cancelWorkflowRunAttempt(
    target: IRunTarget,
    diagnosticsRunId: string,
    workflowRunId: string,
    runAttempt: number | undefined,
    reason: 'blocking-run' | 'incomplete-attempt',
    signal: AbortSignal,
  ): Promise<void> {
    const repositoryPath = this.repositoryPath(target.repository);
    this.rememberLocalRunnerDiagnostics(
      diagnosticsRunId,
      reason === 'blocking-run'
        ? `Phase: Cancelling blocking GitHub workflow run\nBlocking run: ${workflowRunId}\nAttempt: ${runAttempt ?? 'unknown'}\nRunner: not started yet`
        : `Phase: Cancelling incomplete GitHub workflow attempt\nAttempt: ${runAttempt ?? 'unknown'}\nRunner: not started yet`,
    );
    await this.api(
      target.connection,
      `${repositoryPath}/actions/runs/${workflowRunId}/cancel`,
      'POST',
    );
    const pollMilliseconds = this._options.localRunnerPollMilliseconds ?? 2_000;
    let workflowRun: IGitHubWorkflowRunResponse | undefined;
    for (let attempt = 0; attempt < GITHUB_RUN_CANCEL_CHECKS && !signal.aborted; attempt += 1) {
      await wait(pollMilliseconds, signal);
      workflowRun = await this.api<IGitHubWorkflowRunResponse>(
        target.connection,
        `${repositoryPath}/actions/runs/${workflowRunId}`,
        'GET',
      );
      if (workflowRun.status === 'completed') return;
      const check = attempt + 1;
      if (
        check >= GITHUB_RUN_FORCE_CANCEL_FIRST_CHECK &&
        (check - GITHUB_RUN_FORCE_CANCEL_FIRST_CHECK) % GITHUB_RUN_FORCE_CANCEL_REPEAT_CHECKS === 0
      ) {
        this.rememberLocalRunnerDiagnostics(
          diagnosticsRunId,
          [
            reason === 'blocking-run'
              ? 'Phase: Force-cancelling blocking GitHub workflow run'
              : 'Phase: Force-cancelling unresponsive GitHub workflow attempt',
            ...(reason === 'blocking-run' ? [`Blocking run: ${workflowRunId}`] : []),
            `Attempt: ${runAttempt ?? 'unknown'}`,
            `Cancellation check: ${check} of ${GITHUB_RUN_CANCEL_CHECKS}`,
            `Elapsed: ${Math.ceil((check * pollMilliseconds) / 1_000)} seconds`,
            `GitHub status: ${workflowRun.status ?? 'unknown'}`,
            'Runner: not started yet',
          ].join('\n'),
        );
        await this.api(
          target.connection,
          `${repositoryPath}/actions/runs/${workflowRunId}/force-cancel`,
          'POST',
        );
      }
    }
    if (signal.aborted) {
      throw new Error(
        `Local CI was cancelled while GitHub was stopping ${reason === 'blocking-run' ? `blocking workflow run ${workflowRunId}` : `workflow attempt ${runAttempt ?? 'unknown'}`}.`,
      );
    }
    throw new Error(
      `GitHub did not cancel ${reason === 'blocking-run' ? `blocking workflow run ${workflowRunId}` : `workflow attempt ${runAttempt ?? 'unknown'}`} after ${Math.ceil(
        (GITHUB_RUN_CANCEL_CHECKS * pollMilliseconds) / 1_000,
      )} seconds. Latest status: ${workflowRun?.status ?? 'unknown'}.`,
    );
  }

  private async waitForManagedLocalJobs(
    target: IRunTarget,
    diagnosticsRunId: string,
    runLabel: string,
    expectedAttempt: number | undefined,
    signal: AbortSignal,
  ): Promise<void> {
    const repositoryPath = this.repositoryPath(target.repository);
    for (let attempt = 0; attempt < 30 && !signal.aborted; attempt += 1) {
      this.rememberLocalRunnerDiagnostics(
        diagnosticsRunId,
        [
          'Phase: Waiting for GitHub to publish local jobs',
          `Check: ${attempt + 1} of 30`,
          `Expected attempt: ${expectedAttempt ?? 'current'}`,
          `Required runner label: ${runLabel}`,
          'Runner: not started yet',
        ].join('\n'),
      );
      const jobs = await this.api<IGitHubWorkflowJobsResponse>(
        target.connection,
        `${repositoryPath}/actions/runs/${target.runId}/jobs?filter=all&per_page=100`,
        'GET',
      );
      const reportedJobs = jobs.jobs ?? [];
      const attemptJobs =
        expectedAttempt && reportedJobs.some((job) => job.run_attempt !== undefined)
          ? reportedJobs.filter((job) => job.run_attempt === expectedAttempt)
          : currentAttemptJobs(reportedJobs);
      if (attemptJobs.some((job) => job.status !== 'completed')) {
        this.assertManagedLocalJobs({ jobs: attemptJobs }, runLabel);
        return;
      }
      await wait(this._options.localRunnerPollMilliseconds ?? 2_000, signal);
    }
    throw new Error(
      `GitHub kept workflow run ${target.runId} pending without jobs. Review older active runs${target.branch ? ` for branch ${target.branch}` : ''}, cancel any workflow holding the concurrency group, and then choose Run locally again.`,
    );
  }

  private async waitForWorkflowRun(
    target: IRunTarget,
    runnerCompletion: Promise<void>,
    signal: AbortSignal,
  ): Promise<IGitHubWorkflowRunResponse> {
    const repositoryPath = this.repositoryPath(target.repository);
    const runnerExited = runnerCompletion.then(
      () => ({ state: 'exited' as const }),
      (cause) => ({ state: 'failed' as const, cause }),
    );
    let consecutiveFailures = 0;
    while (!signal.aborted) {
      let delayMilliseconds = this._options.localRunnerPollMilliseconds ?? 5_000;
      try {
        const response = await this.api<IGitHubWorkflowRunResponse>(
          target.connection,
          `${repositoryPath}/actions/runs/${target.runId}`,
          'GET',
        );
        consecutiveFailures = 0;
        if (response.status === 'completed') return response;
      } catch (cause) {
        // Status observation must not tear down a healthy runner on a transient outage.
        if (
          !isTransientRunStatusFailure(cause) ||
          ++consecutiveFailures > GITHUB_RUN_STATUS_RETRIES
        ) {
          throw cause;
        }
        delayMilliseconds = Math.min(
          30_000,
          delayMilliseconds * 2 ** (consecutiveFailures - 1) * (0.75 + Math.random() * 0.5),
        );
      }
      const outcome = await Promise.race([
        runnerExited,
        wait(delayMilliseconds, signal).then(() => ({
          state: 'waiting' as const,
        })),
      ]);
      if (outcome.state === 'failed') {
        throw new Error('The managed local runner stopped before the workflow completed.', {
          cause: outcome.cause,
        });
      }
      if (outcome.state === 'exited') {
        throw new Error('The managed local runner stopped before the workflow completed.');
      }
    }
    return { id: Number(target.runId), status: 'completed', conclusion: 'cancelled' };
  }

  private async deleteRunner(target: IRunTarget, runnerName: string): Promise<void> {
    const repositoryPath = this.repositoryPath(target.repository);
    try {
      const response = await this.api<IGitHubRunnersResponse>(
        target.connection,
        `${repositoryPath}/actions/runners?per_page=100&name=${encodeURIComponent(runnerName)}`,
        'GET',
      );
      const runner = response.runners?.find((candidate) => candidate.name === runnerName);
      if (runner) {
        await this.api(
          target.connection,
          `${repositoryPath}/actions/runners/${runner.id}`,
          'DELETE',
        );
      }
    } catch {
      // The VM is already gone. GitHub eventually removes unreachable runner registrations.
    }
  }

  private rememberLocalRunnerDiagnostics(runId: string, diagnostics: string): void {
    this._localRunnerDiagnostics.set(runId, diagnostics.slice(-64_000));
    while (this._localRunnerDiagnostics.size > 20) {
      const oldest = this._localRunnerDiagnostics.keys().next().value;
      if (!oldest) break;
      this._localRunnerDiagnostics.delete(oldest);
    }
  }

  private repositoryPath(repository: IRepositoryBinding): string {
    return `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
  }

  private now(): Date {
    return this._options.now?.() ?? new Date();
  }

  private usageTarget(repositoryBindingId: string): IUsageTarget {
    const settings = this._options.settings();
    const repository = settings.repositoryBindings.find(
      (candidate) =>
        candidate.id === repositoryBindingId &&
        candidate.enabled &&
        candidate.provider === 'github',
    );
    if (!repository) throw new Error('The GitHub repository is unavailable.');
    const connection = settings.connections.find(
      (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
        candidate.id === repository.sourceControlConnectionId &&
        candidate.workspaceId === repository.workspaceId &&
        candidate.kind === 'github',
    );
    if (!connection || connection.hostname !== repository.host) {
      throw new Error('The GitHub account for this repository is unavailable.');
    }
    return { repository, connection };
  }

  private async readRepositoryUsage(
    target: IUsageTarget,
  ): Promise<IContinuousIntegrationUsageReport> {
    const headers = { 'X-GitHub-Api-Version': GITHUB_API_VERSION };
    const repositoryPath = `repos/${encodeURIComponent(target.repository.owner)}/${encodeURIComponent(target.repository.name)}`;
    const repository = await this.api<IGitHubRepositoryResponse>(
      target.connection,
      repositoryPath,
      'GET',
      undefined,
      headers,
    );
    const accountType =
      repository.owner?.type?.toLowerCase() === 'organization' ? 'organization' : 'user';
    const login = repository.owner?.login?.trim() || target.repository.owner;
    const encodedLogin = encodeURIComponent(login);
    const accountPath =
      accountType === 'organization'
        ? `orgs/${encodedLogin}`
        : target.connection.accountLogin?.toLowerCase() === login.toLowerCase()
          ? 'user'
          : `users/${encodedLogin}`;
    const account = await this.api<IGitHubAccountResponse>(
      target.connection,
      accountPath,
      'GET',
      undefined,
      headers,
    );
    const now = this._options.now?.() ?? new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const billingPath =
      accountType === 'organization'
        ? `organizations/${encodedLogin}/settings/billing/usage/summary`
        : `users/${encodedLogin}/settings/billing/usage/summary`;
    const summary = await this.api<IGitHubBillingUsageSummaryResponse>(
      target.connection,
      `${billingPath}?year=${year}&month=${month}&product=actions`,
      'GET',
      undefined,
      headers,
    );
    const used = Math.max(
      0,
      (summary.usageItems ?? [])
        .filter(
          (item) =>
            item.product?.toLowerCase() === 'actions' &&
            item.unitType?.toLowerCase() === 'minutes' &&
            includedActionsMinuteSkus.has(item.sku?.toLowerCase() ?? ''),
        )
        .reduce((total, item) => total + Math.max(0, item.grossQuantity ?? 0), 0),
    );
    const planName = account.plan?.name?.trim();
    const included = planName
      ? includedActionsMinutesByPlan.get(planName.toLowerCase())
      : undefined;
    const remaining = included === undefined ? undefined : Math.max(0, included - used);
    const usedPercent =
      included === undefined ? undefined : Math.min(100, Math.round((used / included) * 100));
    const remainingPercent = usedPercent === undefined ? undefined : 100 - usedPercent;
    return {
      repositoryBindingId: target.repository.id,
      account: {
        type: accountType,
        login,
        ...(planName ? { planName } : {}),
      },
      period: {
        startedAt: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
        resetsAt: new Date(Date.UTC(year, month, 1)).toISOString(),
      },
      minutes: {
        used,
        ...(included === undefined ? {} : { included }),
        ...(remaining === undefined ? {} : { remaining }),
        ...(usedPercent === undefined ? {} : { usedPercent }),
        ...(remainingPercent === undefined ? {} : { remainingPercent }),
      },
    };
  }

  private usageError(cause: unknown): string {
    const message = cause instanceof Error ? cause.message : '';
    if (/403|forbidden|resource not accessible|permission/iu.test(message)) {
      return 'GitHub billing usage requires account-owner or billing-manager access.';
    }
    if (/404|not found|enhanced billing/iu.test(message)) {
      return 'GitHub Actions usage is not available for this account.';
    }
    if (/sign in/iu.test(message)) return message;
    return 'GitHub Actions usage could not be loaded.';
  }

  private deliveryTarget(
    execution: IExecutionRecord,
    workItem: IWorkItem,
  ): {
    readonly repository: IRepositoryBinding;
    readonly connection: Extract<ProviderConnection, { kind: 'github' }>;
  } {
    const settings = this._options.settings();
    const bindingIds = new Set([
      ...(execution.bindingSnapshot?.repositoryBindingIds ?? []),
      ...(workItem.repositoryBindingIds ?? []),
    ]);
    const repositories = settings.repositoryBindings.filter(
      (candidate) =>
        candidate.enabled &&
        candidate.provider === 'github' &&
        candidate.workspaceId === (execution.workspaceId ?? workItem.workspaceId) &&
        (bindingIds.has(candidate.id) ||
          (!bindingIds.size &&
            (workItem.repository === candidate.id ||
              workItem.repository === candidate.displayName ||
              workItem.repository === `${candidate.owner}/${candidate.name}`))),
    );
    if (repositories.length !== 1) {
      throw new Error('Choose exactly one GitHub repository for this implementation.');
    }
    const repository = repositories[0]!;
    const connection = settings.connections.find(
      (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
        candidate.kind === 'github' &&
        candidate.id === repository.sourceControlConnectionId &&
        candidate.workspaceId === repository.workspaceId,
    );
    if (!connection) throw new Error('The GitHub connection for this repository is unavailable.');
    if (connection.hostname !== repository.host) {
      throw new Error('The repository and GitHub connection hostnames do not match.');
    }
    return { repository, connection };
  }

  /** Repository an operator may author a pull request in, inside the selected workspace scope. */
  private authoringTarget(repositoryBindingId: string): {
    readonly repository: IRepositoryBinding;
    readonly connection: Extract<ProviderConnection, { kind: 'github' }>;
  } {
    const settings = this._options.settings();
    const selectedWorkspaceIds = new Set(settings.activeViewScope.workspaceIds);
    const repository = settings.repositoryBindings.find(
      (candidate) =>
        candidate.id === repositoryBindingId &&
        candidate.enabled &&
        candidate.provider === 'github' &&
        selectedWorkspaceIds.has(candidate.workspaceId),
    );
    if (!repository) throw new Error('The selected GitHub repository is unavailable.');
    const connection = settings.connections.find(
      (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
        candidate.kind === 'github' &&
        candidate.id === repository.sourceControlConnectionId &&
        candidate.workspaceId === repository.workspaceId,
    );
    if (!connection) throw new Error('The GitHub connection for this repository is unavailable.');
    if (connection.hostname !== repository.host) {
      throw new Error('The repository and GitHub connection hostnames do not match.');
    }
    return { repository, connection };
  }

  private projectPullRequest(
    repository: IRepositoryBinding,
    pullRequest: IGitHubPullRequestResponse,
  ): IPullRequestSummary {
    return {
      id: `${repository.id}:${pullRequest.number}`,
      workspaceId: repository.workspaceId,
      repositoryBindingId: repository.id,
      number: pullRequest.number,
      title: pullRequest.title ?? `Pull request #${pullRequest.number}`,
      state: pullRequest.merged_at ? 'merged' : (pullRequest.state ?? 'open'),
      draft: pullRequest.draft ?? false,
      ...(pullRequest.user?.login ? { author: pullRequest.user.login } : {}),
      sourceBranch: pullRequest.head?.ref ?? 'unknown',
      ...(pullRequest.head?.sha ? { headRevision: pullRequest.head.sha } : {}),
      ...(pullRequest.merged_at && pullRequest.merge_commit_sha
        ? { mergeRevision: pullRequest.merge_commit_sha }
        : {}),
      targetBranch: pullRequest.base?.ref ?? repository.defaultBranch,
      baseBranchStatus: this.pullRequestBaseBranchStatus(pullRequest),
      ...this.pullRequestReviewRequests(repository, pullRequest),
      externalUrl: pullRequest.html_url,
      createdAt: pullRequest.created_at ?? pullRequest.updated_at ?? this.now().toISOString(),
      updatedAt: pullRequest.updated_at ?? pullRequest.created_at ?? this.now().toISOString(),
    };
  }

  /** Pending review requests: reviewer logins and `organization/team` names, bounded to 100 each. */
  private pullRequestReviewRequests(
    repository: IRepositoryBinding,
    pullRequest: IGitHubPullRequestResponse,
  ): Pick<IPullRequestSummary, 'requestedReviewers' | 'requestedTeams'> {
    const reviewers = [
      ...new Set(
        (pullRequest.requested_reviewers ?? []).flatMap((reviewer) =>
          reviewer.login?.trim() ? [reviewer.login.trim()] : [],
        ),
      ),
    ].slice(0, 100);
    const teams = [
      ...new Set(
        (pullRequest.requested_teams ?? []).flatMap((team) =>
          team.slug?.trim()
            ? [`${team.organization?.login?.trim() || repository.owner}/${team.slug.trim()}`]
            : [],
        ),
      ),
    ].slice(0, 100);
    return {
      ...(reviewers.length ? { requestedReviewers: reviewers } : {}),
      ...(teams.length ? { requestedTeams: teams } : {}),
    };
  }

  private pullRequestBaseBranchStatus(
    pullRequest: IGitHubPullRequestResponse,
  ): NonNullable<IPullRequestSummary['baseBranchStatus']> {
    if (pullRequest.mergeable_state === 'behind') return 'behind';
    if (pullRequest.mergeable === false || pullRequest.mergeable_state === 'dirty') {
      return 'conflicting';
    }
    if (pullRequest.mergeable_state === 'unknown' || !pullRequest.mergeable_state) return 'unknown';
    return 'current';
  }

  private matchesRepository(remote: string, repository: IRepositoryBinding): boolean {
    const normalized = remote
      .trim()
      .replace(/\.git$/iu, '')
      .replace(/\/$/u, '')
      .toLowerCase();
    return (
      normalized ===
        `https://${repository.host}/${repository.owner}/${repository.name}`.toLowerCase() ||
      normalized ===
        `ssh://git@${repository.host}/${repository.owner}/${repository.name}`.toLowerCase() ||
      normalized === `git@${repository.host}:${repository.owner}/${repository.name}`.toLowerCase()
    );
  }

  private branchPath(branch: string): string {
    return branch.split('/').map(encodeURIComponent).join('/');
  }

  private async resolveBaseReference(repositoryPath: string, branch: string): Promise<string> {
    for (const candidate of [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`]) {
      try {
        await this.gitOutput(repositoryPath, ['rev-parse', '--verify', `${candidate}^{commit}`]);
        return candidate;
      } catch {
        // Try the next existing local representation without accessing the network.
      }
    }
    throw new Error(`No local commit is available for ${branch}.`);
  }

  private commitTitle(workItem: IWorkItem): string {
    const title = `${workItem.externalId} ${workItem.title}`.replace(/\s+/gu, ' ').trim();
    return title.length > 120 ? `${title.slice(0, 117)}…` : title;
  }

  /**
   * Adds the missing issue link to a pull request that is already open.
   *
   * A pull request Symphony created before the link was part of the description - or one whose
   * description a person rewrote - would otherwise stay unlinked for its whole life, because the
   * delivery reuses the open pull request instead of opening a new one. The reference is appended,
   * never substituted, so nothing a reviewer wrote is lost.
   */
  private async linkExistingPullRequest(
    connection: Extract<ProviderConnection, { kind: 'github' }>,
    repositoryPath: string,
    pullRequest: IGitHubPullRequestResponse | undefined,
    workItem: IWorkItem,
    execution: IExecutionRecord,
    repository: IRepositoryBinding,
  ): Promise<IGitHubPullRequestResponse | undefined> {
    if (!pullRequest) return undefined;
    const body = pullRequest.body ?? '';
    const linkedBody = appendClosingReferences(
      body,
      issueReferences(workItem, execution, repository),
    );
    if (linkedBody === body) return pullRequest;
    await this.api<IGitHubPullRequestResponse>(
      connection,
      `${repositoryPath}/pulls/${pullRequest.number}`,
      'PATCH',
      { body: linkedBody },
    );
    return pullRequest;
  }

  /**
   * Description of the managed pull request.
   *
   * The closing keyword is what makes GitHub link a pull request to its issue. A bare URL only
   * produces a mention in the issue timeline: the issue's "Development" section stays empty, the
   * board shows no delivery, and merging closes nothing - so the delivery has to state the link in
   * the form GitHub actually reads. Work items that are not GitHub issues keep the plain
   * reference, which is all their tracker can be addressed with from here.
   */
  private pullRequestBody(
    workItem: IWorkItem,
    execution: IExecutionRecord,
    repository: IRepositoryBinding,
  ): string {
    const summary = execution.summary?.trim();
    const body = summary || `Implements ${workItem.externalId}.`;
    const references = issueReferences(workItem, execution, repository);
    if (references.length === 0) {
      return workItem.externalUrl ? `${body}\n\nIssue: ${workItem.externalUrl}` : body;
    }
    return appendClosingReferences(body, references);
  }

  private async configureGitAuthentication(
    connection: Extract<ProviderConnection, { kind: 'github' }>,
  ): Promise<void> {
    const token = await this._options.token?.(connection);
    if (!token)
      throw new Error(`Sign in to GitHub for ${connection.displayName} before continuing.`);
    await this.execute(
      resolveAllowedCommand('gh'),
      ['auth', 'setup-git', '--hostname', connection.hostname],
      this.githubEnvironment(token),
      'Unable to configure GitHub authentication',
    );
  }

  private async git(repositoryPath: string, arguments_: readonly string[]): Promise<void> {
    await this.execute(
      resolveAllowedCommand('git'),
      ['-C', repositoryPath, ...arguments_],
      undefined,
      'Unable to deliver the managed Git workspace',
    );
  }

  private async gitOutput(repositoryPath: string, arguments_: readonly string[]): Promise<string> {
    return this.execute(
      resolveAllowedCommand('git'),
      ['-C', repositoryPath, ...arguments_],
      undefined,
      'Unable to inspect the managed Git workspace',
    );
  }

  private githubEnvironment(token: string): NodeJS.ProcessEnv {
    const environment: NodeJS.ProcessEnv = { GH_TOKEN: token, GITHUB_TOKEN: token };
    for (const name of [
      'HOME',
      'LANG',
      'LC_ALL',
      'SHELL',
      'TMPDIR',
      'GH_CONFIG_DIR',
      'XDG_CONFIG_HOME',
    ] as const) {
      if (process.env[name]) environment[name] = process.env[name];
    }
    environment['PATH'] = toolchainSearchPath();
    return environment;
  }

  /**
   * Runs a request that presents a cached token, dropping that token when GitHub rejects it.
   *
   * Tokens are read once and reused across requests, so a rejected one has to be forgotten
   * here; otherwise every later request keeps presenting it until the cache expires.
   */
  private async executeAuthenticated(
    connection: Extract<ProviderConnection, { kind: 'github' }>,
    command: string,
    arguments_: readonly string[],
    environment: NodeJS.ProcessEnv | undefined,
    context: string,
  ): Promise<string> {
    try {
      return await this.execute(command, arguments_, environment, context);
    } catch (cause) {
      if (isGitHubAuthenticationFailure(cause)) {
        forgetGitHubToken(connection.hostname, connection.accountLogin);
      }
      throw cause;
    }
  }

  private async execute(
    command: string,
    arguments_: readonly string[],
    environment: NodeJS.ProcessEnv | undefined,
    context: string,
  ): Promise<string> {
    try {
      return await this._governor.run(async () => {
        if (this._options.execute) {
          return this._options.execute(command, arguments_, environment);
        }
        const { stdout } = await execFileAsync(command, arguments_, {
          encoding: 'utf8',
          ...(environment ? { env: environment } : {}),
          maxBuffer: 16 * 1_024 * 1_024,
          timeout: 30_000,
        });
        return stdout.trim();
      });
    } catch (cause) {
      if (cause instanceof GitHubRateLimitError) throw cause;
      const failureOutput = commandOutput(cause, 'stdout');
      if (failureOutput) {
        const { rateLimit } = parseGitHubApiOutput(failureOutput);
        this._governor.observe(rateLimit, 'GitHub REST API rate limit exhausted.');
      }
      const standardError = commandOutput(cause, 'stderr');
      const message = standardError
        ? standardError.trim()
        : cause instanceof Error
          ? cause.message
          : 'Command failed';
      if (/rate limit|secondary rate|abuse detection/iu.test(message)) {
        const retryAt =
          this._governor.snapshot().resetAt ??
          new Date(Date.now() + GITHUB_RATE_LIMIT_FALLBACK_MILLISECONDS).toISOString();
        throw this._governor.block(retryAt, `${context}: ${message}`);
      }
      throw new Error(`${context}: ${message}`, { cause });
    }
  }

  // #endregion
}

function isTransientRunStatusFailure(cause: unknown): boolean {
  if (!(cause instanceof Error) || cause instanceof GitHubRateLimitError) return false;
  if (isGitHubAuthenticationFailure(cause) || /HTTP(?:\/\S+)?\s+4\d{2}\b/iu.test(cause.message)) {
    return false;
  }
  if (
    /error connecting to |connection (?:reset|refused|timed out)|network is unreachable|TLS handshake timeout|i\/o timeout|unexpected EOF|HTTP(?:\/\S+)?\s+5\d{2}\b/iu.test(
      cause.message,
    )
  ) {
    return true;
  }
  if (
    'code' in cause &&
    /^(?:ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH)$/u.test(String(cause.code))
  ) {
    return true;
  }
  return cause.cause !== undefined && isTransientRunStatusFailure(cause.cause);
}

function parseGitHubApiOutput(output: string): IGitHubApiOutput {
  const normalized = output.trimStart();
  if (!/^HTTP\/\S+\s+\d+/u.test(normalized)) {
    return { body: normalized, rateLimit: {} };
  }
  const separator = /\r?\n\r?\n/u.exec(normalized);
  const header = separator?.index === undefined ? normalized : normalized.slice(0, separator.index);
  const body =
    separator?.index === undefined ? '' : normalized.slice(separator.index + separator[0].length);
  const values = new Map<string, string>();
  for (const line of header.split(/\r?\n/u).slice(1)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) continue;
    values.set(
      line.slice(0, separatorIndex).trim().toLocaleLowerCase(),
      line.slice(separatorIndex + 1).trim(),
    );
  }
  const limit = optionalFiniteNumber(values.get('x-ratelimit-limit'));
  const remaining = optionalFiniteNumber(values.get('x-ratelimit-remaining'));
  const resetSeconds = optionalFiniteNumber(values.get('x-ratelimit-reset'));
  return {
    body,
    rateLimit: {
      ...(limit === undefined ? {} : { limit }),
      ...(remaining === undefined ? {} : { remaining }),
      ...(resetSeconds === undefined
        ? {}
        : { resetAt: new Date(resetSeconds * 1_000).toISOString() }),
    },
  };
}

function optionalFiniteNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function commandOutput(cause: unknown, field: 'stdout' | 'stderr'): string {
  if (!(cause instanceof Error)) return '';
  const commandError = cause as Error & Partial<Record<'stdout' | 'stderr', unknown>>;
  const output = commandError[field];
  return typeof output === 'string' ? output : '';
}
