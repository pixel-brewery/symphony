// #region Imports
import {
  primaryDeliveryContext,
  workItemSourceFor,
  repositoryBindingsFor,
  agentExecutionTargetsFor,
} from '@symphony/configuration-composition';
import { type SkillFlowRole } from '@symphony/domain-skills';
import { type IExecutionBindingSnapshot } from '@symphony/domain-execution';
import { type ICreateExecutionBindingsDependencies } from './ICreateExecutionBindingsDependencies';
import { type IAnalyzerDependencies } from '@symphony/application-execution';
// #endregion

/**
 * Owns executionBindings commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createExecutionBindings(dependencies: ICreateExecutionBindingsDependencies) {
  const { deletingWorkspaceIds, settingsState, repository } = dependencies;
  function resolveExecutionBindingSnapshot(
    workItem: {
      id?: string;
      workspaceId?: string;
      sourceId?: string;
      repositoryBindingIds?: readonly string[];
      repository: string;
    },
    role: SkillFlowRole,
    agentTeamId?: string,
  ): IExecutionBindingSnapshot | undefined {
    if (!workItem.workspaceId || !workItem.sourceId) return undefined;
    if (deletingWorkspaceIds().has(workItem.workspaceId)) return undefined;
    const usesSimulatedTracker = process.env['SYMPHONY_TRACKER_MODE'] === 'simulated';
    const source = workItemSourceFor(settingsState.current, workItem);
    const context = settingsState.current.deliveryContexts.find(
      (candidate) =>
        candidate.enabled &&
        candidate.workspaceId === workItem.workspaceId &&
        (candidate.workItemSourceIds.includes(workItem.sourceId!) || usesSimulatedTracker),
    );
    if ((!source && !usesSimulatedTracker) || !context) return undefined;
    const repositories = repositoryBindingsFor(settingsState.current, workItem);
    const goal = repository.listGoals().find((candidate) => candidate.workItemId === workItem.id);
    const targets = agentExecutionTargetsFor(
      settingsState.current,
      role,
      workItem.workspaceId,
      agentTeamId ?? goal?.assignment.agentTeamId ?? context.agentTeamId,
    );
    const target =
      targets.find((candidate) => candidate.agent.id === goal?.assignment.responsibleAgentId) ??
      targets[0];
    if (!target) return undefined;
    const sourceControlConnectionIds = [
      ...new Set(repositories.map((repository) => repository.sourceControlConnectionId)),
    ];
    const repositoryIds = repositories.map((repository) => repository.id);
    const ciBindingIds = settingsState.current.ciBindings
      .filter(
        (binding) =>
          binding.workspaceId === workItem.workspaceId &&
          repositoryIds.includes(binding.repositoryBindingId),
      )
      .map((binding) => binding.id);
    return {
      workspaceId: workItem.workspaceId,
      deliveryContextId: context.id,
      workItemSourceId: source?.id ?? workItem.sourceId,
      workTrackingConnectionId: source?.connectionId ?? 'simulated',
      repositoryBindingIds: repositoryIds,
      sourceControlConnectionIds,
      ciBindingIds,
      skillFlowRole: role,
      agentTeamId: target.team.id,
      positionId: target.position.id,
      agentRoutePolicyId: target.routePolicy.id,
      agentRouteCandidateId: target.routeCandidate.id,
      aiConnectionId: target.connection.id,
      agentProfileId: target.agent.id,
      model: target.routeCandidate.model,
      reasoningEffort: target.routeCandidate.reasoningEffort,
      costPolicy: target.routePolicy.costPolicy,
    };
  }

  const goalAssignmentFor: NonNullable<IAnalyzerDependencies['goalAssignmentFor']> = (
    workItem,
    requestedTeamId,
    requestedAgentId,
  ) => {
    if (!workItem.workspaceId) return undefined;
    const context = primaryDeliveryContext(settingsState.current, workItem.workspaceId);
    const team = settingsState.current.agentTeams.find(
      (candidate) =>
        candidate.workspaceId === workItem.workspaceId &&
        candidate.id === (requestedTeamId ?? context?.agentTeamId),
    );
    if (!team) return undefined;
    const teamAgentIds = new Set(
      team.assignments.flatMap((assignment) => [
        assignment.primaryAgentId,
        ...assignment.fallbackAgentIds,
      ]),
    );
    const defaultAgentId =
      team.assignments.find((assignment) => assignment.role === 'analysis')?.primaryAgentId ??
      team.assignments[0]?.primaryAgentId;
    const responsibleAgent = settingsState.current.agentProfiles.find(
      (candidate) =>
        candidate.workspaceId === workItem.workspaceId &&
        candidate.enabled &&
        teamAgentIds.has(candidate.id) &&
        candidate.id === (requestedAgentId ?? defaultAgentId),
    );
    const role =
      repository.listGoals().find((goal) => goal.workItemId === workItem.id)?.currentRole ??
      'analysis';
    const eligible =
      responsibleAgent &&
      agentExecutionTargetsFor(settingsState.current, role, workItem.workspaceId, team.id).some(
        (target) => target.agent.id === responsibleAgent.id,
      );
    return eligible && responsibleAgent
      ? { agentTeamId: team.id, responsibleAgentId: responsibleAgent.id }
      : undefined;
  };

  const positionPolicyFor: NonNullable<IAnalyzerDependencies['positionPolicyFor']> = (
    positionId,
  ) => {
    const position = settingsState.current.positions.find(
      (candidate) => candidate.id === positionId,
    );
    return position
      ? {
          allowedPathPatterns: position.allowedPathPatterns ?? ['**'],
          forbiddenPathPatterns: position.forbiddenPathPatterns ?? [
            '.git/**',
            '.env',
            '.env.*',
            '**/credentials/**',
          ],
          maximumChangedFiles: position.maximumChangedFiles ?? 100,
          maximumDiffLines: position.maximumDiffLines ?? 20_000,
          maximumIterations: position.maximumIterations ?? 8,
        }
      : undefined;
  };

  return Object.freeze({ resolveExecutionBindingSnapshot, goalAssignmentFor, positionPolicyFor });
}
