// #region Imports

import { describe, expect, it } from 'vitest';
import { AzureDevOpsValidationIssuesLabelPipe } from './AzureDevOpsValidationIssuesLabelPipe';

// #endregion

describe('AzureDevOpsValidationIssuesLabelPipe', () => {
  it('names the missing fields with their labels in form order', () => {
    // arrange
    const pipe = new AzureDevOpsValidationIssuesLabelPipe();

    // act
    const label = pipe.transform(['organization', 'query']);

    // assert
    expect(label).toBe('Organization · Saved query ID or WIQL');
  });
});
