// #region Imports

import type { ISettingsEditorRequest } from '../editor/ISettingsEditorRequest';

// #endregion

/**
 * A Settings location key that opens one feature-owned editor, for example
 * `?workspace=personal&section=services&account=codex-1` for the AI account sheet.
 *
 * `Search settings` results carry such keys in `ISettingsSearchEntry.parameters`.
 *
 * @public
 */
export interface ISettingsEditorRoute {
  /**
   * Unique route-initializer identifier.
   *
   * @public
   * @readonly
   */
  readonly id: string;
  /**
   * The section whose location carries the key, for example `services`.
   *
   * @public
   * @readonly
   */
  readonly section: string;
  /**
   * Whether a location that names a workspace but no section also opens the editor. Settings opens
   * such a location on the workspace's first section, so only that section (`team`) sets it.
   *
   * @public
   * @readonly
   */
  readonly matchesWithoutSection?: boolean;
  /**
   * The location key naming the edited item, for example `account`.
   *
   * @public
   * @readonly
   */
  readonly parameter: string;
  /**
   * Runs once in the Settings route's injection context, so it may `inject()` the feature's state,
   * and returns the resolver that turns the key's value into the editor request. The resolver
   * returns `undefined` while the item is unknown, for example before the configuration loads or
   * for an item another feature owns.
   *
   * @public
   * @readonly
   */
  readonly resolve: () => (
    value: string,
    workspaceId: string | undefined,
  ) => ISettingsEditorRequest | undefined;
}
