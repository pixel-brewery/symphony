// #region Imports

import { describe, expect, it } from 'vitest';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import { InboxAcceptOptionPipe } from './InboxAcceptOptionPipe';

// #endregion

function entry(overrides: Partial<IInboxEntry>): IInboxEntry {
  return {
    id: 'entry',
    group: 'decision',
    kind: 'acceptance',
    at: '2026-10-30T10:00:00.000Z',
    findings: [],
    options: [],
    ...overrides,
  };
}

describe('InboxAcceptOptionPipe', () => {
  it('offers the advancing gate decision or the goal approval of delivered work only', () => {
    // arrange
    const pipe = new InboxAcceptOptionPipe();
    const accept = {
      id: 'decide-accept',
      kind: 'decide',
      optionId: 'accept',
      label: 'Accept',
      effect: 'advance',
    } as const;
    const reject = { ...accept, id: 'decide-reject', optionId: 'reject', effect: 'route' } as const;
    const approve = { id: 'review-approved', kind: 'review-goal', decision: 'approved' } as const;

    // act
    const options = [
      pipe.transform(entry({ options: [reject, accept] })),
      pipe.transform(entry({ options: [approve] })),
      pipe.transform(entry({ kind: 'solution', options: [accept] })),
    ];

    // assert
    expect(options).toEqual([accept, approve, undefined]);
  });
});
