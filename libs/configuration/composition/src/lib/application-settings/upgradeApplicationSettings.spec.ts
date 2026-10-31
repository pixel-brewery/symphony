// #region Imports

import { describe, expect, it } from 'vitest';
import { createDefaultApplicationSettings } from './createDefaultApplicationSettings';
import { upgradeApplicationSettings } from './upgradeApplicationSettings';
import { defaultWorkflow } from '@symphony/domain-workflow';

// #endregion

describe('upgradeApplicationSettings', () => {
  it('migrates v5 identities and a custom workflow without losing profile appearance or references', () => {
    // arrange
    const defaults = createDefaultApplicationSettings();
    const legacy = {
      ...defaults,
      version: 5,
      workflow: { ...defaults.workflow, id: 'my-own-process', version: 91 },
      agentProfiles: defaults.agentProfiles.map(({ appearance, ...profile }) => {
        void appearance;
        return profile;
      }),
    };
    // act
    const first = upgradeApplicationSettings(legacy);
    const second = upgradeApplicationSettings(legacy);
    // assert
    expect(first.version).toBe(6);
    expect(first.workflow).toEqual(legacy.workflow);
    expect(first.agentProfiles[0]?.id).toBe(legacy.agentProfiles[0]?.id);
    expect(first.agentProfiles[0]?.appearance).toEqual(second.agentProfiles[0]?.appearance);
    expect(first.deliveryContexts).toEqual(legacy.deliveryContexts);
    expect(first.agentTeams).toEqual(legacy.agentTeams);
  });

  it('migrates a former multi-workspace selection to the selected board workspace', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const serviceware = {
      id: 'serviceware',
      displayName: 'Serviceware',
      shortCode: 'SW',
      color: '#c42b1c',
      enabled: true,
      isolation: 'strict' as const,
    };

    // act
    const upgraded = upgradeApplicationSettings({
      ...defaults,
      workspaces: [...defaults.workspaces, serviceware],
      connections: [
        ...defaults.connections,
        {
          id: 'serviceware-azure-devops',
          workspaceId: serviceware.id,
          kind: 'azure-devops',
          displayName: 'Serviceware Azure DevOps',
          organization: 'serviceware-se',
        },
      ],
      workItemSources: [
        {
          id: 'serviceware-bridge-team',
          workspaceId: serviceware.id,
          connectionId: 'serviceware-azure-devops',
          provider: 'azure-devops',
          displayName: 'Bridge Team',
          project: 'Platform Engine',
          team: 'Bridge Team',
          queryId: '00000000-0000-4000-8000-000000000001',
          enabled: true,
        },
      ],
      activeViewScope: {
        ...defaults.activeViewScope,
        workspaceIds: ['personal', serviceware.id],
        workItemSourceId: 'serviceware-bridge-team',
      },
    });

    // assert
    expect(upgraded.activeViewScope).toMatchObject({
      workspaceIds: [serviceware.id],
      workItemSourceId: 'serviceware-bridge-team',
    });
  });

  it('upgrades account-bound v2 profiles into positions, routes, teams, and v3 contexts', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const { positions, agentRoutePolicies, agentProfiles, agentTeams, ...portable } = defaults;
    void positions;
    void agentRoutePolicies;
    void agentProfiles;
    void agentTeams;
    // act
    const upgraded = upgradeApplicationSettings({
      ...portable,
      version: 2,
      agentProfiles: [
        {
          id: 'legacy-agent',
          workspaceId: 'personal',
          displayName: 'Legacy architect',
          aiConnectionId: 'personal-codex',
          activeSkillIds: ['repository:analyze-change-request'],
          skillFlowAssignments: [
            { role: 'analysis', skillId: 'repository:analyze-change-request' },
          ],
          model: 'gpt-5.6-sol',
          reasoningEffort: 'high',
        },
      ],
      deliveryContexts: [
        {
          id: 'legacy-delivery',
          workspaceId: 'personal',
          displayName: 'Legacy delivery',
          workItemSourceIds: [],
          repositoryBindingIds: [],
          ciBindingIds: [],
          agentProfileId: 'legacy-agent',
          enabled: true,
        },
      ],
    });

    // assert
    expect(upgraded.version).toBe(6);
    expect(upgraded.agentProfiles[0]).toMatchObject({
      id: 'legacy-agent',
      positionId: 'legacy-agent-position',
      routePolicyId: 'legacy-agent-route',
    });
    expect(upgraded.agentRoutePolicies[0]?.candidates[0]).toMatchObject({
      aiConnectionId: 'personal-codex',
      model: 'gpt-5.6-sol',
      reasoningEffort: 'high',
    });
    expect(upgraded.deliveryContexts[0]?.agentTeamId).toBe('legacy-delivery-team');
    expect(
      upgraded.agentTeams[0]?.assignments.find((assignment) => assignment.role === 'analysis')
        ?.skillId,
    ).toBe('repository:analyze-change-request');
  });

  it('adopts the evolved shipped workflow and leaves a customized definition untouched', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    // A persisted copy of the shipped process from before the guard reduction: it still lists
    // guards no role can prove yet, which rejected every automatic Qualified -> Ready move.
    const staleShippedWorkflow = {
      ...defaultWorkflow,
      version: 1,
      transitions: defaultWorkflow.transitions.map((transition) =>
        transition.id === 'qualified-to-ready'
          ? {
              ...transition,
              guards: [
                'analysis-complete',
                'analysis-feasible',
                'no-open-question',
                'issue-revision-current',
                'test-strategy-present',
                'acceptance-mapping-complete',
              ] as const,
            }
          : transition,
      ),
    };

    // act
    const adopted = upgradeApplicationSettings({ ...defaults, workflow: staleShippedWorkflow });
    // assert
    expect(adopted.workflow.version).toBe(defaultWorkflow.version);
    expect(
      adopted.workflow.transitions.find((transition) => transition.id === 'qualified-to-ready')
        ?.guards,
    ).toEqual(
      defaultWorkflow.transitions.find((transition) => transition.id === 'qualified-to-ready')
        ?.guards,
    );

    const customized = upgradeApplicationSettings({
      ...defaults,
      workflow: { ...staleShippedWorkflow, id: 'custom-delivery' },
    });
    expect(customized.workflow.id).toBe('custom-delivery');
    expect(customized.workflow.version).toBe(1);
    expect(
      customized.workflow.transitions.find((transition) => transition.id === 'qualified-to-ready')
        ?.guards,
    ).toHaveLength(6);
  });

  it('moves the former host-wide local runner switch onto every workspace', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const { localCiEnabled, ...workspaceWithoutSwitch } = defaults.workspaces[0]!;
    void localCiEnabled;

    // act
    const upgraded = upgradeApplicationSettings({
      ...defaults,
      version: 4,
      workspaces: [
        workspaceWithoutSwitch,
        { ...workspaceWithoutSwitch, id: 'customer', displayName: 'Customer', shortCode: 'C' },
      ],
      localCi: { ...defaults.localCi, enabled: true },
    });

    // assert
    expect(upgraded.version).toBe(6);
    expect(upgraded.workspaces.map((workspace) => workspace.localCiEnabled)).toEqual([true, true]);
    expect(upgraded.localCi).not.toHaveProperty('enabled');
  });

  it('leaves local runs off for every workspace when the installation never enabled them', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const { localCiEnabled, ...workspaceWithoutSwitch } = defaults.workspaces[0]!;
    void localCiEnabled;

    // act
    const upgraded = upgradeApplicationSettings({
      ...defaults,
      version: 4,
      workspaces: [workspaceWithoutSwitch],
      localCi: { ...defaults.localCi, enabled: false },
    });

    // assert
    expect(upgraded.workspaces[0]?.localCiEnabled).toBe(false);
  });

  it('raises an unsafe legacy custom runner memory limit to the supported floor', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/Users/operator');

    // act
    const upgraded = upgradeApplicationSettings({
      ...defaults,
      localCi: {
        ...defaults.localCi,
        resourcePreset: 'custom',
        customResources: { cpus: 4, memoryGiB: 2, diskGiB: 24, cacheGiB: 4 },
      },
    });

    // assert
    expect(upgraded.localCi.customResources?.memoryGiB).toBe(8);
  });
});
