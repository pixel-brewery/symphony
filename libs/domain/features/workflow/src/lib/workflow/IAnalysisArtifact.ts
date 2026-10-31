// #region Imports

import type { IAcceptanceMappingEntry } from './IAcceptanceMappingEntry';
import type { IAnalysisDependency } from './IAnalysisDependency';
import type { RiskClass } from './RiskClass';

// #endregion

/** Definition of Ready. A stage guard rejects an analysis that does not fill it completely. */
export interface IAnalysisArtifact {
  readonly feasible: boolean;
  readonly issueRevision: string;
  readonly problemUnderstanding: string;
  readonly affectedComponents: readonly string[];
  readonly likelyChangeSurface: readonly string[];
  readonly dependencies: readonly IAnalysisDependency[];
  readonly implementationPlan: readonly { readonly step: number; readonly description: string }[];
  readonly databaseMigrationRequired: boolean;
  readonly risk: { readonly class: RiskClass; readonly reasons: readonly string[] };
  readonly testStrategy: readonly string[];
  readonly acceptanceMapping: readonly IAcceptanceMappingEntry[];
  readonly unresolvedQuestions: readonly string[];
  readonly collisionRisk: RiskClass;
  readonly readyForSolve: boolean;
}
