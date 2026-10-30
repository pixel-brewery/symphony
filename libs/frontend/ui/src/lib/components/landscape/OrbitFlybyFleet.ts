// #region Imports

import * as THREE from 'three';
import { defaultAgentAppearance } from '@symphony/domain-team';
import { agentFigureSource } from '../agent-figure/agentFigureSource';
import type { IOrbitCrewMember } from './IOrbitCrewMember';
import type { IOrbitFlybyLabel } from './IOrbitFlybyLabel';
import type { IOrbitPalette } from './IOrbitPalette';
import { createOrbitSpaceship } from './createOrbitSpaceship';

// #endregion

interface IFlight {
  readonly id: string;
  pilot: IOrbitCrewMember;
  readonly started: number;
  readonly duration: number;
  readonly path: THREE.CatmullRomCurve3;
  readonly corners: readonly THREE.Vector3[];
  ship: THREE.Group;
}

/** Finite, randomly scheduled project shuttles. Owns no task, selection or execution state. @public */
export class OrbitFlybyFleet {
  // #region Fields

  /** Non-pickable GPU models owned by the existing Orbit world. @public */
  public readonly root = new THREE.Group();
  private _crew: readonly IOrbitCrewMember[] = [];
  private _crewKey = '';
  private _remaining: string[] = [];
  private _flights: IFlight[] = [];
  private _active = false;
  private _nextWakeAt = Infinity;
  private _sequence = 0;
  private readonly _position = new THREE.Vector3();
  private readonly _tangent = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _front = new THREE.Vector3();
  private readonly _orientation = new THREE.Matrix4();
  private readonly _corner = new THREE.Vector3();

  // #endregion

  // #region Ctor

  /** Receives the renderer's bounded texture cache; random is injectable for deterministic checks. @public */
  public constructor(
    private _palette: IOrbitPalette,
    private readonly _texture: (source: string) => THREE.Texture,
    private readonly _random: () => number = Math.random,
  ) {}

  // #endregion

  // #region Properties

  /** Includes the short stagger before another shuttle in the same wave arrives. @public */
  public get flying(): boolean {
    return this._flights.length > 0;
  }

  /** Idle worlds need only one timer, never an idle animation loop. @public */
  public get nextWakeAt(): number {
    return this._nextWakeAt;
  }

  /** Number of finite flights, including ingress and exit beyond the viewport. @public */
  public get count(): number {
    return this._flights.length;
  }

  // #endregion

  // #region Methods

  /** Polling retains flights; removed identities disappear immediately and appearance edits are live. @public */
  public setCrew(crew: readonly IOrbitCrewMember[], time: number): void {
    const key = JSON.stringify(crew);
    if (key === this._crewKey) return;
    this._crewKey = key;
    this._crew = [...new Map(crew.map((pilot) => [pilot.id, pilot])).values()];
    const pilots = new Map(this._crew.map((pilot) => [pilot.id, pilot]));
    this._remaining = this._remaining.filter((id) => pilots.has(id));
    this._flights = this._flights.filter((flight) => {
      const pilot = pilots.get(flight.pilot.id);
      if (!pilot) {
        this.removeShip(flight.ship);
        return false;
      }
      const changed = this.source(pilot) !== this.source(flight.pilot);
      flight.pilot = pilot;
      if (changed) this.replaceShip(flight);
      return true;
    });
    if (!this._crew.length) this._nextWakeAt = Infinity;
    else if (this._active && !this.flying && !Number.isFinite(this._nextWakeAt))
      this._nextWakeAt = time + 2200 + this._random() * 2600;
  }

  /** Hidden scenes, reduced motion, context loss and scope changes release all finite flights. @public */
  public setActive(active: boolean, time: number): void {
    if (active === this._active) return;
    this._active = active;
    this.clear();
    this._nextWakeAt = active && this._crew.length ? time + 2200 + this._random() * 2600 : Infinity;
  }

  /** Updates native materials without changing flight paths or the user's camera. @public */
  public setPalette(palette: IOrbitPalette): void {
    this._palette = palette;
    for (const flight of this._flights) this.replaceShip(flight);
  }

  /** A wave contains one to three distinct pilots, enters, circles once and leaves the screen. @public */
  public update(
    time: number,
    camera: THREE.PerspectiveCamera,
    target: THREE.Vector3,
    width: number,
    height: number,
  ): readonly IOrbitFlybyLabel[] {
    if (!this._active) return [];
    if (time >= this._nextWakeAt && !this.flying) this.launch(time, camera, target);
    camera.updateMatrixWorld();
    const labels: IOrbitFlybyLabel[] = [];
    this._flights = this._flights.filter((flight) => {
      const progress = (time - flight.started) / flight.duration;
      if (progress >= 1) {
        this.removeShip(flight.ship);
        return false;
      }
      flight.ship.visible = progress >= 0;
      if (progress < 0) return true;
      flight.path.getPointAt(progress, this._position);
      flight.path.getTangentAt(progress, this._tangent);
      flight.ship.position.copy(this._position);
      const local = this._position.clone().applyMatrix4(camera.matrixWorldInverse);
      // The nose follows the world-space trajectory; the cockpit turns toward the viewer.
      // Model and pilot retain their fixed world scale, just like ticket meteors.
      this._tangent.normalize();
      this._front.copy(camera.position).sub(this._position).normalize();
      this._right.crossVectors(this._tangent, this._front);
      if (this._right.lengthSq() < 0.00001)
        this._right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      this._right.normalize();
      this._front.crossVectors(this._right, this._tangent).normalize();
      flight.ship.quaternion.setFromRotationMatrix(
        this._orientation.makeBasis(this._right, this._tangent, this._front),
      );
      flight.ship.updateMatrixWorld(true);
      const clip = this._position.clone().project(camera);
      if (
        local.z < 0 &&
        clip.z >= -1 &&
        clip.z <= 1 &&
        Math.abs(clip.x) < 1.08 &&
        Math.abs(clip.y) < 1.08
      ) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const corner of flight.corners) {
          this._corner.copy(corner).applyMatrix4(flight.ship.matrixWorld).project(camera);
          minX = Math.min(minX, this._corner.x);
          maxX = Math.max(maxX, this._corner.x);
          minY = Math.min(minY, this._corner.y);
          maxY = Math.max(maxY, this._corner.y);
        }
        labels.push({
          id: flight.id,
          pilot: flight.pilot,
          source: this.source(flight.pilot),
          x: ((clip.x + 1) * width) / 2,
          y: ((1 - minY) * height) / 2 + 6,
          size: Math.max(((maxX - minX) * width) / 2, ((maxY - minY) * height) / 2),
        });
      }
      return true;
    });
    if (!this.flying && this._crew.length && !Number.isFinite(this._nextWakeAt))
      this._nextWakeAt = time + 9000 + this._random() * 16000;
    return labels;
  }

  /** Textures belong to the renderer; the fleet releases only its own meshes and materials. @public */
  public dispose(): void {
    this._active = false;
    this._nextWakeAt = Infinity;
    this.clear();
    this._crew = [];
    this._remaining = [];
  }

  /** @private */
  private launch(time: number, camera: THREE.PerspectiveCamera, target: THREE.Vector3): void {
    this._nextWakeAt = Infinity;
    const chance = this._random();
    const count = Math.min(this._crew.length, chance < 0.58 ? 1 : chance < 0.91 ? 2 : 3);
    for (let index = 0; index < count; index++) {
      const used = new Set(this._flights.map((flight) => flight.pilot.id));
      if (!this._remaining.some((id) => !used.has(id)))
        this._remaining = this._crew
          .filter((pilot) => !used.has(pilot.id))
          .map((pilot) => pilot.id);
      const candidates = this._remaining.filter((id) => !used.has(id));
      const id = candidates[Math.floor(this._random() * candidates.length)];
      const pilot = this._crew.find((pilot) => pilot.id === id);
      if (!pilot) continue;
      this._remaining = this._remaining.filter((remaining) => remaining !== id);
      const ship = createOrbitSpaceship(this._palette, this._texture(this.source(pilot)));
      ship.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(ship);
      const inverse = ship.matrixWorld.clone().invert();
      const corners = Array.from({ length: 8 }, (_, corner) =>
        new THREE.Vector3(
          corner & 1 ? bounds.max.x : bounds.min.x,
          corner & 2 ? bounds.max.y : bounds.min.y,
          corner & 4 ? bounds.max.z : bounds.min.z,
        ).applyMatrix4(inverse),
      );
      ship.visible = false;
      this.root.add(ship);
      this._flights.push({
        id: `shuttle-${++this._sequence}`,
        pilot,
        started: time + index * (600 + this._random() * 1400),
        duration: 14000 + this._random() * 5000,
        path: this.path(camera, target),
        corners,
        ship,
      });
    }
  }

  /** Paths are fixed in world space; entry and exit extend beyond the launching camera's viewport. @private */
  private path(camera: THREE.PerspectiveCamera, target: THREE.Vector3): THREE.CatmullRomCurve3 {
    const distance = camera.position.distanceTo(target);
    const height = 2 * distance * Math.tan((camera.fov * Math.PI) / 360);
    const width = height * camera.aspect;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const start = this._random() * Math.PI * 2;
    const sense = this._random() < 0.5 ? -1 : 1;
    const radiusX = width * (0.24 + this._random() * 0.1);
    const radiusY = height * (0.2 + this._random() * 0.08);
    const point = (angle: number): THREE.Vector3 =>
      target
        .clone()
        .addScaledVector(right, Math.cos(angle) * radiusX)
        .addScaledVector(up, Math.sin(angle) * radiusY)
        .addScaledVector(forward, Math.sin(angle * 2) * height * 0.08);
    const tangent = right
      .clone()
      .multiplyScalar(-Math.sin(start) * sense)
      .addScaledVector(up, Math.cos(start) * sense)
      .normalize();
    const extent = Math.max(width, height) * 1.25;
    const points = [point(start).addScaledVector(tangent, -extent)];
    for (let step = 0; step <= 32; step++)
      points.push(point(start + sense * (step / 32) * Math.PI * 2));
    points.push(point(start).addScaledVector(tangent, extent));
    return new THREE.CatmullRomCurve3(points, false, 'centripetal');
  }

  /** @private */
  private source(pilot: IOrbitCrewMember): string {
    return agentFigureSource(pilot.appearance ?? defaultAgentAppearance(pilot.id));
  }

  /** @private */
  private replaceShip(flight: IFlight): void {
    const replacement = createOrbitSpaceship(
      this._palette,
      this._texture(this.source(flight.pilot)),
    );
    replacement.position.copy(flight.ship.position);
    replacement.quaternion.copy(flight.ship.quaternion);
    replacement.scale.copy(flight.ship.scale);
    replacement.visible = flight.ship.visible;
    this.removeShip(flight.ship);
    flight.ship = replacement;
    this.root.add(replacement);
  }

  /** @private */
  private clear(): void {
    for (const flight of this._flights) this.removeShip(flight.ship);
    this._flights = [];
  }

  /** @private */
  private removeShip(ship: THREE.Group): void {
    ship.traverse((part) => {
      if (part instanceof THREE.Mesh || part instanceof THREE.Sprite) {
        if (part instanceof THREE.Mesh) part.geometry.dispose();
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        for (const material of materials) material.dispose();
      }
    });
    this.root.remove(ship);
    ship.clear();
  }

  // #endregion
}
