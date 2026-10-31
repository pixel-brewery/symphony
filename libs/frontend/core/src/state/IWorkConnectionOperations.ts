// #region Imports

import type { Signal } from '@angular/core';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** The six existing Work source-account commands and queries with their single busy owner. @public */
export interface IWorkConnectionOperations {
  readonly connectionBusy: Signal<boolean>;
  connectGitHub(input: RequestPayload<'github.login.start'>): Promise<boolean>;
  connectAzureDevOps(connectionId: string, token: string): Promise<boolean>;
  disconnectAzureDevOps(connectionId: string): Promise<boolean>;
  disconnectGitHub(hostname: string, login: string): Promise<boolean>;
  listGitHubProjects(
    input: RequestPayload<'github.projects.list'>,
  ): Promise<ResponsePayload<'github.projects.list'>>;
  listWorkItemSourceColumns(
    input: RequestPayload<'work-item-sources.columns'>,
  ): Promise<ResponsePayload<'work-item-sources.columns'>>;
}
