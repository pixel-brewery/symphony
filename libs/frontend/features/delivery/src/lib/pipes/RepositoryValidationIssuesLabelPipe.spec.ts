// #region Imports

import { describe, expect, it } from 'vitest';
import { RepositoryValidationIssuesLabelPipe } from './RepositoryValidationIssuesLabelPipe';

// #endregion

describe('RepositoryValidationIssuesLabelPipe', () => {
  it('names the missing fields with their labels in form order', () => {
    // arrange
    const pipe = new RepositoryValidationIssuesLabelPipe();

    // act
    const label = pipe.transform(['owner', 'name']);

    // assert
    expect(label).toBe('Owner · Repository');
  });
});
