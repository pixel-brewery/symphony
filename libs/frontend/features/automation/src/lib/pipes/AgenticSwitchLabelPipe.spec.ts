// #region Imports

import { describe, expect, it } from 'vitest';
import { agenticLadder } from '../state/agentic-ladder/AgenticLadder';
import { AgenticSwitchLabelPipe } from './AgenticSwitchLabelPipe';

// #endregion

describe('AgenticSwitchLabelPipe', () => {
  it('labels every switch of the rail', () => {
    // arrange
    const pipe = new AgenticSwitchLabelPipe();

    // act
    const actual = agenticLadder.map((rung) => pipe.transform(rung.key));

    // assert
    expect(new Set(actual).size).toBe(agenticLadder.length);
    expect(actual).toContain('Update managed pull-request branches');
  });
});
