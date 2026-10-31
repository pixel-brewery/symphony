// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { WorkItemLinkPresentationPipe } from './WorkItemLinkPresentationPipe';

// #endregion

const workItem: IWorkItem = {
  id: 'work-1',
  externalId: '#1',
  title: 'Link actions',
  body: '',
  provider: 'github-projects',
  repository: 'owner/repository',
  externalUrl: 'https://github.com/owner/repository/issues/1',
  labels: [],
  assignees: [],
};

describe('WorkItemLinkPresentationPipe', () => {
  const pipe = new WorkItemLinkPresentationPipe();

  it('offers no link actions for an item its tracker never published', () => {
    // act
    const actual = pipe.transform({ ...workItem, externalUrl: undefined });

    // assert
    expect(actual).toBeUndefined();
  });

  it('names the tracker the link leads to', () => {
    // act
    // arrange
    const github = pipe.transform(workItem);
    // assert
    expect(github?.openIconName).toBe('github');
    expect(github?.openLabel).toContain('GitHub');
    expect(github?.copyLabel).toContain('GitHub');

    const azure = pipe.transform({ ...workItem, provider: 'azure-devops' });
    expect(azure?.openIconName).toBe('azureDevOps');
    expect(azure?.openLabel).toContain('Azure DevOps');
  });

  it('still offers both actions for a tracker the board does not recognise', () => {
    // act
    // arrange
    const unknown = pipe.transform({ ...workItem, provider: 'Simulated tracker' });
    // assert
    expect(unknown).toEqual({
      url: workItem.externalUrl,
      copyLabel: 'Copy URL',
      openLabel: 'Open in browser',
      openIconName: 'open',
    });
  });
});
