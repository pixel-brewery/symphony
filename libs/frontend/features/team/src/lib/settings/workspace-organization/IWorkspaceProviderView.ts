// #region Imports

import type { Settings } from './Settings';

// #endregion

export interface IWorkspaceProviderView {
  readonly id: string;
  readonly displayName: string;
  readonly providerId: string;
  readonly runtime: string;
  readonly protocol: string;
  readonly modelDiscovery: Settings['providerManifests'][number]['modelDiscovery'];
  readonly capabilities: readonly string[];
}
