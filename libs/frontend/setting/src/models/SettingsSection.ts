// #region Imports

import type { GlobalSettingsSection } from './GlobalSettingsSection';
import type { WorkspaceSettingsSection } from './WorkspaceSettingsSection';

// #endregion

/**
 * Describes a feature-contributed Settings navigation section.
 *
 * @public
 */
export type SettingsSection = {
  readonly label: string;
  readonly description: string;
  readonly order: number;
} & (
  | { readonly scope: 'global'; readonly id: GlobalSettingsSection }
  | { readonly scope: 'workspace'; readonly id: WorkspaceSettingsSection }
);
