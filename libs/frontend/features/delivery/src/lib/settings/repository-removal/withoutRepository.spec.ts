// #region Imports

import { describe, expect, it } from 'vitest';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { withoutRepository } from './withoutRepository';

// #endregion

describe('withoutRepository', () => {
  it('removes its destinations while preserving another project and valid settings', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
    settings.connections.push({
      id: 'github',
      workspaceId: 'personal',
      kind: 'github',
      displayName: 'GitHub',
      hostname: 'github.com',
      gitProtocol: 'https',
    });
    settings.repositoryBindings = ['removed', 'retained'].map((id) => ({
      id,
      workspaceId: 'personal',
      sourceControlConnectionId: 'github',
      displayName: id,
      provider: 'simulated',
      host: 'github.com',
      owner: 'fixture',
      name: id,
      defaultBranch: 'main',
      localPath: '',
      enabled: true,
    }));
    settings.deliveryTargets = settings.repositoryBindings.map((repository) => ({
      id: `${repository.id}-production`,
      workspaceId: 'personal',
      repositoryBindingId: repository.id,
      displayName: 'Production',
      kind: 'environment',
      environment: 'production',
      production: true,
    }));

    // act
    const result = withoutRepository(settings, 'removed');

    // assert
    expect(result.deliveryTargets.map((target) => target.id)).toEqual(['retained-production']);
    expect(result.connections.some((connection) => connection.id === 'github')).toBe(true);
    expect(applicationSettingsSchema.safeParse(result).success).toBe(true);
    expect(settings.deliveryTargets).toHaveLength(2);
  });
});
