// #region Imports

import { describe, expect, it } from 'vitest';
import { operatorAnalysisArtifact } from './operatorAnalysisArtifact';

// #endregion

describe('operatorAnalysisArtifact', () => {
  it('records a manual completion as the operator vouching for readiness', () => {
    // arrange
    // act
    const artifact = operatorAnalysisArtifact('7', ['Drafts survive a restart']);

    // assert
    expect(artifact.readyForSolve).toBe(true);
    expect(artifact.testStrategy.length).toBeGreaterThan(0);
    expect(artifact.acceptanceMapping[0]?.acceptanceCriterion).toBe('Drafts survive a restart');
    expect(artifact.risk.reasons[0]).toContain('Manually recorded');
  });
});
