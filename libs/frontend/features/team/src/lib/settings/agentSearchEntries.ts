// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';

// #endregion

/**
 * One `Search settings` entry per agent in `AI team`, found by name and job title; a disabled agent
 * says so, and the result opens the agent's sheet.
 *
 * @returns The entries of every workspace's agents.
 * @public
 */
export function agentSearchEntries(): Signal<readonly ISettingsSearchEntry[]> {
  const configuration = inject(ConfigurationStore);
  return computed(() => {
    const settings = configuration.settings();
    if (!settings) return [];
    return settings.agentProfiles.map((agent): ISettingsSearchEntry => {
      const position = settings.positions.find((item) => item.id === agent.positionId);
      return {
        id: `agent-${agent.id}`,
        label: agent.displayName,
        ...(position ? { description: position.displayName } : {}),
        group: 'Agents',
        keywords: ['agent'],
        ...(agent.enabled ? {} : { value: 'Disabled' }),
        workspaceId: agent.workspaceId,
        parameters: { agent: agent.id },
      };
    });
  });
}
