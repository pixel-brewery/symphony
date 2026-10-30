// #region Imports

import type { ExecutionState } from '@symphony/domain-execution';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by DeliveryGroupService. @public */
export interface IDeliveryGroupsDependencies {
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'loadWorkItemDetails'
  >;
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    | 'saveDeliveryGroupProposal'
    | 'listDeliveryGroups'
    | 'saveDeliveryGroup'
    | 'listDeliveryGroupProposals'
    | 'listExecutions'
  >;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly ids: Pick<NonNullable<IAnalyzerDependencies['ids']>, 'next'>;
  readonly tracker: Pick<
    NonNullable<IAnalyzerDependencies['tracker']>,
    'moveToColumn' | 'synchronizeWorkItemRelation' | 'synchronizeDeliveryGroup'
  >;
  readonly assessWorkItemRelation?: IAnalyzerDependencies['assessWorkItemRelation'];
  readonly bindingSnapshotFor?: IAnalyzerDependencies['bindingSnapshotFor'];
  readonly automaticDeliveryGroupingEnabledFor?: IAnalyzerDependencies['automaticDeliveryGroupingEnabledFor'];
  workflow(): IWorkflowDefinition;
  isActive(state: ExecutionState): boolean;
}
