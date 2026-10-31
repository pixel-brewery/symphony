// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { Clock } from '@symphony/frontend-core';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import { projectInboxEntries } from '../inbox/projectInboxEntries';
import { HOME_CONTEXT } from '../ports/HomeContextToken';

// #endregion

/**
 * Owns the Inbox entries of the active workspace, shared by the Inbox, Overview's `Waiting for
 * you` card and the sidebar count, and the entries snoozed in this session.
 *
 * Snoozing has no backend yet: it lives in this renderer for the session and is forgotten when
 * the window reloads.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class InboxStore {
  // #region Fields

  private readonly _context = inject(HOME_CONTEXT);
  private readonly _clock = inject(Clock);
  private readonly _snoozedUntil = signal<ReadonlyMap<string, number>>(new Map());

  // #endregion

  // #region Properties

  /**
   * Decisions and updates in display order; `undefined` until the first snapshot arrives.
   *
   * @public
   * @readonly
   */
  public readonly entries = computed<readonly IInboxEntry[] | undefined>(() => {
    const snapshot = this._context.snapshot();
    const settings = this._context.settings();
    if (!snapshot) return undefined;
    const workspaces = new Set(this._context.selectedWorkspaceIds());
    return projectInboxEntries({
      workItems: this._context.scopedWorkItems(),
      boardColumns: snapshot.boardColumns,
      executions: snapshot.executions,
      executionQueue: snapshot.executionQueue ?? [],
      stages: snapshot.workflow.stages,
      readiness: snapshot.workItemReadiness ?? [],
      goals: snapshot.goals ?? [],
      deliveryGroupProposals: (snapshot.deliveryGroupProposals ?? []).filter((proposal) =>
        workspaces.has(proposal.workspaceId),
      ),
      pullRequests: snapshot.pullRequests ?? [],
      ciRuns: snapshot.ciRuns ?? [],
      agents: settings?.agentProfiles ?? [],
      teams: settings?.agentTeams ?? [],
      now: this._clock.now(),
      snoozedUntil: this._snoozedUntil(),
    });
  });

  /**
   * Entries that wait for a decision.
   *
   * @public
   * @readonly
   */
  public readonly decisions = computed(
    () => this.entries()?.filter((entry) => entry.group === 'decision') ?? [],
  );

  /**
   * Entries that only report.
   *
   * @public
   * @readonly
   */
  public readonly updates = computed(
    () => this.entries()?.filter((entry) => entry.group === 'update') ?? [],
  );

  /**
   * Number of decisions, `undefined` while the snapshot is loading.
   *
   * @public
   * @readonly
   */
  public readonly decisionCount = computed(() =>
    this.entries() === undefined ? undefined : this.decisions().length,
  );

  // #endregion

  // #region Methods

  /**
   * Hides an entry until the start of the next day, for this session only.
   *
   * @param entryId - The entry to snooze.
   * @public
   */
  public snoozeUntilTomorrow(entryId: string): void {
    const now = new Date(Date.now());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    this._snoozedUntil.update((snoozed) => new Map([...snoozed, [entryId, tomorrow]]));
  }

  // #endregion
}
