// #region Imports
import { describe, expect, it } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { mobileDisplaySettingsSchema } from '@symphony/mobile-contracts';
import { projectMobileDisplaySettings } from './projectMobileDisplaySettings';
// #endregion

describe('projectMobileDisplaySettings', () => {
  it('preserves selected operational display values and excludes host secrets and unselected workspaces', () => {
    // arrange
    const settings = createDefaultApplicationSettings('/private/host-home');
    const repository = {
      id: 'repository',
      workspaceId: settings.activeViewScope.workspaceIds[0]!,
      sourceControlConnectionId: 'private-connection-ref',
      displayName: 'Example',
      provider: 'simulated' as const,
      host: 'example.invalid',
      owner: 'fixture',
      name: 'project',
      defaultBranch: 'main',
      enabled: true,
      localPath: '/private/repository',
      localCiSetupScript: 'private provision command',
    };
    const seeded = {
      ...settings,
      runtime: { ...settings.runtime, workspaceRoot: '/private/worktrees' },
      repositoryBindings: [
        repository,
        {
          ...repository,
          id: 'foreign-repository',
          workspaceId: 'unselected-workspace',
          displayName: 'Unselected repository',
        },
      ],
    };
    // act
    const projected = projectMobileDisplaySettings(seeded);
    const encoded = JSON.stringify(projected);
    // assert
    expect(projected.repositories).toHaveLength(1);
    expect(projected.repositories[0]).toMatchObject({
      id: 'repository',
      displayName: 'Example',
      host: 'example.invalid',
      owner: 'fixture',
      name: 'project',
    });
    expect(projected.workspaces[0]?.id).toBe(settings.activeViewScope.workspaceIds[0]);
    expect(projected.employees[0]?.id).toBe(settings.agentProfiles[0]?.id);
    expect(projected.automaticExecutionEnabled).toBe(settings.runtime.automaticExecutionEnabled);
    for (const forbidden of [
      'workspaceRoot',
      'localPath',
      'localCiSetupScript',
      'credentialRef',
      'connections',
      '/private/',
      'private-connection-ref',
      'Unselected repository',
      'personal-default-route',
    ]) {
      expect(encoded).not.toContain(forbidden);
    }
    expect(() =>
      mobileDisplaySettingsSchema.parse({ ...projected, runtime: seeded.runtime }),
    ).toThrow();
  });
});
