// #region Imports

import { describe, expect, it } from 'vitest';
import { AgentFinishedWorkLabelPipe } from './AgentFinishedWorkLabelPipe';

// #endregion

describe('AgentFinishedWorkLabelPipe', () => {
  it('names finished work by its delivery-flow role in the past tense', () => {
    // arrange
    const pipe = new AgentFinishedWorkLabelPipe();
    // act
    const labels = ['analysis', 'solution', 'ci-repair', 'unknown', undefined].map((role) =>
      pipe.transform(role),
    );
    // assert
    expect(labels).toEqual(['planned', 'implemented', 'repaired', 'worked on', 'worked on']);
  });
});
