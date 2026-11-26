// #region Imports
import type { MobileCompanionConnectionState } from '../MobileCompanionConnectionState';
import type { IMobileHttpResponse } from './IMobileHttpResponse';
import type { IMobileEventHandlers } from './IMobileEventHandlers';
// #endregion

/**
 * Browser product port backed by the SDK session and bounded event lifecycle.
 *
 * @remarks The Angular owner must await or schedule dispose at destruction. Event cleanup
 * cancels that owner's pending retries; explicit product recovery may create a new event owner.
 * @public
 */
export interface IMobileCompanionClient {
  /**
   * Restores a cookie session or consumes the current complete QR invitation.
   *
   * @returns True after verified pairing, false when a new invitation is required.
   * @throws An error for invalid pairing material, an unavailable host or disposed ownership.
   *
   * @public
   */
  initialize(): Promise<boolean>;
  /**
   * Sends one registered product request without replaying a mutation.
   *
   * @param route - Same-origin product route from mobileHttpRoutes.
   * @param method - Exact operation method, default GET.
   * @param body - Product-owned JSON payload when present.
   * @returns HTTP status and unvalidated product JSON for the owning feature schema.
   * @throws An error on transport failure, invalid JSON or an unknown mutation outcome; callers must not replay writes.
   *
   * @public
   */
  request(route: string, method?: 'GET' | 'POST', body?: unknown): Promise<IMobileHttpResponse>;
  /**
   * Observes connection transitions without exposing the session credential.
   *
   * @param listener - Receives current state and subsequent SDK transitions.
   * @returns Idempotent registration cleanup.
   *
   * @public
   */
  subscribeConnection(listener: (state: MobileCompanionConnectionState) => void): () => void;
  /**
   * Connects the bounded product invalidation stream and reconciles after reconnect.
   *
   * @param route - Registered same-origin event path.
   * @param handlers - Product open, validated-message and close observers.
   * @returns Idempotent cleanup closing its socket and retry timer.
   * @throws An error when the registered route or platform cannot create the event channel.
   *
   * @public
   */
  connectEvents(route: string, handlers: IMobileEventHandlers): () => void;
  /**
   * Creates an unpredictable command identifier in an HTTP LAN browser.
   *
   * @returns Random UUID-shaped operation identifier.
   *
   * @public
   */
  createOperationId(): string;
  /**
   * Closes the session, event connections and scheduled retries.
   *
   * @returns Resolves after owned cleanup completes.
   *
   * @public
   */
  dispose(): Promise<void>;
}
