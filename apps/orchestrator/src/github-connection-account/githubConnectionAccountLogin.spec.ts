// #region Imports

import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { ProviderConnection } from '@symphony/configuration-composition';
import { describe, expect, it } from 'vitest';
import { githubConnectionAccountLogin } from './githubConnectionAccountLogin';

// #endregion

type GitHubConnection = Extract<ProviderConnection, { readonly kind: 'github' }>;

const connection: GitHubConnection = {
  id: 'github-personal',
  workspaceId: 'personal',
  kind: 'github',
  displayName: 'GitHub',
  hostname: 'github.com',
  gitProtocol: 'https',
};

describe('githubConnectionAccountLogin', () => {
  it('keeps the explicitly selected account', () => {
    // arrange
    const settings = createDefaultApplicationSettings('/tmp/symphony');

    // act
    const login = githubConnectionAccountLogin(settings, {
      ...connection,
      accountLogin: 'Andre-Wehlert_swse',
    });

    // assert
    expect(login).toBe('Andre-Wehlert_swse');
  });

  it('recovers a legacy connection from its user-owned GitHub Project', () => {
    // arrange
    const settings = {
      ...createDefaultApplicationSettings('/tmp/symphony'),
      workItemSources: [
        {
          id: 'project',
          workspaceId: 'personal',
          connectionId: connection.id,
          provider: 'github-projects' as const,
          displayName: 'FLAMOX365',
          ownerType: 'user' as const,
          owner: 'RueDeRennes',
          projectNumber: 3,
          enabled: true,
        },
      ],
    };

    // act
    const login = githubConnectionAccountLogin(settings, connection);

    // assert
    expect(login).toBe('RueDeRennes');
  });

  it('does not guess between different user accounts', () => {
    // arrange
    const settings = {
      ...createDefaultApplicationSettings('/tmp/symphony'),
      workItemSources: ['RueDeRennes', 'another-user'].map((owner, index) => ({
        id: `project-${index}`,
        workspaceId: 'personal',
        connectionId: connection.id,
        provider: 'github-projects' as const,
        displayName: owner,
        ownerType: 'user' as const,
        owner,
        projectNumber: index + 1,
        enabled: true,
      })),
    };

    // act
    const login = githubConnectionAccountLogin(settings, connection);

    // assert
    expect(login).toBeUndefined();
  });
});
