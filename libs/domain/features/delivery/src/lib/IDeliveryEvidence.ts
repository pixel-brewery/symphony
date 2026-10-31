/**
 * Observed provider evidence. A CI success alone is never delivery evidence.
 *
 * @public
 */
export interface IDeliveryEvidence {
  readonly id: string;
  readonly targetId: string;
  readonly workspaceId: string;
  readonly repositoryBindingId: string;
  readonly kind: 'deployment' | 'publication' | 'installation';
  readonly revision: string;
  readonly version?: string;
  readonly state: 'pending' | 'in-progress' | 'succeeded' | 'failed' | 'inactive';
  readonly deployedAt?: string;
  readonly observedAt: string;
  readonly externalUrl?: string;
  /** Proven by PR merge/head revisions and repository ancestry, never by a branch-name match. */
  readonly workItemIds: readonly string[];
}
