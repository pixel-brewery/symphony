// #region Imports

import * as THREE from 'three';
import type { IOrbitPalette } from './IOrbitPalette';

// #endregion

/** Shared rocket with a pointed nose, fins, exhaust and the saved pilot inside a glazed porthole. @public */
export function createOrbitSpaceship(palette: IOrbitPalette, pilot: THREE.Texture): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'Symphony rocket';
  // Fixed scene units, comparable to a few ticket meteors; never compensated for camera zoom.
  ship.scale.setScalar(0.65);
  const pale = new THREE.Color(palette.background);
  const ink = new THREE.Color(palette.foreground);
  const light = pale.r + pale.g + pale.b > ink.r + ink.g + ink.b ? pale : ink;
  const hull = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.33, -1.2),
        new THREE.Vector2(0.47, -0.95),
        new THREE.Vector2(0.58, -0.5),
        new THREE.Vector2(0.6, 0.1),
        new THREE.Vector2(0.57, 0.55),
        new THREE.Vector2(0.47, 0.95),
        new THREE.Vector2(0.4, 1.1),
      ],
      32,
    ),
    new THREE.MeshStandardMaterial({
      color: light.clone().lerp(new THREE.Color(palette.neutral), 0.07),
      metalness: 0.3,
      roughness: 0.32,
    }),
  );
  ship.add(hull);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.85, 32),
    new THREE.MeshStandardMaterial({ color: palette.warning, metalness: 0.25, roughness: 0.3 }),
  );
  nose.position.y = 1.525;
  ship.add(nose);
  const window = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 32),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.foreground).lerp(new THREE.Color(palette.info), 0.28),
    }),
  );
  window.position.set(0, 0.3, 0.61);
  ship.add(window);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.465, 0.065, 10, 40),
    new THREE.MeshStandardMaterial({
      color: palette.info,
      emissive: palette.info,
      emissiveIntensity: 0.18,
      metalness: 0.5,
      roughness: 0.24,
    }),
  );
  rim.position.set(0, 0.3, 0.63);
  ship.add(rim);
  const passenger = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: pilot, transparent: true, alphaTest: 0.02, toneMapped: false }),
  );
  passenger.name = 'Pilot';
  passenger.position.set(0, 0.3, 0.68);
  passenger.scale.set(0.79, 0.79, 1);
  ship.add(passenger);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.43, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: light.clone().lerp(new THREE.Color(palette.info), 0.18),
      transparent: true,
      opacity: 0.14,
      roughness: 0.08,
      metalness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  canopy.rotation.x = Math.PI / 2;
  canopy.scale.y = 0.48;
  canopy.position.set(0, 0.3, 0.64);
  ship.add(canopy);
  const finShape = new THREE.Shape();
  finShape.moveTo(0.42, -0.42);
  finShape.lineTo(0.94, -1.12);
  finShape.lineTo(0.88, -1.5);
  finShape.lineTo(0.42, -1.08);
  finShape.closePath();
  for (let index = 0; index < 4; index++) {
    const fin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(finShape, { depth: 0.13, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: palette.secondary, metalness: 0.2, roughness: 0.3 }),
    );
    fin.geometry.translate(0, 0, -0.065);
    fin.rotation.y = (index * Math.PI) / 2;
    ship.add(fin);
  }
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.535, 0.035, 8, 32),
    new THREE.MeshStandardMaterial({ color: palette.secondary, metalness: 0.3, roughness: 0.3 }),
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = -0.65;
  ship.add(band);
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.4, 0.28, 24),
    new THREE.MeshStandardMaterial({ color: palette.neutral, metalness: 0.65, roughness: 0.25 }),
  );
  nozzle.position.y = -1.27;
  ship.add(nozzle);
  const exhaust = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.95, 24),
    new THREE.MeshBasicMaterial({
      color: palette.warning,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  exhaust.rotation.z = Math.PI;
  exhaust.position.y = -1.87;
  ship.add(exhaust);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.62, 24),
    new THREE.MeshBasicMaterial({
      color: light.clone().lerp(new THREE.Color(palette.warning), 0.2),
    }),
  );
  flame.rotation.z = Math.PI;
  flame.position.y = -1.72;
  ship.add(flame);
  return ship;
}
