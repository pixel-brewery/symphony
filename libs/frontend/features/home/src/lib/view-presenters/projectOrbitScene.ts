// #region Imports

import {
  currentDeliveryEvidence,
  type IDeliveryEvidence,
  type IDeliverySnapshot,
} from '@symphony/domain-delivery';
import { type IWorkItem } from '@symphony/domain-work';
import { type IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IOrbitNode, IOrbitRing, IOrbitScene, ISceneEdge } from '@symphony/frontend-ui';

// #endregion

/** Complete, deterministic world geometry. Work phase never implies a delivery. @public */
export function projectOrbitScene(
  items: readonly IWorkItem[],
  workflow: IWorkflowDefinition | undefined,
  delivery: IDeliverySnapshot | undefined,
  evidenceStale = false,
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
    if (!target.production) rings.push(ring);
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
  const groups = new Map<number, string[]>();
  // Independent angle, radius and height hashes retain coordinates when unrelated tickets arrive.
  // Their continuous coordinates avoid a shared finite slot table that would displace collisions.
  for (const item of [...items].toSorted((a, b) => a.id.localeCompare(b.id))) {
    const theta = angle(item.id);
    const radius = beltRadius + (hash(`radius:${item.id}`) / 0x100000000) * 6.3;
    const height = (hash(`height:${item.id}`) / 0x100000000 - 0.5) * 2.3;
    const position = orbitPoint(radius, theta, 0.2, -0.12);
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
      position: { ...position, y: position.y + height },
      relatedIds: destinations.get(item.id) ?? [],
    };
    nodes.push(node);
    const sector = Math.floor((theta / (Math.PI * 2)) * 16);
    const members = groups.get(sector) ?? [];
    members.push(item.id);
    groups.set(sector, members);
    for (const target of targets) {
      if (!proofs.get(target.id)?.workItemIds.includes(item.id)) continue;
      edges.push({
        id: `delivery:${item.id}:${target.id}`,
        from: node.id,
        to: targetNodeId(target.id),
        label: target.displayName,
      });
    }
  }
  for (const [sector, memberIds] of groups) {
    if (memberIds.length < 4) continue;
    nodes.push({
      id: `group:belt:${sector}`,
      kind: 'group',
      label: 'Tickets',
      count: memberIds.length,
      memberIds,
      position: orbitPoint(beltRadius + 3.15, ((sector + 0.5) / 16) * Math.PI * 2, 0.2, -0.12),
    });
  }
  return { nodes, rings, edges, ticketCount: items.length };
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
