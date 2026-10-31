// #region Imports

import { describe, expect, it } from 'vitest';
import { TeamsFeedbackValidationIssuesLabelPipe } from './TeamsFeedbackValidationIssuesLabelPipe';

// #endregion

describe('TeamsFeedbackValidationIssuesLabelPipe', () => {
  it('names the missing fields with their labels in form order', () => {
    // arrange
    const pipe = new TeamsFeedbackValidationIssuesLabelPipe();

    // act
    const label = pipe.transform(['team-id', 'channel-id', 'target-repository']);

    // assert
    expect(label).toBe('Team ID · Channel ID · Target GitHub repository');
  });
});
