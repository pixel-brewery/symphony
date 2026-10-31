// #region Imports

import { deliveryFlowSteps } from '@symphony/frontend-ui';
import type { IWorkspaceOrganizationView } from '../workspace-organization/IWorkspaceOrganizationView';
import type { IDeliveryFlowStepView } from './IDeliveryFlowStepView';

// #endregion

/**
 * Projects who does each delivery-flow step of a workspace: for every step, the preferred agent of
 * its first responsibility, then each backup and the agents of the step's further responsibilities,
 * every agent once.
 *
 * @param organization - The workspace organization.
 * @returns The five steps in flow order.
 * @public
 */
export function projectDeliveryFlow(
  organization: IWorkspaceOrganizationView,
): readonly IDeliveryFlowStepView[] {
  const agentsById = new Map(organization.agents.map((agent) => [agent.id, agent]));
  return deliveryFlowSteps.map((step) => {
    const agentIds = step.skillFlowRoles.flatMap((role) => {
      const assignment = organization.teams
        .flatMap((team) => team.assignments)
        .find((candidate) => candidate.role === role);
      return assignment ? [assignment.primaryAgentId, ...assignment.fallbackAgentIds] : [];
    });
    return {
      step,
      agents: [...new Set(agentIds)].flatMap((agentId) => {
        const agent = agentsById.get(agentId);
        return agent ? [agent] : [];
      }),
    };
  });
}
