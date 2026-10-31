// #region Imports

import { describe, expect, it } from 'vitest';
import type { IOrbitProjectedNode } from './IOrbitProjectedNode';
import { projectOrbitLabels } from './projectOrbitLabels';

// #endregion

describe('projectOrbitLabels', () => {
  const points: readonly IOrbitProjectedNode[] = Array.from({ length: 1400 }, (_, index) => ({
    node: {
      id: `ticket:${index}`,
      label: `SY-${index}`,
      kind: 'ticket',
      position: { x: 0, y: 0, z: 0 },
    },
    x: 100 + (index % 5) * 200,
    y: 80 + (Math.floor(index / 5) % 6) * 90,
    depth: index + 1,
    radius: 4,
  }));

  it('retains all world data while suppressing system ticket labels and bounding a close-up', () => {
    // arrange
    const count = points.length;
    // act
    const system = projectOrbitLabels(points, 1024, 640, 'system');
    const close = projectOrbitLabels(points, 1024, 640, 'tickets');
    // assert
    expect(system).toHaveLength(0);
    expect(close.length).toBeGreaterThan(8);
    expect(close.length).toBeLessThanOrEqual(18);
    expect(points).toHaveLength(count);
    for (const label of close) {
      expect(label.x).toBeGreaterThanOrEqual(12);
      expect(label.y).toBeGreaterThanOrEqual(12);
      expect(label.x + label.width).toBeLessThanOrEqual(1012);
      expect(label.y + label.height).toBeLessThanOrEqual(628);
      expect(
        close.filter(
          (other) =>
            other !== label &&
            label.x < other.x + other.width &&
            label.x + label.width > other.x &&
            label.y < other.y + other.height &&
            label.y + label.height > other.y,
        ),
      ).toHaveLength(0);
    }
  });

  it('keeps the focused ID and selected ticket ahead of re-ordered candidates', () => {
    // arrange
    const pinned = points[17];
    const selected = points[28];
    expect(pinned).toBeDefined();
    expect(selected).toBeDefined();
    // act
    const first = projectOrbitLabels(
      points,
      1024,
      640,
      'system',
      selected?.node.id,
      pinned?.node.id,
    );
    const refreshed = projectOrbitLabels(
      [...points].reverse(),
      1024,
      640,
      'system',
      selected?.node.id,
      pinned?.node.id,
    );
    // assert
    expect(first.map((label) => label.node.id)).toEqual(['ticket:17', 'ticket:28']);
    expect(refreshed.map((label) => label.node.id)).toEqual(first.map((label) => label.node.id));
  });

  it('avoids covering a projected solid planet and gives the selected ticket priority', () => {
    // arrange
    const anchors: readonly IOrbitProjectedNode[] = [
      {
        node: {
          id: 'ticket:a',
          kind: 'ticket',
          label: 'SY-A',
          workItemId: 'a',
          position: { x: 0, y: 0, z: 0 },
        },
        x: 360,
        y: 270,
        depth: 10,
        radius: 4,
      },
      {
        node: {
          id: 'ticket:b',
          kind: 'ticket',
          label: 'SY-B',
          workItemId: 'b',
          position: { x: 1, y: 0, z: 0 },
        },
        x: 520,
        y: 250,
        depth: 10,
        radius: 5,
      },
      {
        node: {
          id: 'target:preview',
          kind: 'target',
          label: 'Preview',
          position: { x: 2, y: 0, z: 0 },
        },
        x: 170,
        y: 270,
        depth: 11,
        radius: 38,
      },
    ];
    // act
    const labels = projectOrbitLabels(anchors, 736, 550, 'tickets', 'ticket:a');
    // assert
    expect(labels[0]?.node.id).toBe('ticket:a');
    expect(labels.map((label) => label.node.id)).toContain('ticket:b');
    for (const label of labels.filter((item) => item.node.kind !== 'target')) {
      expect(
        label.x < 208 &&
          label.x + label.width > 132 &&
          label.y < 308 &&
          label.y + label.height > 232,
      ).toBe(false);
    }
  });

  it('keeps production and destinations ahead of bounded ticket groups at system zoom', () => {
    // arrange
    const groups: IOrbitProjectedNode[] = Array.from({ length: 30 }, (_, index) => ({
      node: {
        id: `group:belt:${index}`,
        kind: 'group',
        label: 'Tickets',
        count: 25,
        position: { x: 0, y: 0, z: 0 },
      },
      x: 100 + (index % 10) * 100,
      y: 280 + Math.floor(index / 10) * 100,
      depth: 1,
      radius: 2,
    }));
    const context: IOrbitProjectedNode[] = ['production', 'target:preview'].map((id, index) => ({
      node: {
        id,
        kind: index === 0 ? 'production' : 'target',
        label: index === 0 ? 'Production' : 'Preview',
        position: { x: 0, y: 0, z: 0 },
      },
      x: 300 + index * 400,
      y: 100,
      depth: 20,
      radius: 30,
    }));
    // act
    const labels = projectOrbitLabels([...groups, ...context, ...points], 1200, 700, 'system');
    // assert
    expect(labels.slice(0, 2).map((label) => label.node.id)).toEqual([
      'production',
      'target:preview',
    ]);
    expect(labels).toHaveLength(10);
    const group = labels.find((label) => label.node.kind === 'group');
    expect(group?.width).toBe(88);
    expect(group?.height).toBe(44);
    expect(labels.some((label) => label.node.kind === 'ticket')).toBe(false);
  });
});
