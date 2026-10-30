// #region Imports
import { computed, inject } from '@angular/core';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { provideHomeFeature, homeRoutes } from '@symphony/frontend-feature-home';
import { provideWorkFeature, workRoutes } from '@symphony/frontend-feature-work';
import {
  provideDeliveryFeature,
  deliveryRoutes,
  PullRequestStore,
} from '@symphony/frontend-feature-delivery';
import {
  provideCiFeature,
  ciRoutes,
  CI_RUNTIME_WORKSPACE_ROOT,
} from '@symphony/frontend-feature-ci';
import { provideSkillsFeature, skillsRoutes } from '@symphony/frontend-feature-skills';
import { provideArcadeFeature, arcadeRoutes } from '@symphony/frontend-feature-arcade';
import {
  provideExecutionFeature,
  EXECUTION_PUBLICATION,
} from '@symphony/frontend-feature-execution';
import { provideWorkflowFeature } from '@symphony/frontend-feature-workflow';
import { provideWorkspaceFeature } from '@symphony/frontend-feature-workspace';
import { provideAiFeature } from '@symphony/frontend-feature-ai';
import { provideTeamFeature } from '@symphony/frontend-feature-team';
import { providePlatformFeature } from '@symphony/frontend-feature-platform';
import {
  AutomationSettingsStore,
  provideAutomationFeature,
} from '@symphony/frontend-feature-automation';
import { provideFeedbackFeature } from '@symphony/frontend-feature-feedback';
import { provideMobileFeature } from '@symphony/frontend-feature-mobile';
import type { IProductFeatureDefinition } from './IProductFeatureDefinition';
// #endregion

/**
 * Selects the desktop product once; each definition removes its providers and routes together.
 *
 * @public
 */
export const applicationProductComposition: readonly IProductFeatureDefinition[] = Object.freeze([
  { id: 'home', providers: [provideHomeFeature()], routes: homeRoutes },
  { id: 'work', providers: [provideWorkFeature()], routes: workRoutes },
  {
    id: 'delivery',
    providers: [
      provideDeliveryFeature(),
      { provide: EXECUTION_PUBLICATION, useExisting: PullRequestStore },
    ],
    routes: deliveryRoutes,
  },
  {
    id: 'ci',
    providers: [
      provideCiFeature(),
      {
        provide: CI_RUNTIME_WORKSPACE_ROOT,
        useFactory: () => {
          const automation = inject(AutomationSettingsStore, { optional: true });
          if (automation) return automation.workspaceRoot;
          const projection = inject(ApplicationProjection);
          return computed(() => projection.settings()?.runtime.workspaceRoot ?? '');
        },
      },
    ],
    routes: ciRoutes,
  },
  { id: 'skills', providers: [provideSkillsFeature()], routes: skillsRoutes },
  { id: 'arcade', providers: [provideArcadeFeature()], routes: arcadeRoutes },
  { id: 'execution', providers: [provideExecutionFeature()], routes: [] },
  { id: 'workflow', providers: [provideWorkflowFeature()], routes: [] },
  { id: 'workspace', providers: [provideWorkspaceFeature()], routes: [] },
  { id: 'ai', providers: [provideAiFeature()], routes: [] },
  {
    id: 'team',
    providers: [provideTeamFeature()],
    routes: [{ path: 'team', pathMatch: 'full', redirectTo: 'settings' }],
  },
  { id: 'platform', providers: [providePlatformFeature()], routes: [] },
  { id: 'automation', providers: [provideAutomationFeature()], routes: [] },
  { id: 'feedback', providers: [provideFeedbackFeature()], routes: [] },
  { id: 'mobile', providers: [provideMobileFeature()], routes: [] },
]);
