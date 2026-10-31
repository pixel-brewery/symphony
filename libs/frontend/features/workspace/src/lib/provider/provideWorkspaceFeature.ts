// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { WORKSPACE_OPERATIONS, WORKSPACE_SCOPE } from '@symphony/frontend-core/workspace';
import type { IWorkspaceConfiguration } from '../ports/IWorkspaceConfiguration';
import type { IWorkspaceContext } from '../ports/IWorkspaceContext';
import type { IWorkspaceProjection } from '../ports/IWorkspaceProjection';
import type { IWorkspaceRefresh } from '../ports/IWorkspaceRefresh';
import { WORKSPACE_CLIENT } from '../ports/WorkspaceClientToken';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import { WORKSPACE_CONTEXT } from '../ports/WorkspaceContextToken';
import { WORKSPACE_PROJECTION } from '../ports/WorkspaceProjectionToken';
import { WORKSPACE_REFRESH } from '../ports/WorkspaceRefreshToken';
import { WorkspaceSelectionStore } from '../state/WorkspaceSelectionStore';
import { WorkspaceStore } from '../state/WorkspaceStore';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import { WORKSPACE_PATH_SELECTOR } from '../ports/WorkspacePathSelectorToken';
import type { IWorkspaceSettingsContext } from '../ports/IWorkspaceSettingsContext';
import { provideRepositoryRuntime } from './provideRepositoryRuntime';
import { withWorkspaceSettings } from './withWorkspaceSettings';
import { withWorkspaceNotifications } from './withWorkspaceNotifications';
import { WorkspaceContext } from '../adapters/WorkspaceContext';

// #endregion

/**
 * Registers Workspace's actual state owners and bounded aggregate dependencies.
 *
 * @returns Application-level Workspace providers.
 * @public
 */
export function provideWorkspaceFeature(): EnvironmentProviders {
  return makeEnvironmentProviders(
    composeProviders(
      [
        ...provideRepositoryRuntime(),
        WorkspaceContext,
        WorkspaceStore,
        WorkspaceSelectionStore,
        { provide: WORKSPACE_PATH_SELECTOR, useExisting: ORCHESTRATION_CLIENT },
        {
          provide: WORKSPACE_SETTINGS_CONTEXT,
          useFactory: (): IWorkspaceSettingsContext => inject(WorkspaceContext),
        },
        { provide: WORKSPACE_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        {
          provide: WORKSPACE_CONTEXT,
          useFactory: (): IWorkspaceContext => inject(WorkspaceContext),
        },
        {
          provide: WORKSPACE_CONFIGURATION,
          useFactory: (): IWorkspaceConfiguration => inject(WorkspaceContext),
        },
        {
          provide: WORKSPACE_PROJECTION,
          useFactory: (): IWorkspaceProjection => inject(WorkspaceContext),
        },
        {
          provide: WORKSPACE_REFRESH,
          useFactory: (): IWorkspaceRefresh => inject(WorkspaceContext),
        },
        { provide: WORKSPACE_OPERATIONS, useExisting: WorkspaceStore },
        { provide: WORKSPACE_SCOPE, useExisting: WorkspaceSelectionStore },
        ...withWorkspaceNotifications().provide(),
      ],
      withWorkspaceSettings(),
    ),
  );
}
