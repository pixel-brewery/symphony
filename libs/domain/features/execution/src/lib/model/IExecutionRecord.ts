// #region Imports

import type { ExecutionKind } from './ExecutionKind';
import type { ExecutionMode } from './ExecutionMode';
import type { ExecutionState } from './ExecutionState';
import type { IAgentTokenUsage } from '@symphony/domain-ai';
import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';
import type { IExecutionBindingSnapshot } from './IExecutionBindingSnapshot';
import type { IExecutionSkillSnapshot } from './IExecutionSkillSnapshot';
import type { IPullRequestReference } from '@symphony/domain-delivery';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkItemClaim } from '@symphony/domain-work';
import type { SkillFlowRole } from '@symphony/domain-skills';

// #endregion

export interface IExecutionRecord {
  id: string;
  /** Security and ownership boundary selected when the execution starts. */
  workspaceId?: string;
  /** Immutable provider and repository bindings used by this execution. */
  bindingSnapshot?: IExecutionBindingSnapshot;
  workItemId: string;
  /** Joint-delivery group, when the root execution represents several independent work items. */
  deliveryGroupId?: string;
  /** Root first. Missing on legacy single-item executions. */
  workItemIds?: readonly string[];
  /** Work-item revisions captured when the grouped execution starts. */
  workItemRevisions?: Readonly<Record<string, number>>;
  workflowId: string;
  /** Missing on legacy records, which were always AI executions. */
  mode?: ExecutionMode;
  skillId?: string;
  /** Exact agentic flow that selected the skill; legacy records infer it from kind. */
  skillFlowRole?: SkillFlowRole;
  /** Minimal immutable skill content required to recover without the mutable catalog. */
  skillSnapshot?: IExecutionSkillSnapshot;
  /** Missing on legacy records, which are analysis executions. */
  kind?: ExecutionKind;
  parentExecutionId?: string;
  request?: string;
  state: ExecutionState;
  startedAt: string;
  finishedAt?: string;
  workspacePath?: string;
  /** Provider-neutral source-control reference used by an implementation workspace. */
  workspaceReference?: string;
  /** Durable provider-neutral result of an explicit pull-request handoff. */
  pullRequest?: IPullRequestReference;
  /** Opaque provider continuation used to resume an interrupted agent session. */
  continuationReference?: string;
  /** Durable execution attempt counter; legacy records implicitly start at one. */
  attempt?: number;
  /**
   * Durable count of deterministic verification rounds this execution already ran. A repair
   * round is only granted while this stays under the configured budget, so a reactivated
   * execution cannot silently restart the budget it already spent.
   */
  verificationAttempt?: number;
  /** Durable reason why a resumable execution is waiting without a live agent process. */
  pause?: {
    reason: 'lifecycle' | 'operator';
    pausedAt: string;
    /** Set when the operator requested reactivation while execution capacity was full. */
    resumeRequestedAt?: string;
  };
  /** Persisted task input required to recover without immediate tracker connectivity. */
  workItemSnapshot?: IWorkItem;
  /** Complete grouped inputs retained for deterministic recovery. */
  workItemSnapshots?: readonly IWorkItem[];
  /** Durable remote signal that caused this execution, used for idempotent recovery. */
  automationSignalId?: string;
  /** Durable origin for executions started without an interactive operator action. */
  automationOrigin?: 'remote' | 'autonomy' | 'agentic-delivery' | 'workflow';
  /** Durable CI or pull-request recovery operation that caused this execution. */
  agenticDeliveryId?: string;
  /** Effective disabled-by-default policy captured when an agentic delivery run starts. */
  agenticDeliveryPolicy?: IAgenticDeliveryPolicy;
  /** Keeps a shared implementation worktree available across diagnosis and repair recovery. */
  preserveWorkspace?: boolean;
  /** Provider-neutral actor handle retained as audit evidence for remote execution. */
  triggeredBy?: string;
  /** Provider-neutral distributed ownership proof for multi-machine execution. */
  workItemClaim?: IWorkItemClaim;
  /** Every claim this execution holds: one for a single work item, one per grouped member. */
  workItemClaims?: readonly IWorkItemClaim[];
  lastHeartbeatAt?: string;
  summary?: string;
  error?: string;
  tokenUsage?: IAgentTokenUsage;
}
