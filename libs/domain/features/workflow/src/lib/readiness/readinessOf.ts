// #region Imports

import type { IWorkflowRecord } from '../workflow';
import type { IWorkItemReadiness } from './IWorkItemReadiness';

// #endregion

/** Projects the supervisor record onto the readiness facts a surface is allowed to see. */
export function readinessOf(record: IWorkflowRecord): IWorkItemReadiness {
  const analysis = record.analysis;
  return {
    workItemId: record.workItemId,
    analysisStored: analysis !== undefined,
    readyForSolve: analysis?.readyForSolve === true,
    ...(analysis ? { riskClass: analysis.risk.class } : {}),
    openDecisions: analysis?.unresolvedQuestions ?? [],
    hardDependencyIds: (analysis?.dependencies ?? [])
      .filter((dependency) => dependency.type === 'hard')
      .map((dependency) => dependency.workItemId),
    running: record.activeRun !== undefined,
  };
}
