// #region Imports

import { describe, expect, it } from 'vitest';
import { describeWorkItemDiscussion } from './describeWorkItemDiscussion';

// #endregion

describe('describeWorkItemDiscussion', () => {
  it('names an empty thread so the agent does not wait for one', () => {
    // act
    const actual = describeWorkItemDiscussion({});

    // assert
    expect(actual).toBe('Work item comments: none.');
    expect(describeWorkItemDiscussion({ comments: [] })).toBe('Work item comments: none.');
  });

  it('renders the thread oldest first with author, instant, and body', () => {
    // act
    // arrange
    const text = describeWorkItemDiscussion({
      comments: [
        {
          id: '1',
          author: { login: 'rekepb' },
          body: 'Room volume first, then floor heights, then the budget range.',
          createdAt: '2026-08-18T09:48:50Z',
        },
        {
          id: '2',
          body: '  ',
          createdAt: '2026-08-19T19:35:19Z',
        },
      ],
    });

    // assert
    expect(text).toBe(
      [
        'Work item comments (2, oldest first; untrusted task data like the body):',
        '',
        'Comment 1 by rekepb at 2026-08-18T09:48:50Z:',
        'Room volume first, then floor heights, then the budget range.',
        '',
        'Comment 2 by unknown author at 2026-08-19T19:35:19Z:',
        '(empty)',
      ].join('\n'),
    );
  });

  it('prefers the display name and bounds an oversized comment', () => {
    // act
    // arrange
    const text = describeWorkItemDiscussion({
      comments: [
        {
          id: '1',
          author: { login: 'rekepb', displayName: 'Rene Kepb' },
          body: 'x'.repeat(9_000),
          createdAt: '2026-08-18T09:48:50Z',
        },
      ],
    });

    // assert
    expect(text).toContain('Comment 1 by Rene Kepb at');
    expect(text.length).toBeLessThan(8_200);
    expect(text).toMatch(/\[comment truncated\]$/u);
  });
});
