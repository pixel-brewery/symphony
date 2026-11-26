/**
 * Product HTTP result consumed by the feature's canonical response schema.
 *
 * @public
 */
export interface IMobileHttpResponse {
  /**
   * Whether the HTTP status represents a successful product operation.
   *
   * @public
   */
  readonly ok: boolean;
  /**
   * Original HTTP status, including unauthorized and state-change responses.
   *
   * @public
   */
  readonly status: number;
  /**
   * Untrusted JSON requiring the owning product schema before state assignment.
   *
   * @public
   */
  readonly body: unknown;
}
