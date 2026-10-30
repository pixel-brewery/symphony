// #region Imports

import { describe, expect, it } from 'vitest';
import { createDefaultApplicationSettings } from '../application-settings/createDefaultApplicationSettings';
import { repositoryBindingsFor } from './repositoryBindingsFor';

// #endregion

describe('repositoryBindingsFor', () => {
  it('rejects explicit repository IDs from another workspace and uses the local default', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp/symphony-selection-test');
    const settings = {
      ...defaults,
      workspaces: [
        defaults.workspaces[0]!,
        {
          id: 'customer',
          displayName: 'Customer',
          shortCode: 'C',
          color: '#008272',
          enabled: true,
          isolation: 'strict' as const,
          storageLimitGiB: 20,
          localCiEnabled: false,
        },
      ],
      repositoryBindings: [
        {
          id: 'personal-repository',
          workspaceId: 'personal',
          sourceControlConnectionId: 'personal-github',
          displayName: 'Personal repository',
          provider: 'github' as const,
          host: 'github.com',
          owner: 'example',
          name: 'personal',
          defaultBranch: 'main',
          localPath: '/tmp/personal',
          enabled: true,
        },
        {
          id: 'customer-repository',
          workspaceId: 'customer',
          sourceControlConnectionId: 'customer-github',
          displayName: 'Customer repository',
          provider: 'github' as const,
          host: 'github.com',
          owner: 'customer',
          name: 'application',
          defaultBranch: 'main',
          localPath: '/tmp/customer',
          enabled: true,
        },
      ],
      deliveryContexts: [
        {
          id: 'personal-delivery',
          workspaceId: 'personal',
          displayName: 'Personal',
          workItemSourceIds: [],
          repositoryBindingIds: ['personal-repository'],
          ciBindingIds: [],
          agentTeamId: defaults.agentTeams[0]!.id,
          defaultRepositoryBindingId: 'personal-repository',
          enabled: true,
        },
      ],
    };

    const selected = repositoryBindingsFor(settings, {
      workspaceId: 'personal',
      repository: '',
      repositoryBindingIds: ['customer-repository'],
    });

    // act
    const actual = selected.map((repository) => repository.id);

    // assert
    expect(actual).toEqual(['personal-repository']);
  });

  it('selects one explicit repository from several bindings in the same workspace', () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp/symphony-multi-repository-test');
    const settings = {
      ...defaults,
      repositoryBindings: [
        {
          id: 'web-repository',
          workspaceId: 'personal',
          sourceControlConnectionId: 'personal-github',
          displayName: 'FLAMOX365 Web',
          provider: 'github' as const,
          host: 'github.com',
          owner: 'ruederennes',
          name: 'web-app',
          defaultBranch: 'main',
          localPath: '/tmp/web-app',
          enabled: true,
        },
        {
          id: 'api-repository',
          workspaceId: 'personal',
          sourceControlConnectionId: 'personal-github',
          displayName: 'FLAMOX365 API',
          provider: 'github' as const,
          host: 'github.com',
          owner: 'ruederennes',
          name: 'platform-api',
          defaultBranch: 'main',
          localPath: '/tmp/platform-api',
          enabled: true,
        },
      ],
    };

    const selected = repositoryBindingsFor(settings, {
      workspaceId: 'personal',
      repository: 'ruederennes/platform-api',
      repositoryBindingIds: ['api-repository'],
    });

    // act
    const actual = selected.map((repository) => repository.id);

    // assert
    expect(actual).toEqual(['api-repository']);
  });
});
