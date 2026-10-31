// #region Imports

import { computed, inject, signal } from '@angular/core';
import { Clock, ORCHESTRATION_CLIENT, type IInboxSummary } from '@symphony/frontend-core';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';
import { projectInboxEntries } from '../inbox/projectInboxEntries';
import { InboxEntryTitlePipe } from '../pipes/InboxEntryTitlePipe';

// #endregion

/**
 * Exposes the Inbox's decisions to the menu-bar extra's `Needs you` row.
 *
 * The menu-bar panel is its own window with its own request session: it never constructs the main
 * window's bootstrap or snapshot synchronisation. So the summary reads the orchestrator's cached
 * snapshot and the settings itself when the panel refreshes, and derives the decisions with the
 * same pure projection the Inbox uses, scoped to the active workspaces as the Inbox is.
 *
 * @returns The Inbox summary for surfaces outside the main window.
 * @public
 */
export function createInboxSummary(): IInboxSummary {
  const client = inject(ORCHESTRATION_CLIENT);
  const clock = inject(Clock);
  const title = new InboxEntryTitlePipe();
  const snapshot = signal<IOrchestrationSnapshot | undefined>(undefined);
  const settings = signal<ApplicationSettingsDto | undefined>(undefined);
  const decisions = computed(() => {
    const current = snapshot();
    const configuration = settings();
    if (!current || !configuration) return undefined;
    const workspaces = new Set(configuration.activeViewScope.workspaceIds);
    const acceptsLegacyItems = configuration.workspaces.length === 1;
    return projectInboxEntries({
      workItems: current.workItems.filter((item) =>
        item.workspaceId ? workspaces.has(item.workspaceId) : acceptsLegacyItems,
      ),
      boardColumns: current.boardColumns,
      executions: current.executions,
      executionQueue: current.executionQueue ?? [],
      stages: current.workflow.stages,
      readiness: current.workItemReadiness ?? [],
      goals: current.goals ?? [],
      deliveryGroupProposals: (current.deliveryGroupProposals ?? []).filter((proposal) =>
        workspaces.has(proposal.workspaceId),
      ),
      pullRequests: current.pullRequests ?? [],
      ciRuns: current.ciRuns ?? [],
      agents: configuration.agentProfiles,
      teams: configuration.agentTeams,
      now: clock.now(),
      snoozedUntil: new Map(),
    }).filter((entry) => entry.group === 'decision');
  });
  return {
    decisionCount: computed(() => decisions()?.length),
    firstDecisionTitle: computed(() => {
      const first = decisions()?.[0];
      return first ? title.transform(first) : undefined;
    }),
    refresh: async () => {
      const [nextSnapshot, nextSettings] = await Promise.all([
        client.request('snapshot.get', {}),
        client.request('settings.get', {}),
      ]);
      snapshot.set(nextSnapshot);
      settings.set(nextSettings);
    },
  };
}
