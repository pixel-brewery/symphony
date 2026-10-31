// #region Imports

import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { IDeliverySnapshot } from '@symphony/domain-delivery';
import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { projectOrbitScene } from './projectOrbitScene';

// #endregion

const workflow = createDefaultApplicationSettings().workflow;
const items: IWorkItem[] = Array.from({ length: 1000 }, (_, index) => ({
  id: `ticket-${index}`,
  workspaceId: 'personal',
  externalId: `#${index}`,
  title: `Ticket ${index}`,
  body: '',
  stageId: workflow.stages[0]!.id,
  provider: 'github-projects',
  repository: 'owner/repo',
  labels: [],
  assignees: [],
}));
const delivery: IDeliverySnapshot = {
  refreshedAt: '2026-10-09T12:00:00Z',
  errors: [],
  targets: ['production-a', 'production-b', 'preview'].map((id) => ({
    id,
    workspaceId: 'personal',
    repositoryBindingId: 'repo',
    kind: 'environment',
    displayName: id,
    environment: id,
    production: id.startsWith('production'),
  })),
  evidence: ['production-a', 'production-b', 'preview'].map((id) => ({
    id,
    targetId: id,
    workspaceId: 'personal',
    repositoryBindingId: 'repo',
    kind: 'deployment',
    revision: 'old-version-redeployed',
    version: '1.0',
    state: 'succeeded',
    deployedAt: '2026-10-09T11:00:00Z',
    observedAt: '2026-10-09T11:05:00Z',
    workItemIds: [items[0]!.id],
  })),
};

describe('projectOrbitScene', () => {
  it('retains all 1,000 ticket bodies and accessible group memberships instead of paging geometry', () => {
    // arrange
    const universe = [...items];

    // act
    const scene = projectOrbitScene(universe, workflow, undefined);
    const tickets = scene.nodes.filter((node) => node.kind === 'ticket');
    const groupMembers = scene.nodes
      .filter((node) => node.kind === 'group' && node.memberIds)
      .flatMap((node) => node.memberIds!);

    // assert
    expect(scene.ticketCount).toBe(1000);
    expect(tickets).toHaveLength(1000);
    expect(new Set(tickets.map((node) => JSON.stringify(node.position))).size).toBe(1000);
    expect(tickets.every((node) => Object.values(node.position).every(Number.isFinite))).toBe(true);
    expect(new Set(groupMembers).size).toBe(1000);
    expect(new Set(scene.nodes.map((node) => node.kind))).toEqual(
      new Set(['production', 'ticket', 'group']),
    );
    expect(scene.edges).toEqual([]);
    expect(scene.nodes.find((node) => node.id === 'production')?.deliveryState).toBe('unassigned');
    expect(scene.rings).toEqual([]);
  });

  it('preserves world positions through reorder, title refresh and filtering with the same project universe', () => {
    // arrange
    const first = projectOrbitScene(items, workflow, delivery);
    const updated = items.toReversed().map((item) => ({ ...item, title: `Updated ${item.title}` }));
    const subset = updated.filter((_, index) => index % 7 === 0);

    // act
    const reordered = projectOrbitScene(updated, workflow, delivery);
    const filtered = projectOrbitScene(subset, workflow, delivery);
    const initialPositions = new Map(first.nodes.map((node) => [node.id, node.position]));

    // assert
    expect(
      reordered.nodes.every(
        (node) => JSON.stringify(node.position) === JSON.stringify(initialPositions.get(node.id)),
      ),
    ).toBe(true);
    expect(
      filtered.nodes
        .filter((node) => node.kind === 'ticket')
        .every(
          (node) => JSON.stringify(node.position) === JSON.stringify(initialPositions.get(node.id)),
        ),
    ).toBe(true);
    expect(filtered.ticketCount).toBe(subset.length);
  });

  it('does not displace an existing ticket when a previously colliding ID arrives', () => {
    // arrange
    const existing = { ...items[0]!, id: 'work-item-2004' };
    const arriving = { ...items[1]!, id: 'work-item-1298' };
    const before = projectOrbitScene([existing], workflow, undefined);

    // act
    const after = projectOrbitScene([arriving, existing], workflow, undefined);

    // assert
    for (const node of before.nodes.filter((entry) => entry.workItemId === existing.id))
      expect(after.nodes.find((entry) => entry.id === node.id)?.position).toEqual(node.position);
  });

  it('represents one ticket at every proven destination and separates multiple production targets', () => {
    // arrange
    const latestObservedOlderDeployment = {
      ...delivery.evidence[0]!,
      id: 'later-observation-of-earlier-version',
      revision: 'newer-version-but-earlier-deployment',
      version: '2.0',
      deployedAt: '2026-10-08T11:00:00Z',
      observedAt: '2026-10-09T11:30:00Z',
      workItemIds: [items[1]!.id],
    };

    // act
    const scene = projectOrbitScene(items.slice(0, 2), workflow, {
      ...delivery,
      evidence: [...delivery.evidence, latestObservedOlderDeployment],
    });
    const ticket = scene.nodes.find((node) => node.workItemId === items[0]!.id)!;
    const productionTargets = scene.nodes.filter((node) => node.targetId?.startsWith('production'));

    // assert
    expect(scene.nodes.filter((node) => node.id === ticket.id)).toHaveLength(1);
    expect(ticket.relatedIds).toHaveLength(3);
    expect(
      scene.edges.filter((edge) => edge.id.startsWith('delivery:') && edge.from === ticket.id),
    ).toHaveLength(3);
    expect(productionTargets).toHaveLength(2);
    expect(productionTargets[0]!.position).not.toEqual(productionTargets[1]!.position);
    expect(productionTargets.every((node) => node.version === '1.0')).toBe(true);
    expect(scene.nodes.find((node) => node.id === 'production')).toMatchObject({
      deliveryState: 'confirmed',
      count: 2,
    });
    expect(ticket.stageId).toBe(items[0]!.stageId);
  });

  it('distinguishes configured, failed, pending and unavailable evidence without inventing destinations', () => {
    // arrange
    const configured = { ...delivery, evidence: [] };
    const pending = {
      ...delivery,
      evidence: [{ ...delivery.evidence[0]!, state: 'in-progress' as const }],
    };
    const failed = {
      ...delivery,
      evidence: [{ ...delivery.evidence[0]!, state: 'failed' as const }],
    };

    // act
    const unconfirmedScene = projectOrbitScene([], workflow, configured);
    const pendingScene = projectOrbitScene([], workflow, pending);
    const failedScene = projectOrbitScene([], workflow, failed);
    const staleScene = projectOrbitScene([], workflow, delivery, true);
    const targetErrorScene = projectOrbitScene([], workflow, {
      ...delivery,
      errors: [{ targetId: 'production-a', message: 'Unavailable' }],
    });

    // assert
    expect(unconfirmedScene.nodes.filter((node) => node.kind === 'target')).toHaveLength(3);
    expect(unconfirmedScene.nodes.find((node) => node.id === 'production')?.deliveryState).toBe(
      'unconfirmed',
    );
    expect(pendingScene.nodes.find((node) => node.targetId === 'production-a')?.deliveryState).toBe(
      'pending',
    );
    expect(failedScene.nodes.find((node) => node.targetId === 'production-a')?.deliveryState).toBe(
      'failed',
    );
    expect(
      staleScene.nodes
        .filter((node) => node.kind === 'target')
        .every((node) => node.deliveryState === 'stale'),
    ).toBe(true);
    expect(staleScene.nodes.find((node) => node.id === 'production')?.deliveryState).toBe('stale');
    expect(targetErrorScene.nodes.find((node) => node.id === 'production')?.deliveryState).toBe(
      'stale',
    );
  });

  it('uses the Sun for a single actual production target without a duplicate planet or environment orbit', () => {
    // arrange
    const target = delivery.targets[0]!;
    const snapshot = { ...delivery, targets: [target], evidence: [delivery.evidence[0]!] };

    // act
    const scene = projectOrbitScene([items[0]!], workflow, snapshot);

    // assert
    expect(scene.rings).toEqual([]);
    expect(scene.nodes.filter((node) => node.targetId === target.id)).toHaveLength(1);
    expect(scene.nodes.find((node) => node.id === 'production')).toMatchObject({
      kind: 'production',
      targetId: target.id,
      position: { x: 0, y: 0, z: 0 },
      revision: 'old-version-redeployed',
      version: '1.0',
      deliveryState: 'confirmed',
    });
    expect(scene.edges.find((edge) => edge.id.startsWith('delivery:'))?.to).toBe('production');
  });

  it('changes a production body without moving tickets or changing delivery evidence', () => {
    // arrange
    const target = delivery.targets[0]!;
    const snapshot = { ...delivery, targets: [target], evidence: [delivery.evidence[0]!] };
    const before = projectOrbitScene(items.slice(0, 2), workflow, snapshot);
    // act
    const after = projectOrbitScene(items.slice(0, 2), workflow, {
      ...snapshot,
      targets: [{ ...target, celestialBody: 'saturn' }],
    });
    // assert
    expect(before.nodes.find((node) => node.kind === 'production')?.celestialBody).toBe('sun');
    expect(after.nodes.find((node) => node.kind === 'production')?.celestialBody).toBe('saturn');
    expect(after.nodes.map((node) => ({ ...node, celestialBody: undefined }))).toEqual(
      before.nodes.map((node) => ({ ...node, celestialBody: undefined })),
    );
    expect(after.edges).toEqual(before.edges);
    expect(after.rings).toEqual(before.rings);
  });

  it('preserves each production appearance when multiple targets share the conceptual centre', () => {
    // arrange
    const snapshot: IDeliverySnapshot = {
      ...delivery,
      targets: [
        { ...delivery.targets[0]!, celestialBody: 'earth' },
        { ...delivery.targets[1]!, celestialBody: 'mars' },
      ],
    };
    // act
    const scene = projectOrbitScene([], workflow, snapshot);
    // assert
    expect(scene.nodes.find((node) => node.id === 'production')?.celestialBody).toBe('sun');
    expect(scene.nodes.find((node) => node.targetId === 'production-a')?.celestialBody).toBe(
      'earth',
    );
    expect(scene.nodes.find((node) => node.targetId === 'production-b')?.celestialBody).toBe(
      'mars',
    );
  });

  it('keeps release channels and installations distinct from environment planets', () => {
    // arrange
    const targets = delivery.targets.map((target, index) => ({
      ...target,
      kind: (['environment', 'release-channel', 'installation'] as const)[index]!,
    }));

    // act
    const scene = projectOrbitScene([], workflow, { ...delivery, targets });

    // assert
    expect(
      new Set(scene.nodes.filter((node) => node.kind === 'target').map((node) => node.targetKind)),
    ).toEqual(new Set(['environment', 'release-channel', 'installation']));
  });
});
