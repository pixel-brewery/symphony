// #region Imports

import { AiError } from '@pixel-brewery/synapse-core';
import { RouteGovernor } from '@pixel-brewery/synapse-routing';
import type { IRoute, IRouteCandidate } from '@pixel-brewery/synapse-routing';
import type { IAgentRouteTelemetryRepository } from '@symphony/application-ai';
import { SynapseRoutingStore } from '../synapse-routing-store/SynapseRoutingStore';
import { AgentRoutesCoolingDownError } from './AgentRoutesCoolingDownError';
import type { IAgentRouteDescriptor } from './IAgentRouteDescriptor';
import type { IAgentRouteGovernorOptions } from './IAgentRouteGovernorOptions';

// #endregion

/** Keeps Symphony's business-agent grouping while Synapse owns strategy ordering, telemetry and circuits.
 * @public
 */
export class AgentRouteGovernor {
  // #region Fields

  private readonly _governor: RouteGovernor;

  // #endregion

  // #region Ctor

  /** Composes the existing SQLite owner through an explicit best-effort operational state bridge.
   * @public
   * @param repository - Existing workspace/candidate telemetry repository.
   * @param options - Existing clock, circuit and diagnostic settings.
   */
  public constructor(
    repository?: IAgentRouteTelemetryRepository,
    options: IAgentRouteGovernorOptions = {},
  ) {
    const now = options.now;
    this._governor = new RouteGovernor(
      new SynapseRoutingStore({
        telemetry: repository,
        onPersistenceError: options.onPersistenceError,
      }),
      {
        now: now ? () => now().getTime() : undefined,
        failureThreshold: Math.max(1, options.failureThreshold ?? 2),
        circuitCooldownMilliseconds: Math.max(1, options.cooldownMilliseconds ?? 300000),
      },
    );
  }

  // #endregion

  // #region Properties
  // #endregion

  // #region Methods

  /** Preserves business-agent fallback order and delegates each agent's strategy to Synapse.
   * @public
   * @typeParam T - Existing host target carrying its runtime and execution binding.
   * @param targets - Eligible targets already selected by Symphony application policy.
   * @param affinityCandidateId - Existing native session's candidate identity.
   * @returns The same target objects in deterministic, eligible attempt order.
   * @throws AgentRoutesCoolingDownError when every eligible circuit is open.
   */
  public order<T extends IAgentRouteDescriptor>(
    targets: readonly T[],
    affinityCandidateId?: string,
  ): readonly T[] {
    if (!targets.length) return [];
    const available = targets.filter((target) => this.isAvailable(target));
    if (!available.length) {
      const first = targets[0];
      if (!first) return [];
      try {
        this._governor.order(
          this.route(
            first,
            targets.map((target) => this.candidate(target)),
          ),
        );
      } catch (cause) {
        if (cause instanceof AiError && cause.code === 'provider' && cause.retryAt !== undefined)
          throw new AgentRoutesCoolingDownError(
            'All eligible AI routes are cooling down after repeated failures.',
            new Date(cause.retryAt).toISOString(),
          );
        throw cause;
      }
    }
    const agentIds = [...new Set(available.map((target) => target.routing.agentProfileId))];
    const ordered = agentIds.flatMap((agentId) => {
      const group = available.filter((target) => target.routing.agentProfileId === agentId);
      const first = group[0];
      if (!first) return [];
      const projections = new Map<IRouteCandidate, T>();
      for (const target of group) projections.set(this.candidate(target), target);
      return this._governor.order(this.route(first, [...projections.keys()])).map((candidate) => {
        const target = projections.get(candidate);
        if (!target) throw new Error('Synapse returned an unknown Symphony route projection.');
        return target;
      });
    });
    const affinityIndex = ordered.findIndex(
      (target) =>
        target.routing.sessionAffinity && target.routing.routeCandidateId === affinityCandidateId,
    );
    const affinity = ordered[affinityIndex];
    return affinityIndex > 0 && affinity
      ? [affinity, ...ordered.slice(0, affinityIndex), ...ordered.slice(affinityIndex + 1)]
      : ordered;
  }

  /** Records an admitted target using its unchanged persisted candidate identity.
   * @public
   * @param target - Existing host route descriptor.
   */
  public recordAttempt(target: IAgentRouteDescriptor): void {
    const candidate = this.candidate(target);
    this._governor.recordAttempt(this.route(target, [candidate]), candidate);
  }

  /** Checks native attempt eligibility through the shared candidate and provider circuit owner.
   * @public
   * @param target - Existing host descriptor.
   * @returns Whether both circuit windows have expired.
   */
  public isAvailable(target: IAgentRouteDescriptor): boolean {
    const candidate = this.candidate(target);
    return this._governor.isAvailable(this.route(target, [candidate]), candidate);
  }

  /** Removes optional operational state only for a workspace being removed.
   * @public
   * @param workspaceId - Existing workspace identity.
   */
  public removeWorkspace(workspaceId: string): void {
    this._governor.clearScope(workspaceId);
  }

  /** Records native success without re-executing provider work.
   * @public
   * @param target - Existing selected target.
   * @param latencyMilliseconds - Elapsed native execution duration.
   */
  public recordSuccess(target: IAgentRouteDescriptor, latencyMilliseconds: number): void {
    const candidate = this.candidate(target);
    this._governor.recordSuccess(this.route(target, [candidate]), candidate, latencyMilliseconds);
  }

  /** Records actual provider failure using existing candidate/provider circuit identities.
   * @public
   * @param target - Existing selected target.
   * @param latencyMilliseconds - Elapsed native execution duration.
   * @param affectsProvider - Whether this failure affects the shared provider circuit; false for account capacity or authentication failures.
   */
  public recordFailure(
    target: IAgentRouteDescriptor,
    latencyMilliseconds: number,
    affectsProvider = true,
  ): void {
    const candidate = this.candidate(target);
    this._governor.recordFailure(
      this.route(target, [candidate]),
      candidate,
      latencyMilliseconds,
      affectsProvider,
    );
  }

  /** Keeps Symphony's existing user-facing strategy/history description at the host presentation boundary.
   * @public
   * @param target - Existing route descriptor.
   * @returns Existing descriptive copy composed from shared operational history.
   */
  public describe(target: IAgentRouteDescriptor): string {
    const candidate = this.candidate(target);
    const telemetry = this._governor.history(this.route(target, [candidate]), candidate);
    const completed = telemetry.successCount + telemetry.failureCount;
    const success = completed ? Math.round((telemetry.successCount / completed) * 100) : 100;
    const latencyDescription = telemetry.averageLatencyMilliseconds
      ? `${Math.round(telemetry.averageLatencyMilliseconds)} ms average latency`
      : 'no latency history';
    return `${target.routing.strategy.replaceAll('-', ' ')} · ${target.routing.costClass} · quality ${target.routing.qualityScore ?? 50}/100 · ${success}% success · ${latencyDescription}`;
  }

  private candidate(target: IAgentRouteDescriptor): IRouteCandidate {
    // Ranking projections are never registered or passed to native execution.
    return {
      id: target.routing.routeCandidateId,
      instanceId: target.routing.routeCandidateId,
      accountId: target.routing.routeCandidateId,
      providerId: target.routing.providerId,
      priority: target.routing.priority,
      costClass: target.routing.costClass,
      qualityScore: target.routing.qualityScore,
      sessionAffinity: target.routing.sessionAffinity,
    };
  }
  private route(target: IAgentRouteDescriptor, candidates: readonly IRouteCandidate[]): IRoute {
    return {
      id: target.routing.routePolicyId,
      scopeId: target.routing.workspaceId,
      strategy: target.routing.strategy,
      maxParallelExecutions: target.routing.maxParallelExecutions,
      candidates,
    };
  }

  // #endregion
}
