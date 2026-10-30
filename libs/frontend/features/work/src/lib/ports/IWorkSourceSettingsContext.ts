// #region Imports

import type { Signal } from '@angular/core';
import type { IWorkConnectionOperations } from '@symphony/frontend-core/work';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** Consumes Work source operations and the one configuration writer without an aggregate facade. @public */
export interface IWorkSourceSettingsContext extends Pick<
  IWorkConnectionOperations,
  | 'connectAzureDevOps'
  | 'disconnectAzureDevOps'
  | 'listGitHubProjects'
  | 'listWorkItemSourceColumns'
> {
  /** Authoritative configuration, including board mappings. @public @readonly */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /** Shared source-account status. @public @readonly */
  readonly connections: Signal<ResponsePayload<'connections.get'> | undefined>;
  /** Existing shared persistence and account activity. @public @readonly */
  readonly configurationBusy: Signal<boolean>;
  /** Existing exclusion across settings editors. @public @readonly */
  readonly editorBusy: Signal<boolean>;
  /** Saves the complete validated source configuration through the existing writer. @public */
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  /** Hydrates the authoritative shared configuration. @public */
  refreshConfiguration(): Promise<void>;
  /** Reconciles source-account authentication after an external sign-in. @public */
  refreshProviderConnections(): Promise<void>;
  /** Reconciles the existing board snapshot after a source change. @public */
  refresh(force?: boolean): Promise<void>;
}
