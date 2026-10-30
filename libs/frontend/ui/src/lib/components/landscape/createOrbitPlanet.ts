// #region Imports

import * as THREE from 'three';
import type { OrbitCelestialBody } from '@symphony/domain-delivery';

// #endregion

/** A textured Solar System planet. The caller owns shared texture lifetime. @public */
export function createOrbitPlanet(
  body: Exclude<OrbitCelestialBody, 'sun'>,
  radius: number,
  surface: THREE.Texture,
  rings?: THREE.Texture,
): THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> {
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.MeshStandardMaterial({
      map: surface,
      roughness: body === 'earth' ? 0.68 : 0.94,
      metalness: 0,
    }),
  );
  // This is a navigable work landscape, so comparable body sizes preserve ticket visibility.
  // Axial tilts and Saturn's rings retain the recognisable identity of each planet.
  const tilts = {
    mercury: 0,
    venus: 0.046,
    earth: 0.409,
    mars: 0.439,
    jupiter: 0.054,
    saturn: 0.466,
    uranus: 1.706,
    neptune: 0.494,
  };
  planet.rotation.set(0, body === 'earth' ? 2.8 : 0.4, tilts[body]);
  planet.userData['celestialBody'] = body;
  if (body === 'saturn' && rings) {
    const inner = radius * 1.23;
    const outer = radius * 2.32;
    const geometry = new THREE.RingGeometry(inner, outer, 160);
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let index = 0; index < position.count; index += 1) {
      uv.setXY(
        index,
        (Math.hypot(position.getX(index), position.getY(index)) - inner) / (outer - inner),
        0.5,
      );
    }
    const ring = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: rings,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 1,
        depthWrite: false,
        alphaTest: 0.03,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    planet.add(ring);
  }
  return planet;
}
