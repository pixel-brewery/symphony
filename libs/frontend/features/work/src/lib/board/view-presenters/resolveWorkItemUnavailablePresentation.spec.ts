// #region Imports

import { describe, expect, it } from 'vitest';
import type { WorkItemSource } from '@symphony/domain-work';
import { resolveWorkItemUnavailablePresentation } from './resolveWorkItemUnavailablePresentation';

// #endregion

const azureSource: WorkItemSource = {
  id: 'platform-engine',
  workspaceId: 'serviceware',
  connectionId: 'serviceware-ado',
  provider: 'azure-devops',
  displayName: 'Platform Engine · Bridge Team',
  project: 'Platform Engine',
  wiql: 'SELECT [System.Id] FROM WorkItems',
  enabled: true,
};

describe('resolveWorkItemUnavailablePresentation', () => {
  it('explains the missing Azure DevOps credential without exposing provider payloads', () => {
    // act
    const presentation = resolveWorkItemUnavailablePresentation(
      { state: 'unavailable', reason: 'authentication-required' },
      [azureSource],
    );

    // assert
    expect(presentation).toEqual({
      bannerHeader: 'Azure DevOps credential required',
      bannerContent:
        'Symphony cannot resolve the configured credential for “Platform Engine · Bridge Team”. Make its PAT or Entra token available to Symphony, then retry.',
      emptyHeader: 'Azure DevOps work items unavailable',
      emptyContent: 'Make the configured credential available, then retry above.',
    });
  });

  it('keeps an ordinary provider failure provider-neutral', () => {
    // act
    const presentation = resolveWorkItemUnavailablePresentation({ state: 'unavailable' }, [
      azureSource,
    ]);

    // assert
    expect(presentation).toEqual({
      bannerHeader: 'Work items are temporarily unavailable',
      bannerContent:
        'The work-item provider could not refresh this workspace. Use Retry now to try again.',
      emptyHeader: 'Work items unavailable',
      emptyContent: 'Resolve the connection problem above, then retry.',
    });
  });

  it('explains a provider request limit without claiming a storage or retry policy', () => {
    // arrange
    const status = { state: 'unavailable' as const, reason: 'rate-limited' as const };

    // act
    const presentation = resolveWorkItemUnavailablePresentation(status, [azureSource]);

    // assert
    expect(presentation).toEqual({
      bannerHeader: 'Provider request limit reached',
      bannerContent: 'The provider cannot refresh work items yet. Try again later.',
      emptyHeader: 'Work items unavailable',
      emptyContent: 'Try again after the provider request limit recovers.',
    });
  });
});
