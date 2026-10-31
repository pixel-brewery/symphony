// #region Imports

import { describe, expect, it } from 'vitest';
import { AgentModelLabelPipe } from './AgentModelLabelPipe';

// #endregion

describe('AgentModelLabelPipe', () => {
  it('names Claude Code aliases and keeps other model identifiers', () => {
    // arrange
    const pipe = new AgentModelLabelPipe();

    // act
    const actual = ['opus', 'gpt-5-codex'].map((model) => pipe.transform(model));

    // assert
    expect(actual).toEqual(['Opus', 'gpt-5-codex']);
  });
});
