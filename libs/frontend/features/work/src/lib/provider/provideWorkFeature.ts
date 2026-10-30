// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { WORK_OPERATIONS, WORK_SELECTION } from '@symphony/frontend-core/work';
import { BoardColumnCollapseStore } from '../board/state/BoardColumnCollapseStore';
import type { IWorkContext } from '../ports/IWorkContext';
import type { IWorkProjection } from '../ports/IWorkProjection';
import type { IWorkRefresh } from '../ports/IWorkRefresh';
import { WORK_CLIENT } from '../ports/WorkClientToken';
import { WORK_CONTEXT } from '../ports/WorkContextToken';
import { WORK_EXECUTION } from '../ports/WorkExecutionToken';
import { WORK_WORKFLOW } from '../ports/WorkWorkflowToken';
import { EXECUTION_OPERATIONS } from '@symphony/frontend-core/execution';
import { WORKFLOW_OPERATIONS } from '@symphony/frontend-core/workflow';
import { WORK_PROJECTION } from '../ports/WorkProjectionToken';
import { WORK_REFRESH } from '../ports/WorkRefreshToken';
import { WorkSelectionStore } from '../state/WorkSelectionStore';
import { WorkFilterStore } from '../state/WorkFilterStore';
import { WORK_FILTERS } from '@symphony/frontend-core/work';
import { WorkStore } from '../state/WorkStore';
import { provideWorkOnboarding } from '../onboarding/provider/provideWorkOnboarding';
import { withWorkNavigation } from './withWorkNavigation';
import { withWorkSearch } from './withWorkSearch';
import { withWorkQuickCreate } from './withWorkQuickCreate';
import { withWorkWidgets } from './withWorkWidgets';
import { composeProviders } from '@symphony/frontend-core';
import { provideWorkViewContexts } from './provideWorkViewContexts';
import { withWorkSettings } from './withWorkSettings';
import { createWorkSourceSettingsContext } from './createWorkSourceSettingsContext';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import { provideWorkConnections } from './provideWorkConnections';
import { provideWorkServiceViews } from './provideWorkServiceViews';
import { WorkSnapshotContext } from '../adapters/WorkSnapshotContext';

// #endregion

/**
 * Registers Work's actual state owners and their bounded aggregate/execution dependencies.
 *
 * @returns Application-level Work providers.
 * @public
 */
export function provideWorkFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideWorkServiceViews(),
    composeProviders(
      [
        ...provideWorkConnections(),
        ...provideWorkViewContexts(),
        WorkSelectionStore,
        WorkSnapshotContext,
        ...provideWorkOnboarding(),
        WorkStore,
        WorkFilterStore,
        { provide: WORK_FILTERS, useExisting: WorkFilterStore },
        { provide: WORK_SOURCE_SETTINGS_CONTEXT, useFactory: createWorkSourceSettingsContext },
        BoardColumnCollapseStore,
        { provide: WORK_SELECTION, useExisting: WorkSelectionStore },
        { provide: WORK_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: WORK_CONTEXT, useFactory: (): IWorkContext => inject(WorkSnapshotContext) },
        {
          provide: WORK_PROJECTION,
          useFactory: (): IWorkProjection => inject(WorkSnapshotContext),
        },
        { provide: WORK_REFRESH, useFactory: (): IWorkRefresh => inject(WorkSnapshotContext) },
        {
          provide: WORK_EXECUTION,
          useFactory: () => inject(EXECUTION_OPERATIONS, { optional: true }),
        },
        {
          provide: WORK_WORKFLOW,
          useFactory: () => inject(WORKFLOW_OPERATIONS, { optional: true }),
        },
        { provide: WORK_OPERATIONS, useExisting: WorkStore },
      ],
      [
        withWorkNavigation(30),
        withWorkSearch(),
        withWorkQuickCreate(),
        withWorkWidgets(),
        ...withWorkSettings(),
      ],
    ),
  ]);
}
