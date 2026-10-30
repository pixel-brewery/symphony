// #region Imports

import type { Signal } from '@angular/core';
import type { IAiOperations } from '@symphony/frontend-core/ai';
import type {
  ApplicationSettingsDto,
  RequestPayload,
  ResponsePayload,
} from '@symphony/ipc-contracts-composition';

// #endregion

/** Consumed read-only AI projections and the one settings writer required by Team-owned forms and organization cards. @public */
export interface ITeamSettingsContext extends Pick<
  IAiOperations,
  | 'codexConfiguration'
  | 'codexConfigurationAccountId'
  | 'availableAiModels'
  | 'modelIntelligence'
  | 'codexConfigurationBusy'
  | 'availableAiModelsBusy'
  | 'modelIntelligenceBusy'
  | 'refreshCodexConfiguration'
  | 'clearCodexConfiguration'
  | 'refreshAvailableAiModels'
  | 'refreshModelIntelligence'
  | 'aiUsageFor'
  | 'aiUsageBusyFor'
  | 'refreshAiUsage'
> {
  /** Whether the composed product includes AI-owned account/model operations. @public @readonly */
  readonly aiAvailable: boolean;
  /** Whether the actual native installation owner is included. @public @readonly */
  readonly nativeInstallAvailable: boolean;
  /** Authoritative workspace configuration. @public @readonly */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /** Existing configuration activity exclusion. @public @readonly */
  readonly configurationBusy: Signal<boolean>;
  /** Existing editor activity exclusion. @public @readonly */
  readonly editorBusy: Signal<boolean>;
  /** Existing provider-account statuses. @public @readonly */
  readonly connections: Signal<ResponsePayload<'connections.get'> | undefined>;
  /** Existing native tool availability. @public @readonly */
  readonly runtimeHealth: Signal<ResponsePayload<'health.get'> | undefined>;
  /** Existing native installer lifecycle. @public @readonly */
  readonly runtimeDependencyInstallBusy: Signal<
    RequestPayload<'runtime-dependencies.install'>['command'] | undefined
  >;
  /** Saves Team-owned settings changes through the sole aggregate writer. @public */
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  /** Hydrates the shared configuration. @public */
  refreshConfiguration(): Promise<void>;
  /** Reconciles provider sign-in status. @public */
  refreshProviderConnections(): Promise<void>;
  /** Uses the existing native installer when a selected agent runtime is missing. @public */
  installRuntimeDependency(
    command: RequestPayload<'runtime-dependencies.install'>['command'],
  ): Promise<boolean>;
}
