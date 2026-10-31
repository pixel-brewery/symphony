// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import { InboxEntrySubtitlePipe } from './InboxEntrySubtitlePipe';

// #endregion

function entry(overrides: Partial<IInboxEntry>): IInboxEntry {
  return {
    id: 'entry',
    group: 'decision',
    kind: 'solution',
    at: '2026-10-30T10:00:00.000Z',
    workItem: { externalId: 'CR-0571', title: 'Validate the export' } as IWorkItem,
    findings: [],
    options: [],
    ...overrides,
  };
}

describe('InboxEntrySubtitlePipe', () => {
  it('names the work item, or the branch and short revision of a failed run', () => {
    // arrange
    const pipe = new InboxEntrySubtitlePipe();

    // act
    const subtitles = [
      entry({}),
      entry({ kind: 'acceptance' }),
      entry({
        kind: 'failing-workflow',
        workItem: undefined,
        branch: 'main',
        revision: 'e81f3b2aa71',
      }),
      entry({
        kind: 'merged-pull-request',
        workItem: undefined,
        pullRequestTitle: 'Export as CSV',
      }),
    ].map((value) => pipe.transform(value));

    // assert
    expect(subtitles).toEqual([
      'Validate the export',
      'CR-0571 · Validate the export',
      'main · e81f3b2',
      'Export as CSV',
    ]);
  });
});
