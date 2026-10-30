// #region Imports

import { inject, type Provider } from '@angular/core';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { CI_OPERATIONS, SKILLS_OPERATIONS } from '@symphony/frontend-core';
import { EXECUTION_OPERATIONS } from '@symphony/frontend-core/execution';
import { DELIVERY_OPERATIONS } from '@symphony/frontend-core/delivery-operations';
import { REPOSITORY_RUNTIME_OPERATIONS, WORKSPACE_SCOPE } from '@symphony/frontend-core/workspace';
import { WORK_BOARD_CONTEXT } from '../ports/WorkBoardContextToken';
import { WORK_TASK_CONTEXT } from '../ports/WorkTaskContextToken';
import { WORK_DELIVERY_GROUP_CONTEXT } from '../ports/WorkDeliveryGroupContextToken';
import { WORK_APPROVAL_CONTEXT } from '../ports/WorkApprovalContextToken';
import { WORK_QUICK_CREATE_CONTEXT } from '../ports/WorkQuickCreateContextToken';
import { WORK_SEARCH_CONTEXT } from '../ports/WorkSearchContextToken';
import { WORK_WIDGET_CONTEXT } from '../ports/WorkWidgetContextToken';
import { WORK_CI_OPERATIONS } from '../ports/WorkCiOperationsToken';
import { WORK_REPOSITORY_RUNTIME } from '../ports/WorkRepositoryRuntimeToken';
import { WORK_EXECUTION_READ } from '../ports/WorkExecutionReadToken';
import { WORK_PUBLICATION_READ } from '../ports/WorkPublicationReadToken';
import { WORK_SKILLS_READ } from '../ports/WorkSkillsReadToken';
import { WORK_BOARD_SELECTION } from '../ports/WorkBoardSelectionToken';
import { WORK_BOARD_ROUTE } from '../ports/WorkBoardRouteToken';

// #endregion

/** Binds only the facts and optional participants consumed by Work views to their existing owners. @internal */
export function provideWorkViewContexts(): Provider[] {
  return [
    { provide: WORK_BOARD_CONTEXT, useExisting: ApplicationProjection },
    { provide: WORK_TASK_CONTEXT, useExisting: ApplicationProjection },
    { provide: WORK_DELIVERY_GROUP_CONTEXT, useExisting: ApplicationProjection },
    { provide: WORK_APPROVAL_CONTEXT, useExisting: ApplicationProjection },
    { provide: WORK_QUICK_CREATE_CONTEXT, useExisting: ApplicationProjection },
    { provide: WORK_SEARCH_CONTEXT, useExisting: ApplicationProjection },
    { provide: WORK_WIDGET_CONTEXT, useExisting: ApplicationProjection },
    {
      provide: WORK_CI_OPERATIONS,
      useFactory: () => inject(CI_OPERATIONS, { optional: true }),
    },
    {
      provide: WORK_REPOSITORY_RUNTIME,
      useFactory: () => inject(REPOSITORY_RUNTIME_OPERATIONS, { optional: true }),
    },
    {
      provide: WORK_EXECUTION_READ,
      useFactory: () => inject(EXECUTION_OPERATIONS, { optional: true }),
    },
    {
      provide: WORK_PUBLICATION_READ,
      useFactory: () => inject(DELIVERY_OPERATIONS, { optional: true }),
    },
    {
      provide: WORK_SKILLS_READ,
      useFactory: () => inject(SKILLS_OPERATIONS, { optional: true }),
    },
    {
      provide: WORK_BOARD_SELECTION,
      useFactory: () => inject(WORKSPACE_SCOPE, { optional: true }),
    },
    {
      provide: WORK_BOARD_ROUTE,
      useFactory: () => {
        const projection = inject(ApplicationProjection),
          bootstrap = inject(ApplicationBootstrap),
          synchronization = inject(OrchestrationSynchronizer);
        return {
          snapshot: projection.snapshot,
          initialize: () => bootstrap.initialize(),
          refresh: (force?: boolean) => synchronization.refresh(force),
        };
      },
    },
  ];
}
