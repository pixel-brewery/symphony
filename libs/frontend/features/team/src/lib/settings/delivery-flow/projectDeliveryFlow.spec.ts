// @vitest-environment jsdom

// #region Imports

import { describe, expect, it } from 'vitest';
import type { IWorkspaceAgentView } from '../workspace-organization/IWorkspaceAgentView';
import type { IWorkspaceOrganizationView } from '../workspace-organization/IWorkspaceOrganizationView';
import type { IWorkspaceTeamAssignmentView } from '../workspace-organization/IWorkspaceTeamAssignmentView';
import { projectDeliveryFlow } from './projectDeliveryFlow';

// #endregion

function agent(id: string, displayName: string): IWorkspaceAgentView {
  return {
    id,
    displayName,
    positionDisplayName: 'Developer',
    positionDescription: undefined,
    responsibilities: [],
    enabled: true,
    fallbacks: [],
  };
}

function assignment(
  role: IWorkspaceTeamAssignmentView['role'],
  primaryAgentId: string,
  fallbackAgentIds: readonly string[] = [],
): IWorkspaceTeamAssignmentView {
  return {
    role,
    primaryAgentId,
    fallbackAgentIds,
    primaryAgentDisplayName: primaryAgentId,
    fallbackAgentDisplayNames: [],
    skillId: null,
  };
}

describe('projectDeliveryFlow', () => {
  it('lists the preferred agent and then the backups of every step in flow order', () => {
    // arrange
    const organization: IWorkspaceOrganizationView = {
      positions: [],
      providers: [],
      routes: [],
      agents: [agent('paul', 'Paul Planung'), agent('ida', 'Ida Implementierung')],
      teams: [
        {
          id: 'team',
          displayName: 'Delivery team',
          description: '',
          assignments: [
            assignment('pull-request-review', 'paul'),
            assignment('solution', 'ida', ['paul']),
            assignment('work-item-creation', 'paul', ['ida']),
            assignment('analysis', 'paul'),
            assignment('ci-diagnosis', 'ida'),
            assignment('ci-repair', 'ida', ['missing']),
          ],
        },
      ],
    };

    // act
    const actual = projectDeliveryFlow(organization).map((entry) => [
      entry.step.label,
      entry.agents.map((item) => item.displayName),
    ]);

    // assert
    expect(actual).toEqual([
      ['Create', ['Paul Planung', 'Ida Implementierung']],
      ['Plan', ['Paul Planung']],
      ['Implement and verify', ['Ida Implementierung', 'Paul Planung']],
      ['Fix failed checks', ['Ida Implementierung']],
      ['Address reviews', ['Paul Planung']],
    ]);
  });

  it('keeps a step without an assignment empty', () => {
    // arrange
    const organization: IWorkspaceOrganizationView = {
      positions: [],
      providers: [],
      routes: [],
      agents: [agent('paul', 'Paul Planung')],
      teams: [],
    };

    // act
    const actual = projectDeliveryFlow(organization).every((entry) => entry.agents.length === 0);

    // assert
    expect(actual).toBe(true);
  });
});
