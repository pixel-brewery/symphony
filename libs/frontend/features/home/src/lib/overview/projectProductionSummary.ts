// #region Imports

import { currentDeliveryEvidence } from '@symphony/domain-delivery';
import type { IProductionSummary } from './IProductionSummary';
import type { IProductionSummaryInput } from './IProductionSummaryInput';

// #endregion

/**
 * Summarises Production with Orbit's rules for the project Orbit shows: destinations and evidence
 * of that project and workspace scope; Production is confirmed only while every Production
 * destination has current successful evidence and none reported a refresh error; the confirmed
 * version is the newest proof. The cluster figures are Orbit's inspector figures: members the
 * confirmed version does not contain, and members with succeeded evidence on any destination.
 *
 * @param input - Delivery evidence, the project and the cluster members.
 * @returns The Production card's figures.
 * @public
 */
export function projectProductionSummary(input: IProductionSummaryInput): IProductionSummary {
  const workspaces = new Set(input.workspaceIds);
  const inScope = (target: { workspaceId: string; repositoryBindingId: string }): boolean =>
    workspaces.has(target.workspaceId) &&
    (!input.repositoryBindingId || target.repositoryBindingId === input.repositoryBindingId);
  // Configured destinations count before the first refresh reports them, as in Orbit.
  const targets = new Map(
    input.configuredTargets.filter(inScope).map((target) => [target.id, target]),
  );
  for (const target of input.delivery.targets) {
    if (inScope(target)) targets.set(target.id, target);
  }
  const production = [...targets.values()].filter((target) => target.production);
  const evidence = input.delivery.evidence.filter(inScope);
  const proofs = production.flatMap((target) => {
    const proof = currentDeliveryEvidence(evidence, target.id);
    return proof ? [proof] : [];
  });
  const newest = proofs.toSorted((left, right) =>
    (right.deployedAt ?? right.observedAt).localeCompare(left.deployedAt ?? left.observedAt),
  )[0];
  const state = input.delivery.errors.some((error) =>
    production.some((target) => target.id === error.targetId),
  )
    ? 'stale'
    : production.length === 0
      ? 'unassigned'
      : proofs.length === production.length
        ? 'confirmed'
        : 'unconfirmed';

  const confirmed = new Set(
    state === 'confirmed' ? proofs.flatMap((proof) => proof.workItemIds) : [],
  );
  const evidenced = new Set(
    evidence.filter((entry) => entry.state === 'succeeded').flatMap((entry) => entry.workItemIds),
  );
  return {
    state,
    ...(newest?.version ? { version: newest.version } : {}),
    ...(newest
      ? { revision: newest.revision, confirmedAt: newest.deployedAt ?? newest.observedAt }
      : {}),
    clusterSize: input.clusterItemIds.length,
    notInProduction: input.clusterItemIds.filter((id) => !confirmed.has(id)).length,
    evidenceCollected: input.clusterItemIds.filter((id) => evidenced.has(id)).length,
  };
}
