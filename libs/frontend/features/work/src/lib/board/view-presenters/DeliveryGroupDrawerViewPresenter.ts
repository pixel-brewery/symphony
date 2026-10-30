// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { ExternalLinkService, ViewPresenter } from '@symphony/frontend-core';
import type { IDeliveryGroupDrawerData } from './IDeliveryGroupDrawerData';
import { WorkStore } from '../../state/WorkStore';
import { WORK_DELIVERY_GROUP_CONTEXT } from '../../ports/WorkDeliveryGroupContextToken';

// #endregion

@Injectable()
export class DeliveryGroupDrawerViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _context = inject(WORK_DELIVERY_GROUP_CONTEXT);
  private readonly _work = inject(WorkStore);
  private readonly _externalLinks = inject(ExternalLinkService);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<IDeliveryGroupDrawerData>;
  private readonly _data = inject(DRAWER_REF_DATA) as IDeliveryGroupDrawerData;

  /**
   * Prevents duplicate provider mutations from repeated activations.
   *
   * @public
   * @readonly
   */
  public readonly busy = signal(false);

  /**
   * Original lane destination retained while the operator reviews the relationship.
   *
   * @public
   * @readonly
   */
  public readonly requestedColumnLabel = this._data.requestedColumnLabel;

  /**
   * Persisted delivery group, when the drawer was opened from a compact stack.
   *
   * @public
   * @readonly
   */
  public readonly group = computed(() =>
    this._context
      .snapshot()
      ?.deliveryGroups?.find((candidate) => candidate.id === this._data.deliveryGroupId),
  );

  /**
   * Pending Analyzer proposal, when the drawer was opened from grouping drag-and-drop.
   *
   * @public
   * @readonly
   */
  public readonly proposal = computed(() =>
    this._context
      .snapshot()
      ?.deliveryGroupProposals?.find((candidate) => candidate.id === this._data.proposalId),
  );

  /**
   * Root-led work-item projection.
   *
   * @public
   * @readonly
   */
  public readonly items = computed(() => {
    const record = this.group() ?? this.proposal();
    const byId = new Map(this._context.snapshot()?.workItems.map((item) => [item.id, item]));
    return (
      record?.workItemIds.flatMap((workItemId) => {
        const item = byId.get(workItemId);
        return item ? [item] : [];
      }) ?? []
    );
  });

  /**
   * Root ticket shown first and used by the shared workflow.
   *
   * @public
   * @readonly
   */
  public readonly root = computed(() => {
    const rootId = (this.group() ?? this.proposal())?.rootWorkItemId;
    return this.items().find((item) => item.id === rootId);
  });

  /**
   * Whether no safety gate blocks the group: existing claims, pull requests, open decisions.
   * These gates always block; no attestation bypasses them.
   *
   * @public
   * @readonly
   */
  public readonly safetyGatesPass = computed(() => {
    const assessment = this.proposal()?.assessment;
    return Boolean(
      assessment &&
      !assessment.hasOpenDecisions &&
      !assessment.hasExistingClaims &&
      !assessment.hasPullRequests,
    );
  });

  /**
   * Whether Analyzer evidence proves one shared delivery: relation, change surface,
   * compatible acceptance criteria and verification.
   *
   * @public
   * @readonly
   */
  public readonly evidenceGatesPass = computed(() => {
    const assessment = this.proposal()?.assessment;
    return Boolean(
      assessment &&
      assessment.relation === 'joint-delivery' &&
      assessment.sharedChangeSurface.length > 0 &&
      assessment.compatibleAcceptanceCriteria &&
      assessment.compatibleVerification,
    );
  });

  /**
   * Whether Analyzer evidence satisfies every gate for one shared delivery.
   *
   * @public
   * @readonly
   */
  public readonly canConfirm = computed(() => this.safetyGatesPass() && this.evidenceGatesPass());

  /**
   * Whether confirming records an operator attestation: the operator assembled the group,
   * no safety gate blocks it, and only the Analyzer's evidence is missing.
   *
   * @public
   * @readonly
   */
  public readonly requiresAttestation = computed(() => {
    const activationSource = this.proposal()?.activationSource;
    return (
      (activationSource === 'manual-select' || activationSource === 'manual-drag') &&
      this.safetyGatesPass() &&
      !this.evidenceGatesPass()
    );
  });

  /**
   * Active group already holding a member of the reviewed proposal; confirming extends it.
   *
   * @public
   * @readonly
   */
  public readonly existingGroup = computed(() => {
    const proposal = this.proposal();
    if (!proposal) return undefined;
    return this._context
      .snapshot()
      ?.deliveryGroups?.find(
        (candidate) =>
          candidate.state !== 'dissolved' &&
          candidate.state !== 'completed' &&
          proposal.workItemIds.some((workItemId) => candidate.workItemIds.includes(workItemId)),
      );
  });

  /**
   * Operator-facing explanation of the group the confirmed tickets would join.
   *
   * @public
   * @readonly
   */
  public readonly existingGroupSummary = computed(() => {
    const group = this.existingGroup();
    const proposal = this.proposal();
    if (!group || !proposal) return '';
    const byId = new Map(this._context.snapshot()?.workItems.map((item) => [item.id, item]));
    const label = (workItemId: string): string => byId.get(workItemId)?.externalId ?? workItemId;
    const additions = proposal.workItemIds.filter(
      (workItemId) => !group.workItemIds.includes(workItemId),
    );
    return `${group.workItemIds.map(label).join(', ')} already deliver together. Confirming adds ${additions.map(label).join(', ')} to that group; the root stays ${label(group.rootWorkItemId)}.`;
  });

  /**
   * Confirmation label matching the persisted outcome of the action.
   *
   * @public
   * @readonly
   */
  public readonly confirmLabel = computed(() => {
    if (this.requiresAttestation()) return 'Deliver together anyway';
    if (this.existingGroup()) return 'Add to existing group';
    return this.requestedColumnLabel ? 'Group and move together' : 'Take tickets together';
  });

  // #endregion

  // #region Methods

  /**
   * Confirms the currently reviewed proposal.
   *
   * @public
   * @readonly
   */
  public readonly confirm = async (): Promise<void> => {
    const proposal = this.proposal();
    if (!proposal || this.busy()) return;
    this.busy.set(true);
    try {
      const group = this.requiresAttestation()
        ? await this._work.confirmDeliveryGroup(proposal.id, {})
        : await this._work.confirmDeliveryGroup(proposal.id);
      if (!group) return;
      if (this._data.requestedColumnId) {
        const moved = await this._work.moveDeliveryGroup(
          group.id,
          group.rootWorkItemId,
          this._data.requestedColumnId,
          this._data.requestedColumnLabel,
        );
        if (!moved) return;
      }
      this.closeDrawer();
    } finally {
      this.busy.set(false);
    }
  };

  /**
   * Rejects the currently reviewed proposal.
   *
   * @public
   * @readonly
   */
  public readonly reject = async (): Promise<void> => {
    const proposal = this.proposal();
    if (!proposal || this.busy()) return;
    this.busy.set(true);
    try {
      if (!(await this._work.rejectDeliveryGroup(proposal.id))) return;
      if (this._data.requestedWorkItemId && this._data.requestedColumnId) {
        const moved = await this._work.moveWorkItem(
          this._data.requestedWorkItemId,
          this._data.requestedColumnId,
          this._data.requestedColumnLabel,
        );
        if (!moved) return;
      }
      this.closeDrawer();
    } finally {
      this.busy.set(false);
    }
  };

  /**
   * Dissolves the active group and restores independent cards.
   *
   * @public
   * @readonly
   */
  public readonly dissolve = async (): Promise<void> => {
    const group = this.group();
    if (!group || this.busy()) return;
    this.busy.set(true);
    try {
      if (await this._work.dissolveDeliveryGroup(group.id)) this.closeDrawer();
    } finally {
      this.busy.set(false);
    }
  };

  /**
   * Aligns drifted members to the current root column.
   *
   * @public
   * @readonly
   */
  public readonly align = async (): Promise<void> => {
    const group = this.group();
    if (!group || this.busy()) return;
    this.busy.set(true);
    try {
      await this._work.alignDeliveryGroup(group.id);
    } finally {
      this.busy.set(false);
    }
  };

  /**
   * Opens one underlying provider issue.
   *
   * @public
   * @readonly
   */
  public readonly openWorkItem = (workItemId: string): void => {
    this._externalLinks.open(
      this._context.snapshot()?.workItems.find((item) => item.id === workItemId)?.externalUrl,
    );
  };

  /**
   * Closes the drawer.
   *
   * @public
   * @readonly
   */
  public readonly close = (): void => {
    this.closeDrawer();
  };

  private closeDrawer(): void {
    this._drawerRef.close();
  }

  // #endregion
}
