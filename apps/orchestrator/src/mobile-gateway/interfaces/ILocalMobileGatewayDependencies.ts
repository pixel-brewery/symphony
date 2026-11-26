// #region Imports
import type { RemoteAccessService } from '@pixel-brewery/remote-core';
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
import type { ISymphonyMobileApplicationDependencies } from './ISymphonyMobileApplicationDependencies';
// #endregion

/**
 * Composes one SDK host around Symphony's existing product graph.
 *
 * @public
 */
export interface ILocalMobileGatewayDependencies extends ISymphonyMobileApplicationDependencies {
  /**
   * Sole SDK authority owner, initialized after the app's legacy migration.
   *
   * @public
   */
  readonly access: RemoteAccessService;
  /**
   * Durably persisted Symphony installation identity.
   *
   * @public
   */
  readonly identity: IRemoteHostIdentity;
  /**
   * Immutable packaged mobile browser root.
   *
   * @public
   */
  readonly assetsPath: string;
  /**
   * Explicit selected private interface, otherwise selected by the SDK.
   *
   * @public
   */
  readonly host?: string;
  /**
   * Inclusive start of the private port range.
   *
   * @public
   */
  readonly portStart?: number;
  /**
   * Inclusive end of the private port range.
   *
   * @public
   */
  readonly portEnd?: number;
  /**
   * Explicit loopback exception available only to isolated tests.
   *
   * @public
   */
  readonly allowLoopbackForTests?: boolean;
  /**
   * Product observational timestamp read from the same serialized persistence owner.
   *
   * @param deviceId - SDK-authenticated device identifier shown by local administration.
   * @returns The last committed use timestamp, or undefined when none has been recorded.
   *
   * @public
   */
  readonly lastSeenAt?: (deviceId: string) => string | undefined;
  /**
   * Sanitized SDK operation/code diagnostics, separate from product HTTP validation failures.
   *
   * @param failure - SDK operation category and stable failure code without credentials or raw causes.
   * @returns Returns after the existing logger receives the diagnostic.
   *
   * @public
   */
  readonly reportRemoteFailure?: (failure: {
    /**
     * Sanitized SDK lifecycle operation category.
     *
     * @public
     */
    readonly operation: string;
    /**
     * Stable public SDK failure code without a raw cause.
     *
     * @public
     */
    readonly code: string;
  }) => void;
}
