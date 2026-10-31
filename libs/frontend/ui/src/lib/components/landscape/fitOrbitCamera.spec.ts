// #region Imports

import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { IOrbitScene } from './IOrbitScene';
import { fitOrbitCamera } from './fitOrbitCamera';

// #endregion

describe('fitOrbitCamera', () => {
  const scene: IOrbitScene = {
    nodes: [
      { id: 'production', kind: 'production', label: 'Production', position: { x: 0, y: 0, z: 0 } },
      ...Array.from({ length: 1400 }, (_, index) => {
        const angle = index * 2.399963;
        const radius = 22 + (index % 23) / 3;
        return {
          id: `ticket:${index}`,
          kind: 'ticket' as const,
          label: `SY-${index}`,
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle * 3) * 4,
            z: Math.sin(angle) * radius,
          },
        };
      }),
      { id: 'target:outer', kind: 'target', label: 'Preview', position: { x: -5, y: 15, z: -36 } },
    ],
    rings: [{ id: 'target-ring', label: 'Preview', radius: 16, tilt: 0.52, rotation: 0.8 }],
    edges: [],
    ticketCount: 1400,
  };

  it.each([
    [320, 480],
    [736, 550],
    [1024, 640],
  ])('fits all 1400 retained objects with label margins at %ix%i', (width, height) => {
    // arrange
    const value = fitOrbitCamera(scene, width, height);
    const camera = new PerspectiveCamera(46, width / height, 0.08, 4000);
    camera.position.set(value.position.x, value.position.y, value.position.z);
    camera.lookAt(value.target.x, value.target.y, value.target.z);
    camera.updateMatrixWorld();
    // act
    const points = scene.nodes.map((node) =>
      new Vector3(node.position.x, node.position.y, node.position.z).project(camera),
    );
    // assert
    expect(points).toHaveLength(1402);
    expect(value.target).toEqual({ x: 0, y: 0, z: 0 });
    expect(points[0]?.x).toBeCloseTo(0, 8);
    expect(points[0]?.y).toBeCloseTo(0, 8);
    for (const point of points) {
      expect(((1 - Math.abs(point.x)) * width) / 2).toBeGreaterThanOrEqual(
        Math.min(72, width * 0.16),
      );
      expect(((1 - Math.abs(point.y)) * height) / 2).toBeGreaterThanOrEqual(
        Math.min(76, height * 0.17),
      );
      expect(point.z).toBeLessThan(1);
      expect(point.z).toBeGreaterThan(-1);
    }
    if (width === 1024) {
      expect(
        Math.max(...points.map((point) => Math.abs(point.x))) > 0.7 ||
          Math.max(...points.map((point) => Math.abs(point.y))) > 0.6,
      ).toBe(true);
    }
  });

  it('keeps Saturn’s full rings inside the viewport when it is the only body', () => {
    // arrange
    const saturn: IOrbitScene = {
      nodes: [
        {
          id: 'production',
          kind: 'production',
          label: 'Production',
          celestialBody: 'saturn',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      rings: [],
      edges: [],
      ticketCount: 0,
    };
    const value = fitOrbitCamera(saturn, 320, 480);
    const camera = new PerspectiveCamera(46, 320 / 480, 0.08, 4000);
    camera.position.set(value.position.x, value.position.y, value.position.z);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    // act
    const points = Array.from({ length: 64 }, (_, index) => {
      const angle = (index * Math.PI) / 32;
      return new Vector3(Math.cos(angle) * 3.25 * 2.32, 0, Math.sin(angle) * 3.25 * 2.32)
        .applyAxisAngle(new Vector3(0, 0, 1), 0.466)
        .project(camera);
    });
    // assert
    expect(points.every((point) => Math.abs(point.x) < 0.8 && Math.abs(point.y) < 0.8)).toBe(true);
  });

  it('includes tilted rings beyond the ticket belt and tolerates an empty or invalid-size viewport', () => {
    // arrange
    const empty: IOrbitScene = {
      nodes: [],
      rings: [{ id: 'outer', label: 'Outer', radius: 70, tilt: 1.2, rotation: 0.7 }],
      edges: [],
      ticketCount: 0,
    };
    // act
    const value = fitOrbitCamera(empty, Number.NaN, 0);
    // assert
    expect(Object.values(value.position).every(Number.isFinite)).toBe(true);
    expect(
      Math.hypot(
        value.position.x - value.target.x,
        value.position.y - value.target.y,
        value.position.z - value.target.z,
      ),
    ).toBeGreaterThan(100);
    expect(empty.rings[0]?.radius).toBe(70);
  });

  it('keeps an offset Production Sun exactly centered instead of centering asymmetric world bounds', () => {
    // arrange
    const sun = { x: 5, y: -2, z: 3 };
    const shifted: IOrbitScene = {
      ...scene,
      nodes: scene.nodes.map((node) =>
        node.kind === 'production' ? { ...node, position: sun } : node,
      ),
    };
    // act
    const value = fitOrbitCamera(shifted, 1024, 640);
    // assert
    expect(value.target).toEqual(sun);
    expect(shifted.nodes).toHaveLength(1402);
  });
});
