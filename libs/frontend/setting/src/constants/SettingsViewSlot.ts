/**
 * Identifies the Settings host locations that accept independently owned feature cards.
 *
 * @public
 */
export const SettingsViewSlot = {
  Appearance: 'settings.global.appearance',
  HeaderActions: 'settings.header-actions',
  Global: 'settings.global',
  Workspace: 'settings.workspace',
  WorkspaceServicesBoards: 'settings.workspace.services.boards',
  WorkspaceServicesAccount: 'settings.workspace.services.account',
  WorkspaceServicesFeedback: 'settings.workspace.services.feedback',
  WorkspaceServicesAvailableConnections: 'settings.workspace.services.available-connections',
} as const;
