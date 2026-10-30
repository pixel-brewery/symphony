// #region Imports

import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { IOrbitCrewMember } from './IOrbitCrewMember';
import type { IOrbitPalette } from './IOrbitPalette';
import { OrbitFlybyFleet } from './OrbitFlybyFleet';

// #endregion

const palette: IOrbitPalette = {
  background: '#ffffff',
  foreground: '#0a0a0a',
  neutral: '#737373',
  primary: '#737373',
  secondary: '#009689',
  info: '#2b7fff',
  warning: '#e17100',
  danger: '#e7000b',
  success: '#00a63e',
  highlight: '#8e51ff',
};
const crew: readonly IOrbitCrewMember[] = ['blue', 'mint', 'coral', 'gold', 'rose'].map(
  (color, index) => ({
    id: `pilot-${index}`,
    name: `Pilot ${index}`,
    appearance: {
      figure: 'dot',
      color: color as 'blue' | 'mint' | 'coral' | 'gold' | 'rose',
      accessories: [],
    },
  }),
);
const camera = new THREE.PerspectiveCamera(46, 1040 / 620, 0.08, 4000);
camera.position.set(0, 0, 80);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
const target = new THREE.Vector3();

describe('OrbitFlybyFleet', () => {
  it('schedules finite waves, visits the entire crew before repeating, and never duplicates a simultaneous pilot', () => {
    // arrange
    const texture = new THREE.Texture();
    const fleet = new OrbitFlybyFleet(
      palette,
      () => texture,
      () => 0.6,
    );
    fleet.setCrew(crew, 0);
    fleet.setActive(true, 0);
    const visited: string[] = [];
    // act
    for (let wave = 0; wave < 3; wave++) {
      const start = fleet.nextWakeAt;
      expect(Number.isFinite(start)).toBe(true);
      fleet.update(start, camera, target, 1040, 620);
      expect(fleet.count).toBe(2);
      const labels = fleet.update(start + 9000, camera, target, 1040, 620);
      visited.push(...labels.map((label) => label.pilot.id));
      expect(new Set(labels.map((label) => label.pilot.id)).size).toBe(2);
      expect(labels.every((label) => Number.isFinite(label.x) && Number.isFinite(label.y))).toBe(
        true,
      );
      fleet.update(start + 25000, camera, target, 1040, 620);
      expect(fleet.flying).toBe(false);
      expect(fleet.root.children).toHaveLength(0);
      expect(fleet.nextWakeAt).toBeGreaterThan(start + 25000);
    }
    // assert
    expect(new Set(visited.slice(0, 5)).size).toBe(5);
    fleet.dispose();
    expect(fleet.nextWakeAt).toBe(Infinity);
  });

  it('caps simultaneous flights, clears hidden or reduced-motion activity, and never catches up missed flights', () => {
    // arrange
    const texture = new THREE.Texture();
    const dispose = vi.spyOn(texture, 'dispose');
    const fleet = new OrbitFlybyFleet(
      palette,
      () => texture,
      () => 0.99,
    );
    fleet.setCrew(crew, 0);
    fleet.setActive(true, 0);
    const start = fleet.nextWakeAt;
    fleet.update(start, camera, target, 1040, 620);
    // act
    fleet.setActive(false, start + 5000);
    // assert
    expect(fleet.count).toBe(0);
    expect(fleet.root.children).toHaveLength(0);
    expect(fleet.nextWakeAt).toBe(Infinity);
    expect(fleet.update(start + 1000000, camera, target, 1040, 620)).toEqual([]);
    expect(dispose).not.toHaveBeenCalled();
    fleet.setActive(true, start + 1000000);
    expect(fleet.nextWakeAt).toBeGreaterThan(start + 1000000);
    fleet.update(fleet.nextWakeAt, camera, target, 1040, 620);
    expect(fleet.count).toBe(3);
    fleet.dispose();
  });

  it('retains flights on polling, uses saved appearance, and immediately removes pilots outside the project', () => {
    // arrange
    const texture = vi.fn(() => new THREE.Texture());
    const fleet = new OrbitFlybyFleet(palette, texture, () => 0.5);
    fleet.setCrew([crew[4]!], 0);
    fleet.setActive(true, 0);
    const start = fleet.nextWakeAt;
    fleet.update(start, camera, target, 1040, 620);
    const ship = fleet.root.children[0];
    // act
    fleet.setCrew([{ ...crew[4]! }], start + 1000);
    const labels = fleet.update(start + 9000, camera, target, 1040, 620);
    // assert
    expect(fleet.root.children[0]).toBe(ship);
    expect(texture).toHaveBeenCalledExactlyOnceWith('figures/rose.png');
    expect(labels[0]?.pilot).toEqual(crew[4]);
    fleet.setCrew([], start + 9500);
    expect(fleet.count).toBe(0);
    expect(fleet.root.children).toHaveLength(0);
    expect(fleet.nextWakeAt).toBe(Infinity);
    fleet.dispose();
  });

  it('keeps rocket and pilot in world units while zoom and resize scale them with nearby ticket meteors', () => {
    // arrange
    const fleet = new OrbitFlybyFleet(
      palette,
      () => new THREE.Texture(),
      () => 0.5,
    );
    const view = camera.clone();
    fleet.setCrew([crew[0]!], 0);
    fleet.setActive(true, 0);
    const start = fleet.nextWakeAt;
    fleet.update(start, view, target, 1040, 620);
    const time = start + 9000;
    fleet.update(time, view, target, 1040, 620);
    const ship = fleet.root.children[0]!;
    const pilot = ship.getObjectByName('Pilot')!;
    const position = ship.position.clone();
    const shipScale = ship.scale.clone();
    const pilotScale = pilot.getWorldScale(new THREE.Vector3());
    const measure = (distance: number, width: number, height: number) => {
      view.position.copy(position).add(new THREE.Vector3(0, 0, distance));
      view.lookAt(position);
      view.aspect = width / height;
      view.updateProjectionMatrix();
      const label = fleet.update(time, view, target, width, height)[0]!;
      const centre = pilot.getWorldPosition(new THREE.Vector3());
      const projectedWidth = (size: number): number => {
        const left = centre
          .clone()
          .add(new THREE.Vector3(-size / 2, 0, 0))
          .project(view);
        const right = centre
          .clone()
          .add(new THREE.Vector3(size / 2, 0, 0))
          .project(view);
        return ((right.x - left.x) * width) / 2;
      };
      return {
        rocket: label.size,
        pilot: projectedWidth(pilot.getWorldScale(new THREE.Vector3()).x),
        meteor: projectedWidth(0.5),
        scale: ship.scale.clone(),
        pilotScale: pilot.getWorldScale(new THREE.Vector3()),
      };
    };
    // act
    const normal = measure(80, 1040, 620);
    const close = measure(40, 1040, 620);
    const far = measure(160, 1040, 620);
    const resized = measure(80, 1040, 1240);
    // assert
    for (const value of [normal, close, far, resized]) {
      expect(value.scale).toEqual(shipScale);
      expect(value.pilotScale).toEqual(pilotScale);
      expect(value.pilot / value.meteor).toBeCloseTo(normal.pilot / normal.meteor, 5);
    }
    expect(close.rocket / normal.rocket).toBeCloseTo(2, 1);
    expect(far.rocket / normal.rocket).toBeCloseTo(0.5, 1);
    expect(close.pilot / normal.pilot).toBeCloseTo(2, 1);
    expect(far.pilot / normal.pilot).toBeCloseTo(0.5, 1);
    expect(resized.rocket / normal.rocket).toBeCloseTo(2, 5);
    expect(resized.pilot / normal.pilot).toBeCloseTo(2, 5);
    expect(ship.position).toEqual(position);
    expect(fleet.count).toBe(1);
    fleet.dispose();
  });
});
