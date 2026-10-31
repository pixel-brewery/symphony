// #region Imports

import { describe, expect, it } from 'vitest';
import { applicationSettingsSchema } from '../application-settings/ApplicationSettingsSchema';
import { createDefaultApplicationSettings } from '../application-settings/createDefaultApplicationSettings';
import { createWorkspaceBundle } from './createWorkspaceBundle';
import { planWorkspaceImport } from './planWorkspaceImport';
import { workspaceBundleSchema } from './WorkspaceBundleSchema';
import { WorkspaceTransferTestFixtures } from './WorkspaceTransferTestFixtures';

// #endregion

const { configuredWorkspace, fixedDate, sharedSkill } = WorkspaceTransferTestFixtures;

describe('planWorkspaceImport', () => {
  it.each([
    { kind: 'icon', value: 'compass-northwest' },
    { kind: 'emoji', value: '👩🏽‍💻' },
    { kind: 'monogram', value: 'Ä9' },
  ])('round trips a portable workspace $kind and its existing color', (avatar) => {
    // arrange
    const source = configuredWorkspace();
    const configured = applicationSettingsSchema.parse({
      ...source,
      workspaces: source.workspaces.map((workspace) => ({
        ...workspace,
        avatar,
        color: '#ff6900',
      })),
    });
    const bundle = createWorkspaceBundle(configured, 'personal', [sharedSkill()], fixedDate());
    const serialized: unknown = JSON.parse(JSON.stringify(bundle));
    const target = createDefaultApplicationSettings('/target/operator');

    // act
    const plan = planWorkspaceImport(
      target,
      workspaceBundleSchema.parse(serialized),
      (id) => `/target/repositories/${id}`,
    );

    // assert
    expect(bundle.version).toBe(2);
    expect(plan.settings.version).toBe(6);
    expect(plan.settings.workspaces.find((workspace) => workspace.id === 'personal')).toMatchObject(
      {
        avatar,
        color: '#ff6900',
      },
    );
  });

  it('imports one workspace without changing machine and user settings', () => {
    // arrange
    const bundle = createWorkspaceBundle(
      configuredWorkspace(),
      'personal',
      [sharedSkill()],
      fixedDate(),
    );
    const targetDefaults = createDefaultApplicationSettings('/target/operator');
    const target = applicationSettingsSchema.parse({
      ...targetDefaults,
      user: { displayName: 'Target operator', email: '', theme: 'dark', arcadeEnabled: false },
      runtime: { ...targetDefaults.runtime, workspaceRoot: '/target/worktrees' },
    });

    // act
    const plan = planWorkspaceImport(target, bundle, (id) => `/target/repositories/${id}`);

    // assert
    expect(plan.replaced).toBe(true);
    expect(bundle.workspace).not.toHaveProperty('avatar');
    expect(
      plan.settings.workspaces.find((workspace) => workspace.id === 'personal'),
    ).not.toHaveProperty('avatar');
    expect(plan.settings.user).toEqual(target.user);
    expect(plan.settings.feedbackIntakeSources).toContainEqual(
      expect.objectContaining({ id: 'teams-feedback', enabled: false }),
    );
    expect(plan.settings.runtime).toEqual(target.runtime);
    expect(plan.settings.activeViewScope.workspaceIds).toEqual(['personal']);
    expect(plan.settings.repositoryBindings[0]?.localPath).toBe(
      '/target/repositories/platform-repository',
    );
    expect(plan.requiredConnectionIds).toEqual(['personal-codex', 'platform-github']);
    expect(plan.skills).toEqual([expect.objectContaining({ name: 'workspace-policy' })]);
  });

  it('round trips the complete AI team configuration', () => {
    // arrange
    const source = configuredWorkspace();
    const bundle = createWorkspaceBundle(source, 'personal', [sharedSkill()], fixedDate());
    // act
    const target = createDefaultApplicationSettings('/target/operator');

    // assert
    expect(bundle.positions).toEqual(
      source.positions.filter((position) => position.workspaceId === 'personal'),
    );
    expect(bundle.agentProfiles).toEqual(
      source.agentProfiles.filter((profile) => profile.workspaceId === 'personal'),
    );
    expect(bundle.agentTeams).toEqual(
      source.agentTeams.filter((team) => team.workspaceId === 'personal'),
    );
    expect(bundle.agentRoutePolicies).toEqual(
      source.agentRoutePolicies.filter((policy) => policy.workspaceId === 'personal'),
    );
    expect(bundle.providerManifests).toEqual(
      source.providerManifests.filter((manifest) => manifest.workspaceId === 'personal'),
    );
    expect(bundle.deliveryContexts).toEqual(
      source.deliveryContexts.filter((context) => context.workspaceId === 'personal'),
    );

    const plan = planWorkspaceImport(target, bundle, (id) => `/target/repositories/${id}`);

    expect(plan.settings.positions).toEqual(bundle.positions);
    expect(plan.settings.agentProfiles).toEqual(bundle.agentProfiles);
    expect(plan.settings.agentTeams).toEqual(bundle.agentTeams);
    expect(plan.settings.agentRoutePolicies).toEqual(bundle.agentRoutePolicies);
    expect(plan.settings.providerManifests).toEqual(bundle.providerManifests);
    expect(plan.settings.deliveryContexts).toEqual(bundle.deliveryContexts);
    expect(plan.settings.agentTeams[0]).toMatchObject({
      description: expect.any(String),
      assignments: expect.arrayContaining([
        expect.objectContaining({
          role: 'analysis',
          primaryAgentId: expect.any(String),
          fallbackAgentIds: expect.any(Array),
          skillId: 'user:workspace-policy',
        }),
      ]),
    });
    expect(plan.settings.positions[0]).toMatchObject({
      description: expect.any(String),
      responsibilities: expect.any(Array),
      allowedRoles: expect.any(Array),
      authority: expect.any(String),
    });
    expect(plan.settings.agentRoutePolicies[0]?.candidates[0]).toMatchObject({
      model: 'gpt-5.6-sol',
      reasoningEffort: 'high',
    });
  });

  it('preserves an existing target-machine repository path when replacing a workspace', () => {
    // arrange
    const source = configuredWorkspace();
    const bundle = createWorkspaceBundle(source, 'personal', [sharedSkill()], fixedDate());
    const target = applicationSettingsSchema.parse({
      ...source,
      repositoryBindings: source.repositoryBindings.map((binding) => ({
        ...binding,
        localPath: '/target/existing-checkout',
      })),
      runtime: { ...source.runtime, workspaceRoot: '/target/worktrees' },
    });

    // act
    const plan = planWorkspaceImport(target, bundle, () => '/target/generated');

    // assert
    expect(plan.settings.repositoryBindings[0]?.localPath).toBe('/target/existing-checkout');
  });

  it('does not select an imported disabled workspace', () => {
    // arrange
    const source = configuredWorkspace();
    const bundle = createWorkspaceBundle(source, 'personal', [sharedSkill()], fixedDate());
    const customer = {
      id: 'customer',
      displayName: 'Customer',
      shortCode: 'C',
      color: '#008272',
      enabled: true,
      isolation: 'strict' as const,
    };
    const target = applicationSettingsSchema.parse({
      ...source,
      workspaces: [...source.workspaces, customer],
      activeViewScope: { workspaceIds: ['customer'], boardLayout: 'mixed' },
    });

    // act
    const plan = planWorkspaceImport(
      target,
      workspaceBundleSchema.parse({
        ...bundle,
        workspace: { ...bundle.workspace, enabled: false },
      }),
      () => '/target/generated',
    );

    // assert
    expect(plan.settings.activeViewScope.workspaceIds).toEqual(['customer']);
  });
});
