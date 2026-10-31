// #region Imports

import {
  currentDeliveryEvidence,
  type IDeliveryEvidence,
  type IDeliverySnapshot,
} from '@symphony/domain-delivery';
import { type IWorkItem } from '@symphony/domain-work';
import { type IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IOrbitNode, IOrbitRing, IOrbitScene, ISceneEdge } from '@symphony/frontend-ui';
import type { IOrbitCluster } from './IOrbitCluster';

// #endregion

/**
 * Complete, deterministic world geometry. Work phase never implies a delivery.
 *
 * The destination sits at the centre with the other destinations on dashed orbits. The work items
 * form stage clusters on a flat belt around them: one sector per cluster, clockwise from the top in
 * cluster order, each cluster an arc of evenly spaced items with its label node on the outer side.
 *
 * @param items - Every work item in the orbit.
 * @param workflow - The workflow whose stages label the tickets.
 * @param delivery - Destinations and their evidence.
 * @param evidenceStale - Whether the last evidence refresh failed.
 * @param clusters - The stage clusters; items outside every cluster form one `Work items` cluster.
 * @returns The scene the Orbit canvas renders.
 * @public
 */
export function projectOrbitScene(
  items: readonly IWorkItem[],
  workflow: IWorkflowDefinition | undefined,
  delivery: IDeliverySnapshot | undefined,
  evidenceStale = false,
  clusters: readonly IOrbitCluster[] = [],
): IOrbitScene {
  const nodes: IOrbitNode[] = [];
  const rings: IOrbitRing[] = [];
  const edges: ISceneEdge[] = [];
  const targets = [...(delivery?.targets ?? [])].toSorted((a, b) => a.id.localeCompare(b.id));
  const production = targets.filter((target) => target.production);
  const singleProduction = production.length === 1 ? production[0] : undefined;
  const targetNodeId = (targetId: string) =>
    singleProduction?.id === targetId ? 'production' : `target:${targetId}`;
  const proofs = new Map<string, IDeliveryEvidence>();
  const destinations = new Map<string, string[]>();
  for (const target of targets) {
    const proof = currentDeliveryEvidence(delivery?.evidence ?? [], target.id);
    if (!proof) continue;
    proofs.set(target.id, proof);
    for (const workItemId of proof.workItemIds) {
      const ids = destinations.get(workItemId) ?? [];
      ids.push(targetNodeId(target.id));
      destinations.set(workItemId, ids);
    }
  }
  const productionProofs = production.flatMap((target) => {
    const proof = proofs.get(target.id);
    return proof ? [proof] : [];
  });
  nodes.push({
    id: 'production',
    kind: 'production',
    label: 'Production',
    position: { x: 0, y: 0, z: 0 },
    targetId: singleProduction?.id,
    targetKind: singleProduction?.kind,
    celestialBody: singleProduction?.celestialBody ?? 'sun',
    version: singleProduction ? proofs.get(singleProduction.id)?.version : undefined,
    revision: singleProduction ? proofs.get(singleProduction.id)?.revision : undefined,
    observedAt: singleProduction
      ? (proofs.get(singleProduction.id)?.deployedAt ?? proofs.get(singleProduction.id)?.observedAt)
      : undefined,
    deliveryState:
      evidenceStale ||
      delivery?.errors.some((error) => production.some((target) => target.id === error.targetId))
        ? 'stale'
        : production.length === 0
          ? 'unassigned'
          : productionProofs.length === production.length
            ? 'confirmed'
            : 'unconfirmed',
    relatedIds: singleProduction ? [] : production.map((target) => `target:${target.id}`),
    memberIds: [...new Set(productionProofs.flatMap((proof) => proof.workItemIds))],
    count: production.length,
  });
  let environmentIndex = 0;
  for (const target of targets) {
    if (target.id === singleProduction?.id) continue;
    const ring: IOrbitRing = {
      id: `orbit:${target.id}`,
      label: target.displayName,
      targetId: target.id,
      radius: target.production ? 5.8 : 10 + environmentIndex++ * 2.8,
      tilt: 0.12 + (hash(target.id) % 5) * 0.075,
      rotation: ((hash(`rotation:${target.id}`) % 360) * Math.PI) / 180,
    };
    if (!target.production) rings.push({ ...ring, style: 'dashed' });
    const current = proofs.get(target.id);
    const recent = [...(delivery?.evidence ?? [])]
      .filter((entry) => entry.targetId === target.id)
      .toSorted((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
    const errored = delivery?.errors.some((entry) => entry.targetId === target.id);
    nodes.push({
      id: `target:${target.id}`,
      kind: 'target',
      label: target.displayName,
      targetId: target.id,
      targetKind: target.kind,
      celestialBody: target.production ? target.celestialBody : undefined,
      position: orbitPoint(
        ring.radius,
        target.production
          ? (production.findIndex((entry) => entry.id === target.id) / production.length) *
              Math.PI *
              2
          : angle(target.id),
        ring.tilt,
        target.production ? 0 : ring.rotation,
      ),
      deliveryState:
        evidenceStale || errored
          ? 'stale'
          : current
            ? 'confirmed'
            : recent?.state === 'failed'
              ? 'failed'
              : recent?.state === 'pending' || recent?.state === 'in-progress'
                ? 'pending'
                : 'unconfirmed',
      version: current?.version,
      revision: current?.revision,
      observedAt: current?.deployedAt ?? current?.observedAt,
      memberIds: current?.workItemIds ?? [],
      relatedIds: [
        ...(target.production ? ['production'] : []),
        ...(current?.workItemIds ?? []).map((id) => `ticket:${id}`),
      ],
    });
    if (target.production)
      edges.push({
        id: `production:${target.id}`,
        from: 'production',
        to: `target:${target.id}`,
        label: target.displayName,
      });
  }
  const beltRadius = Math.max(22, (rings.at(-1)?.radius ?? 0) + 7);
  if (items.length)
    rings.push({ id: 'orbit:belt', label: 'Work items', radius: beltRadius, tilt: 0, rotation: 0 });
  const byId = new Map(items.map((item) => [item.id, item]));
  const placed = new Set<string>();
  const sectors: { readonly cluster: IOrbitCluster; readonly members: readonly IWorkItem[] }[] = [];
  for (const cluster of clusters) {
    const members = cluster.memberIds.flatMap((id) => {
      const item = byId.get(id);
      if (!item || placed.has(id)) return [];
      placed.add(id);
      return [item];
    });
    if (members.length) sectors.push({ cluster, members });
  }
  const rest = items
    .filter((item) => !placed.has(item.id))
    .toSorted((a, b) => a.id.localeCompare(b.id));
  if (rest.length)
    sectors.push({
      cluster: {
        id: 'work-items',
        kind: 'column',
        label: 'Work items',
        tone: 'neutral',
        memberIds: rest.map((item) => item.id),
      },
      members: rest,
    });
  const sector = (Math.PI * 2) / Math.max(1, sectors.length);
  const arc = sector * (sectors.length > 1 ? 0.62 : 0.5);
  sectors.forEach(({ cluster, members }, index) => {
    // Clockwise from the top of the diagram: the camera looks down at the belt from its near side.
    const middle = -Math.PI / 2 + index * sector;
    const layout = clusterLayout(members.length, beltRadius, arc);
    members.forEach((item, position) => {
      const row = Math.floor(position / layout.perRow);
      const inRow = Math.min(layout.perRow, members.length - row * layout.perRow);
      const radius = beltRadius + row * layout.spacing;
      const theta =
        middle + (position - row * layout.perRow - (inRow - 1) / 2) * (layout.spacing / radius);
      const stage = workflow?.stages.find((entry) => entry.id === item.stageId);
      const node: IOrbitNode = {
        id: `ticket:${item.id}`,
        kind: 'ticket',
        label: item.externalId,
        title: item.title,
        workItemId: item.id,
        stageId: item.stageId,
        stageLabel: stage?.label,
        stageKind: stage?.kind,
        tone: cluster.tone,
        position: orbitPoint(radius, theta, 0, 0),
        relatedIds: destinations.get(item.id) ?? [],
      };
      nodes.push(node);
      for (const target of targets) {
        if (!proofs.get(target.id)?.workItemIds.includes(item.id)) continue;
        edges.push({
          id: `delivery:${item.id}:${target.id}`,
          from: node.id,
          to: targetNodeId(target.id),
          label: target.displayName,
        });
      }
    });
    nodes.push({
      id: `group:${cluster.id}`,
      kind: 'group',
      label: cluster.label,
      count: members.length,
      memberIds: members.map((item) => item.id),
      tone: cluster.tone,
      position: orbitPoint(beltRadius + layout.rows * layout.spacing + 1.2, middle, 0, 0),
    });
  });
  return { nodes, rings, edges, ticketCount: items.length };
}

/** Evenly spaced rows along the cluster arc; large clusters pack tighter and add outer rows. */
function clusterLayout(count: number, radius: number, arc: number) {
  const length = radius * arc;
  const perRowAt = (spacing: number) => Math.max(1, Math.floor(length / spacing) + 1);
  let spacing = 0.95;
  while (spacing > 0.45 && Math.ceil(count / perRowAt(spacing)) > 6) spacing -= 0.05;
  const perRow = Math.min(count, perRowAt(spacing));
  return { spacing, perRow, rows: Math.ceil(count / perRow) };
}

function hash(id: string): number {
  let value = 2166136261;
  for (const character of id) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

function angle(id: string): number {
  return (hash(id) / 0x100000000) * Math.PI * 2;
}

function orbitPoint(radius: number, theta: number, tilt: number, rotation: number) {
  const x = radius * Math.cos(theta);
  const z = radius * Math.sin(theta);
  const tiltedY = -z * Math.sin(tilt);
  const tiltedZ = z * Math.cos(tilt);
  return {
    x: x * Math.cos(rotation) + tiltedZ * Math.sin(rotation),
    y: tiltedY,
    z: -x * Math.sin(rotation) + tiltedZ * Math.cos(rotation),
  };
}
