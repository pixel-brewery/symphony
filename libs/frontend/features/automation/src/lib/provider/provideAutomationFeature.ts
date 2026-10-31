// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { AUTOMATION_PATH_SELECTOR } from '../ports/AutomationPathSelectorToken';
import { AutomationSettingsStore } from '../state/AutomationSettingsStore';
import { AutomationSettingsContext } from '../adapters/AutomationSettingsContext';
import { RepositoryPreparationPolicy } from '../state/RepositoryPreparationPolicy';
import { withAutomationSettings } from './withAutomationSettings';
import { withAutomationNotifications } from './withAutomationNotifications';

// #endregion

/**
 * Registers one runtime policy draft and the existing settings writer bridge.
 *
 * @public
 */
export function provideAutomationFeature(): EnvironmentProviders {
  return makeEnvironmentProviders(
    composeProviders(
      [
        AutomationSettingsStore,
        AutomationSettingsContext,
        RepositoryPreparationPolicy,
        { provide: AUTOMATION_PREPARATION, useExisting: RepositoryPreparationPolicy },
        { provide: AUTOMATION_SETTINGS_CONTEXT, useExisting: AutomationSettingsContext },
        { provide: AUTOMATION_PATH_SELECTOR, useExisting: ORCHESTRATION_CLIENT },
        ...withAutomationNotifications().provide(),
      ],
      withAutomationSettings(),
    ),
  );
}
