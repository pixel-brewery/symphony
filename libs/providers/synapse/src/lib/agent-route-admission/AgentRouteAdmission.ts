// #region Imports

import { RouteAdmission } from '@pixel-brewery/synapse-routing';
import type { IRoute } from '@pixel-brewery/synapse-routing';
import type { IAgentRouteDescriptor } from '../agent-route-governor';
import type { IAgentRouteAdmissionSnapshot } from './IAgentRouteAdmissionSnapshot';

// #endregion

/** Projects Symphony route identities into the shared Synapse admission owner.
 * @public
 */
export class AgentRouteAdmission {
  // #region Fields

  private readonly _admission = new RouteAdmission();

  // #endregion

  // #region Ctor
  // #endregion

  // #region Properties
  // #endregion

  // #region Methods

  /** Waits for the existing workspace/route-policy slot and releases it before completion observers run.
   * @public
   * @typeParam T - The host operation result.
   * @param target - Existing workspace-owned route descriptor.
   * @param signal - Caller cancellation.
   * @param execute - Host work that observes cancellation and awaits its own cleanup.
   * @returns The single host operation result.
   */
  public run<T>(
    target: IAgentRouteDescriptor,
    signal: AbortSignal,
    execute: () => Promise<T>,
  ): Promise<T> {
    return this._admission.run(this.route(target), signal, execute).catch((cause: unknown) => {
      if (signal.aborted && signal.reason !== undefined) throw signal.reason;
      throw cause;
    });
  }

  /** Reads the existing admission projection without executing work.
   * @public
   * @param target - Existing workspace/route-policy descriptor.
   * @returns Active, queued and configured maximum counts.
   */
  public snapshot(target: IAgentRouteDescriptor): IAgentRouteAdmissionSnapshot {
    return this._admission.snapshot(this.route(target));
  }

  private route(target: IAgentRouteDescriptor): IRoute {
    return {
      id: target.routing.routePolicyId,
      scopeId: target.routing.workspaceId,
      candidates: [],
      maxParallelExecutions: target.routing.maxParallelExecutions,
    };
  }

  // #endregion
}
