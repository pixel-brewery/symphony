// #region Imports

import { AiError } from '@pixel-brewery/synapse-core';
import { SynapseHostProgressError } from '@symphony/providers-synapse';
import { AgentRouteProgressError } from './AgentRouteProgressError';
import type { IAgentProgress, IAgentRuntimePort } from '@symphony/application-execution';
import type { IIssueDraftingPort } from '@symphony/application-work';
import { AgentRouteGovernor } from '@symphony/providers-synapse';
import { AgentRouteAdmission } from '@symphony/providers-synapse';
import { AgentModelLockout, AgentModelUnavailableError } from '@symphony/providers-synapse';
import {
  AgentAccountCapacityError,
  AgentAccountCooldowns,
  AgentAccountCoolingDownError,
  type IAgentAccountCooldownTarget,
} from '@symphony/providers-synapse';
import type { IExecutionContext } from '@symphony/application-execution';
import type {
  IIssueDraft,
  IIssueDraftRequest,
  IWorkItemEditorMetadata,
} from '@symphony/domain-work';
import type { ISkillPackageDocument, SkillFlowRole } from '@symphony/domain-skills';
import { skillFlowRoles } from '@symphony/domain-skills';
import type { IWorkspaceAgentRuntimeOptions } from './IWorkspaceAgentRuntimeOptions';
import type { IWorkspaceAgentRuntimeTarget } from './IWorkspaceAgentRuntimeTarget';

// #endregion

const routeUnavailable = Symbol('route-unavailable');

/**
 * Keeps business-agent eligibility and progress persistence in Symphony while shared routing owns technical strategy.
 *
 * @public
 */
export class WorkspaceAgentRuntime implements IAgentRuntimePort, IIssueDraftingPort {
  // #region Fields

  private readonly _governor: AgentRouteGovernor;
  private readonly _admission: AgentRouteAdmission;
  private readonly _modelLockout: AgentModelLockout;
  private readonly _accountCooldowns: AgentAccountCooldowns;

  // #endregion

  // #region Ctor

  /**
   * Composes host-selected targets and shared route state owners.
   *
   * @param _options - Business eligibility, optional telemetry and routing lifecycle services.
   *
   * @public
   */
  public constructor(private readonly _options: IWorkspaceAgentRuntimeOptions) {
    this._governor = _options.governor ?? new AgentRouteGovernor();
    this._admission = _options.admission ?? new AgentRouteAdmission();
    this._modelLockout = _options.modelLockout ?? new AgentModelLockout();
    this._accountCooldowns = _options.accountCooldowns ?? new AgentAccountCooldowns();
  }

  // #endregion

  // #region Methods

  /**
   * Returns the analyze.
   *
   * @param context - Context.
   * @param skill - Skill.
   * @param request - Request.
   * @param onProgress - On progress.
   * @param simulateFailure - Simulate failure.
   * @param signal - Signal.
   *
   * @public
   */
  public analyze(
    context: IExecutionContext,
    skill: ISkillPackageDocument,
    request: string | undefined,
    onProgress: (progress: IAgentProgress) => Promise<void>,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<string> {
    const role = this.executionRole(context, 'analysis');

    return this.runWithFailover(
      role,
      context.workItem.workspaceId,
      context,
      onProgress,
      simulateFailure,
      signal,
      (target, attempt, report) =>
        target.runtime.analyze(
          this.contextForAttempt(context, attempt),
          skill,
          request,
          report,
          simulateFailure,
          signal,
        ),
    );
  }

  /**
   * Returns the solve.
   *
   * @param context - Context.
   * @param skill - Skill.
   * @param analysis - Analysis.
   * @param feedback - Feedback.
   * @param onProgress - On progress.
   * @param simulateFailure - Simulate failure.
   * @param signal - Signal.
   *
   * @public
   */
  public solve(
    context: IExecutionContext,
    skill: ISkillPackageDocument,
    analysis: string,
    feedback: string | undefined,
    onProgress: (progress: IAgentProgress) => Promise<void>,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<string> {
    const role = this.executionRole(context, 'solution');

    return this.runWithFailover(
      role,
      context.workItem.workspaceId,
      context,
      onProgress,
      simulateFailure,
      signal,
      (target, attempt, report) =>
        target.runtime.solve(
          this.contextForAttempt(context, attempt),
          skill,
          analysis,
          feedback,
          report,
          simulateFailure,
          signal,
        ),
      false,
    );
  }

  /**
   * Drafts the issue.
   *
   * @param request - Request.
   * @param metadata - Metadata.
   * @param skill - Skill.
   * @param workingDirectory - Working directory.
   * @param signal - Signal.
   *
   * @public
   */
  public async draftIssue(
    request: IIssueDraftRequest,
    metadata: IWorkItemEditorMetadata,
    skill: ISkillPackageDocument,
    workingDirectory: string,
    signal: AbortSignal,
  ): Promise<IIssueDraft> {
    const targets = this._governor.order(
      this.requireTargets(
        'work-item-creation',
        request.workspaceId,
        undefined,
        request.agentProfileId,
      ),
    );
    let lastFailure: unknown;
    let providerAttempted = false;
    const cooldownFailures: AgentAccountCoolingDownError[] = [];

    for (const target of targets) {
      try {
        const cooldown = this._accountCooldowns.active(this.accountCooldownTarget(target));

        if (cooldown) {
          const coolingDown = this._accountCooldowns.coolingDownError(
            this.accountCooldownTarget(target),
            cooldown,
          );

          cooldownFailures.push(coolingDown);
          lastFailure = coolingDown;

          continue;
        }

        const modelAvailability = await this.inspectModel(target, signal);

        if (modelAvailability.state === 'unavailable') {
          lastFailure = new AgentModelUnavailableError(
            target.label,
            target.executionBinding.model ?? 'default',
            modelAvailability.reason,
          );

          continue;
        }

        const draft = await this._admission.run(target, signal, async () => {
          if (!this._governor.isAvailable(target)) return routeUnavailable;

          providerAttempted = true;
          this._governor.recordAttempt(target);

          const startedAt = Date.now();

          try {
            const result = await target.runtime.draftIssue(
              request,
              metadata,
              skill,
              workingDirectory,
              signal,
            );

            this._governor.recordSuccess(target, Date.now() - startedAt);

            return result;
          } catch (cause) {
            if (this.isHostFailure(cause)) throw cause;

            if (!signal.aborted) {
              if (cause instanceof AgentAccountCapacityError) {
                const cooldown = this._accountCooldowns.recordFailure(
                  this.accountCooldownTarget(target),
                  cause,
                );

                cooldownFailures.push(
                  this._accountCooldowns.coolingDownError(
                    this.accountCooldownTarget(target),
                    cooldown,
                  ),
                );
              }

              this._governor.recordFailure(
                target,
                Date.now() - startedAt,
                !(cause instanceof AgentAccountCapacityError) &&
                  !(cause instanceof AiError && cause.code === 'auth-required'),
              );
            }

            throw cause;
          }
        });

        if (draft === routeUnavailable) continue;

        return draft;
      } catch (cause) {
        if (this.stopsFailover(cause) || signal.aborted) throw cause;

        lastFailure = cause;
      }
    }

    if (!providerAttempted) this._governor.order(targets);

    const earliestCooldown = this.earliestCooldown(cooldownFailures);

    if (earliestCooldown) throw earliestCooldown;

    throw this.exhaustedError(lastFailure);
  }

  private async runWithFailover<T>(
    role: SkillFlowRole,
    workspaceId: string | undefined,
    context: IExecutionContext,
    onProgress: (progress: IAgentProgress) => Promise<void>,
    simulateFailure: boolean,
    signal: AbortSignal,
    execute: (
      target: IWorkspaceAgentRuntimeTarget,
      attempt: number,
      report: (progress: IAgentProgress) => Promise<void>,
    ) => Promise<T>,
    allowReplay = true,
  ): Promise<T> {
    const affinityCandidateId = context.continuationReference
      ? context.executionBinding?.agentRouteCandidateId
      : undefined;
    const targets = this._governor.order(
      this.requireTargets(role, workspaceId, context.executionBinding),
      affinityCandidateId,
    );
    let lastFailure: unknown;
    let providerAttempts = 0;
    const cooldownFailures: AgentAccountCoolingDownError[] = [];

    for (const target of targets) {
      const preservesContinuation = this.preservesContinuation(context, target);
      const report = this.attributedProgress(onProgress, target);

      try {
        const cooldown = this._accountCooldowns.active(this.accountCooldownTarget(target));

        if (cooldown) {
          const coolingDown = this._accountCooldowns.coolingDownError(
            this.accountCooldownTarget(target),
            cooldown,
          );

          cooldownFailures.push(coolingDown);
          lastFailure = coolingDown;

          try {
            await report({ category: 'status', message: coolingDown.message });
          } catch (cause) {
            throw new AgentRouteProgressError(cause);
          }

          continue;
        }

        const modelAvailability = await this.inspectModel(target, signal);

        if (modelAvailability.state === 'unavailable') {
          const unavailable = new AgentModelUnavailableError(
            target.label,
            target.executionBinding.model ?? 'default',
            modelAvailability.reason,
          );

          lastFailure = unavailable;

          try {
            await report({ category: 'status', message: unavailable.message });
          } catch (cause) {
            throw new AgentRouteProgressError(cause);
          }

          continue;
        }

        if (this._admission.snapshot(target).active >= target.routing.maxParallelExecutions) {
          try {
            await report({
              category: 'status',
              message: `Waiting for capacity on ${target.label}.`,
            });
          } catch (cause) {
            throw new AgentRouteProgressError(cause);
          }
        }

        const result = await this._admission.run(target, signal, async () => {
          if (!this._governor.isAvailable(target)) return routeUnavailable;

          try {
            await report({
              category: 'status',
              message:
                providerAttempts === 0
                  ? `Assigned to ${target.label}. ${this._governor.describe(target)}.`
                  : `The previous route failed. Continuing with ${target.label}. ${this._governor.describe(target)}.`,
              executionBinding: target.executionBinding,
              resetContinuationReference:
                context.continuationReference !== undefined && !preservesContinuation,
            });
          } catch (cause) {
            throw new AgentRouteProgressError(cause);
          }

          providerAttempts += 1;
          this._governor.recordAttempt(target);

          const startedAt = Date.now();

          try {
            const output = await execute(target, preservesContinuation ? 0 : 1, report);

            this._governor.recordSuccess(target, Date.now() - startedAt);

            return output;
          } catch (cause) {
            if (this.isHostFailure(cause)) throw cause;

            if (!signal.aborted && !simulateFailure) {
              if (cause instanceof AgentAccountCapacityError) {
                const cooldown = this._accountCooldowns.recordFailure(
                  this.accountCooldownTarget(target),
                  cause,
                );

                cooldownFailures.push(
                  this._accountCooldowns.coolingDownError(
                    this.accountCooldownTarget(target),
                    cooldown,
                  ),
                );
              }

              this._governor.recordFailure(
                target,
                Date.now() - startedAt,
                !(cause instanceof AgentAccountCapacityError) &&
                  !(cause instanceof AiError && cause.code === 'auth-required'),
              );
            }

            throw cause;
          }
        });

        if (result === routeUnavailable) continue;

        return result;
      } catch (cause) {
        if (this.stopsFailover(cause)) throw cause;

        if (signal.aborted || simulateFailure || (!allowReplay && providerAttempts > 0))
          throw cause;

        lastFailure = cause;
      }
    }

    if (providerAttempts === 0) this._governor.order(targets, affinityCandidateId);

    const earliestCooldown = this.earliestCooldown(cooldownFailures);

    if (earliestCooldown) throw earliestCooldown;

    throw this.exhaustedError(lastFailure);
  }

  /**
   * Every event of a route carries that route's runtime, so a failover keeps history truthful.
   */
  private attributedProgress(
    onProgress: (progress: IAgentProgress) => Promise<void>,
    target: IWorkspaceAgentRuntimeTarget,
  ): (progress: IAgentProgress) => Promise<void> {
    return async (progress) => {
      try {
        await onProgress({ ...progress, actor: progress.actor ?? target.actor });
      } catch (cause) {
        throw cause instanceof AgentRouteProgressError ? cause : new AgentRouteProgressError(cause);
      }
    };
  }

  private isHostFailure(cause: unknown): boolean {
    return (
      cause instanceof AgentRouteProgressError ||
      cause instanceof SynapseHostProgressError ||
      (cause instanceof AiError &&
        [
          'host',
          'persistence',
          'cancelled',
          'timeout',
          'disposed',
          'configuration',
          'unsupported',
        ].includes(cause.code))
    );
  }

  private stopsFailover(cause: unknown): boolean {
    return this.isHostFailure(cause) || (cause instanceof AiError && !cause.retryable);
  }

  private requireTargets(
    role: SkillFlowRole,
    workspaceId?: string,
    executionBinding?: IAgentProgress['executionBinding'],
    agentProfileId?: string,
  ): readonly IWorkspaceAgentRuntimeTarget[] {
    const eligible = this._options.targets(role, workspaceId, executionBinding);

    // An explicitly requested agent narrows the routes; its own backups stay available, so a
    // chosen agent still fails over instead of failing outright.
    const targets = agentProfileId
      ? eligible.filter((target) => target.executionBinding?.agentProfileId === agentProfileId)
      : eligible;

    if (!targets.length) {
      throw new Error(
        agentProfileId
          ? `The selected agent has no eligible ${role} route in workspace ${workspaceId ?? 'unknown'}.`
          : `No eligible ${role} agent route is configured for workspace ${workspaceId ?? 'unknown'}.`,
      );
    }

    return targets;
  }

  private contextForAttempt(context: IExecutionContext, attempt: number): IExecutionContext {
    return attempt === 0 ? context : { ...context, continuationReference: undefined };
  }

  private preservesContinuation(
    context: IExecutionContext,
    target: IWorkspaceAgentRuntimeTarget,
  ): boolean {
    return Boolean(
      context.continuationReference &&
      target.routing.sessionAffinity &&
      context.executionBinding?.agentRouteCandidateId === target.routing.routeCandidateId,
    );
  }

  private inspectModel(target: IWorkspaceAgentRuntimeTarget, signal: AbortSignal) {
    return this._modelLockout.inspect(
      {
        workspaceId: target.routing.workspaceId,
        aiConnectionId: target.executionBinding.aiConnectionId,
        model: target.executionBinding.model,
        ...(target.inspectModelAvailability
          ? { inspectModelAvailability: target.inspectModelAvailability }
          : {}),
      },
      signal,
    );
  }

  private accountCooldownTarget(target: IWorkspaceAgentRuntimeTarget): IAgentAccountCooldownTarget {
    return {
      workspaceId: target.routing.workspaceId,
      aiConnectionId: target.executionBinding.aiConnectionId,
      label: target.label,
    };
  }

  private exhaustedError(lastFailure: unknown): Error {
    if (lastFailure instanceof Error) return lastFailure;

    return new Error('All eligible AI routes failed.', { cause: lastFailure });
  }

  private earliestCooldown(
    failures: readonly AgentAccountCoolingDownError[],
  ): AgentAccountCoolingDownError | undefined {
    return [...failures].sort(
      (left, right) => Date.parse(left.retryAt) - Date.parse(right.retryAt),
    )[0];
  }

  private executionRole(context: IExecutionContext, fallback: SkillFlowRole): SkillFlowRole {
    return (
      context.skill.capabilities.find((capability): capability is SkillFlowRole =>
        skillFlowRoles.includes(capability as SkillFlowRole),
      ) ?? fallback
    );
  }

  // #endregion
}
