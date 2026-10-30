// #region Imports

import type { IOrbitLabel } from './IOrbitLabel';
import type { IOrbitProjectedNode } from './IOrbitProjectedNode';

// #endregion

/** Places a bounded set of stable object labels without covering other labels or bodies. @public */
export function projectOrbitLabels(
  points: readonly IOrbitProjectedNode[],
  width: number,
  height: number,
  zoom: 'system' | 'groups' | 'tickets',
  selectedId?: string,
  pinnedId?: string,
): readonly IOrbitLabel[] {
  const priority = (point: IOrbitProjectedNode): number =>
    point.node.id === pinnedId
      ? 0
      : point.node.id === selectedId
        ? 1
        : point.node.kind === 'production'
          ? 3
          : point.node.kind === 'target'
            ? 10
            : point.node.kind === 'group'
              ? 15
              : 30;
  const candidates = points
    .filter((point) => {
      if (point.node.id === selectedId || point.node.id === pinnedId) return true;
      if (point.node.kind === 'ticket') return zoom !== 'system';
      return true;
    })
    .sort(
      (a, b) =>
        priority(a) - priority(b) || a.depth - b.depth || a.node.id.localeCompare(b.node.id),
    );
  const labels: IOrbitLabel[] = [];
  const limit = zoom === 'system' ? 10 : zoom === 'groups' ? 14 : 18;
  const margin = 12;
  for (const point of candidates) {
    if (labels.length >= limit) break;
    const labelWidth = Math.min(
      point.node.kind === 'group' ? 88 : point.node.kind === 'ticket' ? 140 : 144,
      width - 2 * margin,
    );
    const labelHeight =
      point.node.kind === 'production' || point.node.kind === 'target'
        ? 64
        : point.node.kind === 'group'
          ? 44
          : 50;
    const offset = Math.max(10, point.radius) + 8;
    const slots = [
      [-labelWidth / 2, offset],
      [-labelWidth / 2, -labelHeight - offset],
      [offset, -labelHeight / 2],
      [-labelWidth - offset, -labelHeight / 2],
    ];
    for (const slot of slots) {
      const offsetX = slot[0] ?? 0;
      const offsetY = slot[1] ?? 0;
      const x = point.x + offsetX;
      const y = point.y + offsetY;
      if (
        x < margin ||
        y < margin ||
        x + labelWidth > width - margin ||
        y + labelHeight > height - margin
      )
        continue;
      if (
        labels.some(
          (label) =>
            x < label.x + label.width + 6 &&
            x + labelWidth + 6 > label.x &&
            y < label.y + label.height + 6 &&
            y + labelHeight + 6 > label.y,
        )
      )
        continue;
      const coversBody = points.some(
        (body) =>
          body.node.id !== point.node.id &&
          body.node.kind !== 'ticket' &&
          body.radius > 3 &&
          x < body.x + body.radius &&
          x + labelWidth > body.x - body.radius &&
          y < body.y + body.radius &&
          y + labelHeight > body.y - body.radius,
      );
      if (coversBody) continue;
      labels.push({
        node: point.node,
        x,
        y,
        width: labelWidth,
        height: labelHeight,
        anchorX: point.x,
        anchorY: point.y,
      });
      break;
    }
  }
  return labels;
}
