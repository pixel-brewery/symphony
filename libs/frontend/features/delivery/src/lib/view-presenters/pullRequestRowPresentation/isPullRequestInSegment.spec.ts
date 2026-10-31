// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { describe, expect, it } from 'vitest';
import { isPullRequestInSegment } from './isPullRequestInSegment';

// #endregion

describe('isPullRequestInSegment', () => {
  it.each([
    ['open', { state: 'open', draft: false }, false, true],
    ['open', { state: 'open', draft: true }, false, true],
    ['open', { state: 'merged', draft: false }, false, false],
    ['needs-action', { state: 'open', draft: false }, true, true],
    ['needs-action', { state: 'open', draft: false }, false, false],
    ['drafts', { state: 'open', draft: true }, false, true],
    ['drafts', { state: 'open', draft: false }, true, false],
  ] as const)('lists %s: %j needing action %s → %s', (segment, state, needsAction, expected) => {
    // arrange
    const row = { pullRequest: state as unknown as IPullRequestSummary, needsAction };

    // act
    const listed = isPullRequestInSegment(row, segment);

    // assert
    expect(listed).toBe(expected);
  });
});
