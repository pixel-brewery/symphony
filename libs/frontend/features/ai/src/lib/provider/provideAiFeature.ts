// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { AI_OPERATIONS } from '@symphony/frontend-core/ai';
import type { IAiContext } from '../ports/IAiContext';
import type { IAiConfiguration } from '../ports/IAiConfiguration';
import { AI_CLIENT } from '../ports/AiClientToken';
import { AI_CONTEXT } from '../ports/AiContextToken';
import { AI_CONFIGURATION } from '../ports/AiConfigurationToken';
import { withAiSettings } from './withAiSettings';
import { withAiNotifications } from './withAiNotifications';
import { provideAiServiceViews } from './provideAiServiceViews';
import { AiStore } from '../state/AiStore';
import { AiContext } from '../adapters/AiContext';

// #endregion

/**
 * Registers the actual AI state owner and consumed aggregate adapters.
 *
 * @public
 */
export function provideAiFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...composeProviders(
      [
        AiStore,
        AiContext,
        { provide: AI_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: AI_CONTEXT, useFactory: (): IAiContext => inject(AiContext) },
        { provide: AI_CONFIGURATION, useFactory: (): IAiConfiguration => inject(AiContext) },
        { provide: AI_OPERATIONS, useExisting: AiStore },
        ...withAiNotifications().provide(),
      ],
      withAiSettings(),
    ),
    provideAiServiceViews(),
  ]);
}
