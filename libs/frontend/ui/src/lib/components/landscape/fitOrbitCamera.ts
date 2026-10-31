// #region Imports

import type { IOrbitCamera } from './IOrbitCamera';
import type { IOrbitScene } from './IOrbitScene';

// #endregion

/** Fits every retained world body and tilted orbit inside responsive label margins. @public */
export function fitOrbitCamera(scene: IOrbitScene, width: number, height: number): IOrbitCamera {
  const points = scene.nodes
    .map((node) => ({
      ...node.position,
      radius:
        (node.kind === 'production'
          ? 3.6
          : node.kind === 'target'
            ? 1.3
            : node.kind === 'group'
              ? 1.2
              : 0.4) * (node.celestialBody === 'saturn' ? 2.32 : 1),
    }))
    .filter(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z),
    );
  const sun = scene.nodes.find((node) => node.kind === 'production');
  points.push({
    x: sun?.position.x ?? 0,
    y: sun?.position.y ?? 0,
    z: sun?.position.z ?? 0,
    radius: 3.6,
  });
  for (const ring of scene.rings) {
    if (!Number.isFinite(ring.radius) || ring.radius <= 0) continue;
    for (let index = 0; index < 96; index += 1) {
      const angle = (index / 96) * Math.PI * 2;
      const x = Math.cos(angle) * ring.radius;
      const z = Math.sin(angle) * ring.radius;
      const y = -z * Math.sin(ring.tilt);
      const tiltedZ = z * Math.cos(ring.tilt);
      points.push({
        x: x * Math.cos(ring.rotation) + tiltedZ * Math.sin(ring.rotation),
        y,
        z: -x * Math.sin(ring.rotation) + tiltedZ * Math.cos(ring.rotation),
        radius: 0.1,
      });
    }
  }
  const target = sun ? { ...sun.position } : { x: 0, y: 0, z: 0 };
  const safeWidth = Math.max(160, Number.isFinite(width) ? width : 320);
  const safeHeight = Math.max(160, Number.isFinite(height) ? height : 480);
  // A steep view from above keeps the work-item belt a near circle around the destination, as the
  // orbit diagram draws it, while the bodies and destination orbits keep their depth.
  const direction = { x: 0, y: 0.94, z: 0.34 };
  const length = Math.hypot(direction.x, direction.y, direction.z);
  const forward = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
  const horizontalLength = Math.hypot(forward.x, forward.z);
  const right = { x: forward.z / horizontalLength, y: 0, z: -forward.x / horizontalLength };
  const up = {
    x: forward.y * right.z,
    y: forward.z * right.x - forward.x * right.z,
    z: -forward.y * right.x,
  };
  const marginX = Math.min(72, safeWidth * 0.16);
  const marginY = Math.min(76, safeHeight * 0.17);
  const tangentV = Math.tan((46 * Math.PI) / 360);
  const tangentX = (tangentV * (safeWidth - 2 * marginX)) / safeHeight;
  const tangentY = (tangentV * (safeHeight - 2 * marginY)) / safeHeight;
  let distance = 10;
  for (const point of points) {
    const x = point.x - target.x;
    const y = point.y - target.y;
    const z = point.z - target.z;
    const horizontal = x * right.x + y * right.y + z * right.z;
    const vertical = x * up.x + y * up.y + z * up.z;
    const depth = x * forward.x + y * forward.y + z * forward.z;
    distance = Math.max(
      distance,
      depth + point.radius + (Math.abs(horizontal) + point.radius) / tangentX,
      depth + point.radius + (Math.abs(vertical) + point.radius) / tangentY,
    );
  }
  return {
    target,
    position: {
      x: target.x + (direction.x / length) * distance,
      y: target.y + (direction.y / length) * distance,
      z: target.z + (direction.z / length) * distance,
    },
  };
}
