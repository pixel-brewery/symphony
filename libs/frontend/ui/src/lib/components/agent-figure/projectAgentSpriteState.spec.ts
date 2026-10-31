// #region Imports

import { describe, expect, it } from 'vitest';
import { projectAgentSpriteState } from './projectAgentSpriteState';

// #endregion

describe('projectAgentSpriteState', () => {
  it('uses the running assignment rather than a queued or historical specialist role', () => {
    // arrange
    const work = [
      { workItemId: 'later', state: 'queued', role: 'analysis' },
      { workItemId: 'now', state: 'working', role: 'solution' },
    ] as const;
    // act
    const pose = projectAgentSpriteState('working', work);
    // assert
    expect(pose).toBe('running');
    expect(projectAgentSpriteState('working', [{ ...work[1], role: 'pull-request-review' }])).toBe(
      'review',
    );
    expect(projectAgentSpriteState('working', work, 'ci-diagnosis')).toBe('review');
  });

  it('keeps unavailable and decision states independent from the previous work role', () => {
    // arrange
    const work = [{ workItemId: 'now', state: 'working', role: 'solution' }] as const;
    // act
    // assert
    expect(projectAgentSpriteState('stale', work)).toBe('idle');
    expect(projectAgentSpriteState('paused', work)).toBe('idle');
    expect(projectAgentSpriteState('needs-input', work)).toBe('waiting');
    expect(projectAgentSpriteState('blocked', work)).toBe('failed');
    expect(projectAgentSpriteState('completed', work)).toBe('jumping');
  });
});
