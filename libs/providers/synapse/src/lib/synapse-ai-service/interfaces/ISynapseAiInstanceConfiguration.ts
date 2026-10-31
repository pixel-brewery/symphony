/**
 * Symphony-owned mapping from an existing connection to one isolated native AI instance.
 *
 * @public
 */
export interface ISynapseAiInstanceConfiguration {
  /**
   * Existing connection identifier, preserved in Symphony settings and execution bindings.
   */
  readonly id: string;

  /**
   * Workspace owner; internal native identities include this scope.
   */
  readonly workspaceId: string;

  /**
   * Explicitly selected installed CLI implementation.
   */
  readonly provider: 'codex' | 'claude' | 'opencode';

  /**
   * Exact existing workspace/account directory; no credential migration is required.
   */
  readonly root: string;

  /**
   * Optional host-resolved installed executable, including an existing desktop-bundled CLI.
   */
  readonly executable?: string;

  /**
   * Optional explicit account credential environment; never logged or persisted here.
   */
  readonly environment?: Readonly<Record<string, string>>;

  /**
   * Validated native provider options, excluding per-request model/reasoning selection.
   */
  readonly configuration?: Readonly<Record<string, unknown>>;
}
