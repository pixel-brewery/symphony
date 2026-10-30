// #region Imports

import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AgentContinuationUnavailableError,
  AgentInterruptionError,
} from '@symphony/application-ai';
import {
  WorkTrackingProjectionService,
  WorkItemClaimMissingError,
} from '@symphony/application-work';
import { PullRequestProjectionService } from '@symphony/application-delivery';
import { ContinuousIntegrationProjectionService } from '@symphony/application-ci';
import { RemoteProjectionService } from '@symphony/application-composition';
import type { IExecutionTrackingPort as TrackerPort } from '../ports/IExecutionTrackingPort';
import { AnalyzerService } from '../analyzer/AnalyzerService';
import type { IRemoteProjectionRepository } from '@symphony/application-composition';
import type { IExecutionCatalog as IRuntimeCatalog } from '../ports/IExecutionCatalog';
import { createMemoryExecutionRepository } from './createMemoryExecutionRepository';
import type { IExecutionEvent } from '@symphony/domain-execution';
import type { IRunResult } from '@symphony/domain-workflow';
import type { SkillFlowRole, ISkillPackageDocument } from '@symphony/domain-skills';
import type { IWorkItem, IWorkItemNote } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type {
  IWorkItemTrackingPort,
  IWorkTrackingProjectionPort,
} from '@symphony/application-work';
import { executionFixtureDirectories as temporaryDirectories } from './ExecutionFixtureDirectories';
import type { IRuntimeHealth } from '@symphony/domain-platform';

// #endregion

export function createExecutionFixture(
  shouldFail: boolean | 'interrupt-once' | 'continuation-unavailable-once',
  hasAnalysisSkill = true,
  result = 'Plan persisted.',
  initialStage: IWorkItem['stageId'] = 'qualified',
  waitForCancellation = false,
  retainFailedWorkspaces = true,
  remoteProjections?: IRemoteProjectionRepository,
  claimContended = false,
  maxParallelExecutions = 3,
  positionPolicies?: Record<
    string,
    {
      readonly allowedPathPatterns: readonly string[];
      readonly forbiddenPathPatterns: readonly string[];
      readonly maximumChangedFiles: number;
      readonly maximumDiffLines: number;
      readonly maximumIterations: number;
    }
  >,
) {
  const directory = mkdtempSync(join(tmpdir(), 'orchestration-test-'));
  temporaryDirectories.push(directory);
  const repository = createMemoryExecutionRepository();
  let item: IWorkItem = {
    id: 'item-1',
    externalId: '#1',
    title: 'Test work',
    body: 'Exercise the application boundary.',
    stageId: initialStage,
    provider: 'test',
    repository: 'test/repository',
    labels: [],
    assignees: [],
    updatedAt: '2026-08-07T00:00:00.000Z',
  };
  const additionalItems: IWorkItem[] = [];
  const analysisSkill: ISkillPackageDocument = {
    id: 'repository:issue-analyzer',
    name: 'issue-analyzer',
    displayName: 'Issue analyzer',
    description: 'Analyze an issue.',
    source: 'repository',
    location: '/repository/.agents/skills/issue-analyzer',
    editable: false,
    implicitInvocation: true,
    updatedAt: '2026-08-07T00:00:00.000Z',
    digest: 'test',
    resourceCount: 0,
    warnings: [],
    instructions: 'Analyze the selected issue.',
    openaiYaml: '',
    files: [],
  };
  const catalog: IRuntimeCatalog & { health(): Promise<IRuntimeHealth> } = {
    health: async () => ({
      status: 'ready',
      utilityProcess: true,
      database: true,
      homebrew: { available: true },
      git: { available: true },
      githubCli: { available: true },
      agents: {
        codex: { available: true },
        claude: { available: true },
        opencode: { available: true },
      },
    }),
    workflow: () => defaultWorkflow,
    skills: () =>
      hasAnalysisSkill
        ? [
            {
              id: analysisSkill.id,
              name: analysisSkill.name,
              version: '1.0.0',
              description: analysisSkill.description,
              capabilities: ['analysis:write'],
              source: 'workspace',
            },
            {
              id: 'repository:issue-solver',
              name: 'issue-solver',
              version: '1.0.0',
              description: 'Implement an approved plan.',
              capabilities: ['workspace:write'],
              source: 'workspace',
            },
          ]
        : [],
    skill: (role) =>
      role === 'analysis'
        ? hasAnalysisSkill
          ? analysisSkill
          : undefined
        : role === 'solution'
          ? {
              ...analysisSkill,
              id: 'repository:issue-solver',
              name: 'issue-solver',
              displayName: 'Issue solver',
              description: 'Implement an analyzed issue.',
            }
          : role === 'ci-repair'
            ? {
                ...analysisSkill,
                id: 'repository:ci-repair',
                name: 'ci-repair',
                displayName: 'CI repair',
                description: 'Repair a diagnosed CI failure.',
              }
            : role === 'ci-diagnosis'
              ? {
                  ...analysisSkill,
                  id: 'repository:ci-diagnosis',
                  name: 'ci-diagnosis',
                  displayName: 'CI diagnosis',
                  description: 'Diagnose a failed CI run.',
                }
              : undefined,
    analysisSkill: () => (hasAnalysisSkill ? analysisSkill : undefined),
    solutionSkill: () => ({
      ...analysisSkill,
      id: 'repository:issue-solver',
      name: 'issue-solver',
      displayName: 'Issue solver',
      description: 'Implement an analyzed issue.',
    }),
  };
  let nextId = 0;
  let workItemReads = 0;
  let workItemReadError: Error | undefined;
  const transitions: IWorkItem['stageId'][] = [];
  const columnMoves: string[] = [];
  const preparedWorkspaces: string[] = [];
  const workspacePurposes: string[] = [];
  const preservedWorkspaces: string[] = [];
  const releasedWorkspaces: string[] = [];
  const managedWorkspaces: string[] = [];
  const analysisRequests: Array<string | undefined> = [];
  const reportedRunResults: IRunResult[] = [];
  const analysisWorkItems: IWorkItem[] = [];
  const analysisSkills: ISkillPackageDocument[] = [];
  const analysisContinuations: Array<string | undefined> = [];
  let analysisAttempts = 0;
  const solutionRequests: Array<string | undefined> = [];
  const solutionWorkspaces: string[] = [];
  const verifiedWorkspaces: string[] = [];
  let verificationRepairAttempts = 0;
  let verificationChecks: () => readonly {
    readonly label: string;
    readonly state: 'passed' | 'failed';
    readonly detail?: string;
    readonly output?: string;
  }[] = () => [];
  let workspaceChanges: { readonly changedFiles: readonly string[]; readonly diffLines: number } = {
    changedFiles: [],
    diffLines: 0,
  };
  const deliveredExecutionIds: string[] = [];
  const coordinationEvents: string[] = [];
  let claimReferenceMissing = false;
  let claimAdvanceError: Error | undefined;
  let claimRenewError: Error | undefined;
  const publishedNotes: { workItemId: string; note: IWorkItemNote }[] = [];
  let publishNoteError: Error | undefined;
  let automaticDeliveryGroupingEnabled = false;
  let hydrateOriginalWorkItemDetails = false;
  let finished: (event: IExecutionEvent) => void = () => undefined;
  const terminalEvent = new Promise<IExecutionEvent>((resolve) => {
    finished = resolve;
  });
  const tracker: TrackerPort & IWorkItemTrackingPort & IWorkTrackingProjectionPort = {
    listWorkItems: async () => {
      workItemReads += 1;
      if (workItemReadError) throw workItemReadError;
      return [item, ...additionalItems];
    },
    loadWorkItemDetails: async (workItem) => {
      const source =
        workItem.id === item.id
          ? item
          : additionalItems.find((candidate) => candidate.id === workItem.id);
      return {
        ...workItem,
        ...(hydrateOriginalWorkItemDetails ? source : {}),
        detailState: 'complete',
        comments: [
          {
            id: 'comment-1',
            author: { login: 'rekepb' },
            body: 'Order the budget fields after the floor heights.',
            createdAt: '2026-08-06T09:48:50.000Z',
          },
        ],
      };
    },
    listEditorMetadata: async () => ({
      repositories: ['test/repository'],
      labels: [],
      assignees: [],
      states: [],
      projectFields: [],
    }),
    createWorkItem: async () => item,
    updateWorkItem: async () => item,
    transition: async (_id, stageId) => {
      transitions.push(stageId);
      return (item = { ...item, stageId });
    },
    moveToColumn: async (id, boardColumnId) => {
      columnMoves.push(`${id}:${boardColumnId}`);
      if (id === item.id) return (item = { ...item, boardColumnId });
      const index = additionalItems.findIndex((candidate) => candidate.id === id);
      if (index < 0) return item;
      return (additionalItems[index] = { ...additionalItems[index]!, boardColumnId });
    },
    publishWorkItemNote: async (workItem, note) => {
      if (publishNoteError) throw publishNoteError;
      publishedNotes.push({ workItemId: workItem.id, note });
    },
  };
  const remoteProjectionDependencies = {
    clock: { now: () => '2026-08-07T00:00:00.000Z' },
    ...(remoteProjections
      ? {
          repository: remoteProjections,
          scope: () => ({
            workspaceIds: [],
            workTracking: 'test-work-tracking',
            pullRequests: 'test-pull-requests',
            continuousIntegration: 'test-ci',
          }),
        }
      : {}),
  };
  const remoteProjectionQueries = new RemoteProjectionService({
    workTracking: new WorkTrackingProjectionService({ ...remoteProjectionDependencies, tracker }),
    pullRequests: new PullRequestProjectionService(remoteProjectionDependencies),
    continuousIntegration: new ContinuousIntegrationProjectionService(remoteProjectionDependencies),
    includePullRequestStatus: false,
    includeContinuousIntegrationStatus: false,
  });
  const service = new AnalyzerService({
    skillTextDigest: (text) => createHash('sha256').update(text).digest('hex'),
    remoteProjectionQueries,
    repository,
    agenticDeliveryRecovery: repository,
    catalog,
    clock: { now: () => '2026-08-07T00:00:00.000Z' },
    ids: { next: (prefix) => `${prefix}-${++nextId}` },
    tracker,
    coordination: {
      coordinatesWorkItem: () => true,
      acquireWorkItemClaim: async (workItem, action, executionId) => {
        coordinationEvents.push(`acquire:${action}`);
        if (claimContended) return { status: 'contended' as const };
        return {
          status: 'acquired',
          claim: {
            id: `claim-${executionId}`,
            workItemId: workItem.id,
            action,
            owner: 'test-user',
            acquiredAt: '2026-08-07T00:00:00.000Z',
          },
        };
      },
      advanceWorkItemClaim: async (claim, action) => {
        coordinationEvents.push(`advance:${action}`);
        if (claimAdvanceError) throw claimAdvanceError;
        if (claimReferenceMissing) throw new WorkItemClaimMissingError('#1', claim.id);
        return { ...claim, action };
      },
      renewWorkItemClaim: async (claim) => {
        coordinationEvents.push('renew');
        if (claimRenewError) throw claimRenewError;
        return claim;
      },
      releaseWorkItemClaim: async () => {
        coordinationEvents.push('release');
      },
    },
    workspace: {
      prepare: async (executionId, _workItem, purpose) => {
        preparedWorkspaces.push(executionId);
        workspacePurposes.push(purpose);
        return {
          path: '/managed-workspaces/test',
          ...(purpose === 'implementation' ? { reference: 'codex/issue-1-test-work' } : {}),
        };
      },
      inspectChanges: async () => workspaceChanges,
      preserve: async (path) => {
        preservedWorkspaces.push(path);
      },
      isAvailable: async () => true,
      listManaged: async () => managedWorkspaces,
      release: async (path) => {
        releasedWorkspaces.push(path);
        return true;
      },
    },
    agent: {
      analyze: async (context, skill, request, onProgress, _simulateFailure, signal) => {
        analysisAttempts += 1;
        analysisContinuations.push(context.continuationReference);
        analysisRequests.push(request);
        analysisWorkItems.push(context.workItem);
        analysisSkills.push(skill);
        await onProgress({
          message: 'Evidence inspected.',
          continuationReference: 'codex-session-1',
        });
        if (waitForCancellation) {
          if (signal.aborted) throw new Error('Cancelled.');
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new Error('Cancelled.')), { once: true });
          });
        }
        if (shouldFail === 'interrupt-once' && analysisAttempts === 1) {
          throw new AgentInterruptionError('Connection dropped.');
        }
        if (shouldFail === 'continuation-unavailable-once' && analysisAttempts === 1) {
          throw new AgentContinuationUnavailableError('Session not found.');
        }
        if (shouldFail === true) throw new Error('Expected test failure.');
        return result;
      },
      solve: async (context, _skill, _analysis, feedback, onProgress, _simulateFailure, signal) => {
        solutionRequests.push(feedback);
        solutionWorkspaces.push(context.workspacePath);
        await onProgress({ message: 'Implementation verified.' });
        if (waitForCancellation) {
          if (signal.aborted) throw new Error('Cancelled.');
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new Error('Cancelled.')), { once: true });
          });
        }
        if (shouldFail === true) throw new Error('Expected test failure.');
        return feedback ? `Revision applied: ${feedback}` : 'Implementation persisted.';
      },
    },
    recoveryDelay: async (_attempt, signal) => {
      if (signal.aborted) throw new Error('Recovery cancelled.');
    },
    retainFailedWorkspaces: () => retainFailedWorkspaces,
    maxParallelExecutions: () => maxParallelExecutions,
    automaticDeliveryGroupingEnabledFor: () => automaticDeliveryGroupingEnabled,
    maximumVerificationRepairAttempts: () => verificationRepairAttempts,
    verifyImplementation: async (workspacePath: string) => {
      verifiedWorkspaces.push(workspacePath);
      return verificationChecks();
    },
    goalAssignmentFor: () => ({
      agentTeamId: 'delivery-team',
      responsibleAgentId: 'architect-agent',
    }),
    ...(positionPolicies
      ? {
          bindingSnapshotFor: (workItem: IWorkItem, role: SkillFlowRole) => ({
            workspaceId: workItem.workspaceId ?? 'personal',
            deliveryContextId: 'delivery-1',
            workItemSourceId: 'source-1',
            workTrackingConnectionId: 'tracking-1',
            repositoryBindingIds: ['repository-1'],
            sourceControlConnectionIds: ['source-control-1'],
            ciBindingIds: [],
            skillFlowRole: role,
            agentTeamId: 'delivery-team',
            positionId:
              role === 'solution' || role === 'ci-repair'
                ? 'position-implementation'
                : 'position-architecture',
            agentRoutePolicyId: 'route-1',
            aiConnectionId: 'connection-1',
            agentProfileId: 'architect-agent',
            model: null,
            reasoningEffort: null,
          }),
          positionPolicyFor: (positionId: string) => positionPolicies[positionId],
        }
      : {}),
    delivery: {
      publishPullRequest: async (execution) => {
        deliveredExecutionIds.push(execution.id);
        return {
          number: 17,
          externalUrl: 'https://github.com/test/repository/pull/17',
          branchUrl: 'https://github.com/test/repository/tree/codex%2Fissue-1-test-work',
        };
      },
      inspectPullRequest: async () => ({ state: 'open', draft: false }),
    },
    workflowReporter: {
      runStarted: () => undefined,
      applyRunResult: async (_item, runResult) => {
        reportedRunResults.push(runResult);
        return undefined;
      },
    },
    publish: (event) => {
      if (
        event.kind === 'analysis.completed' ||
        event.kind === 'solution.completed' ||
        event.kind === 'execution.cancelled' ||
        event.kind === 'execution.failed'
      )
        finished(event);
    },
  });
  return {
    service,
    catalog,
    remoteProjectionQueries,
    repository,
    terminalEvent,
    reportedRunResults,
    getItem: () => item,
    setItem: (updated: IWorkItem) => {
      item = updated;
    },
    addWorkItem: (additionalItem: IWorkItem) => additionalItems.push(additionalItem),
    getWorkItemReads: () => workItemReads,
    setWorkItemReadError: (error?: Error) => {
      workItemReadError = error;
    },
    transitions,
    columnMoves,
    preparedWorkspaces,
    workspacePurposes,
    preservedWorkspaces,
    releasedWorkspaces,
    managedWorkspaces,
    analysisRequests,
    analysisWorkItems,
    analysisSkills,
    analysisContinuations,
    solutionRequests,
    solutionWorkspaces,
    verifiedWorkspaces,
    setVerificationRepairAttempts: (attempts: number) => {
      verificationRepairAttempts = attempts;
    },
    setVerificationChecks: (
      checks: () => readonly {
        readonly label: string;
        readonly state: 'passed' | 'failed';
        readonly detail?: string;
        readonly output?: string;
      }[],
    ) => {
      verificationChecks = checks;
    },
    setWorkspaceChanges: (changes: {
      readonly changedFiles: readonly string[];
      readonly diffLines: number;
    }) => {
      workspaceChanges = changes;
    },
    deliveredExecutionIds,
    coordinationEvents,
    setClaimReferenceMissing: (missing: boolean) => {
      claimReferenceMissing = missing;
    },
    setClaimAdvanceError: (error?: Error) => {
      claimAdvanceError = error;
    },
    setClaimRenewError: (error?: Error) => {
      claimRenewError = error;
    },
    publishedNotes,
    setPublishNoteError: (error?: Error) => {
      publishNoteError = error;
    },
    setAutomaticDeliveryGroupingEnabled: (enabled: boolean) => {
      automaticDeliveryGroupingEnabled = enabled;
    },
    setHydrateOriginalWorkItemDetails: (enabled: boolean) => {
      hydrateOriginalWorkItemDetails = enabled;
    },
  };
}
