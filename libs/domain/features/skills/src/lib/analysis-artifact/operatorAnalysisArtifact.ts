// #region Imports

import { type IAnalysisArtifact } from '@symphony/domain-workflow';

// #endregion

/**
 * The artifact recorded when a person completes an analysis manually.
 *
 * A manual completion is a human statement that the work item is ready: the operator holds the
 * authority both human gates already trust, so the artifact records that vouching explicitly
 * instead of rejecting every manual analysis for lacking a machine-readable block.
 */
export function operatorAnalysisArtifact(
  issueRevision: string,
  acceptanceCriteria: readonly string[],
): IAnalysisArtifact {
  return {
    feasible: true,
    issueRevision,
    problemUnderstanding: 'Recorded manually by the operator.',
    affectedComponents: [],
    likelyChangeSurface: [],
    dependencies: [],
    implementationPlan: [{ step: 1, description: 'Implement the manually recorded analysis.' }],
    databaseMigrationRequired: false,
    risk: { class: 'medium', reasons: ['Manually recorded analysis without automated review.'] },
    testStrategy: ['Confirmed manually by the operator.'],
    acceptanceMapping: (acceptanceCriteria.length
      ? acceptanceCriteria
      : ['Implement the manually recorded analysis without scope drift.']
    ).map((criterion) => ({
      acceptanceCriterion: criterion,
      implementationStep: 1,
      verification: 'Confirmed manually by the operator.',
    })),
    unresolvedQuestions: [],
    collisionRisk: 'medium',
    readyForSolve: true,
  };
}
