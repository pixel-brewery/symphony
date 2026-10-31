export { AutomationSettingsStore } from './lib/state/AutomationSettingsStore';
export { RepositoryPreparationPolicy } from './lib/state/RepositoryPreparationPolicy';
export { provideAutomationFeature } from './lib/provider/provideAutomationFeature';
export { withAutomationSettings } from './lib/provider/withAutomationSettings';
export type { IAutomationSettingsContext } from './lib/ports/IAutomationSettingsContext';
export type { IAutomationPathSelector } from './lib/ports/IAutomationPathSelector';
export { AUTOMATION_SETTINGS_CONTEXT } from './lib/ports/AutomationSettingsContextToken';
export { AUTOMATION_PATH_SELECTOR } from './lib/ports/AutomationPathSelectorToken';
