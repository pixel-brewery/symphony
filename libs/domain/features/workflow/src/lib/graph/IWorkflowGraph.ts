// #region Imports

import type { WorkflowRuntimeState, WorkflowStageId } from '../workflow';
import type { IWorkflowGraphDefect } from './IWorkflowGraphDefect';
import type { IWorkflowGraphEdge } from './IWorkflowGraphEdge';
import type { IWorkflowGraphNode } from './IWorkflowGraphNode';

// #endregion

export interface IWorkflowGraph {
  readonly workflowId: string;
  readonly workflowVersion: number;
  readonly nodes: readonly IWorkflowGraphNode[];
  readonly edges: readonly IWorkflowGraphEdge[];
  readonly currentStageId?: WorkflowStageId;
  readonly runtimeState?: WorkflowRuntimeState;
  readonly defects: readonly IWorkflowGraphDefect[];
}
