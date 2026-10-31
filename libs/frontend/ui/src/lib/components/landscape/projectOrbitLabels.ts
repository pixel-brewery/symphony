// #region Imports

import type { IOrbitLabel } from './IOrbitLabel';
import type { IOrbitNode } from './IOrbitNode';
import type { IOrbitProjectedNode } from './IOrbitProjectedNode';

// #endregion

type Slot = readonly [x: number, y: number, align: 'start' | 'center' | 'end'];

/**
 * Places stable object labels without covering other labels or bodies. Bodies and clusters are few
 * and labelled whenever there is room; only ticket labels share a zoom-dependent budget. A cluster
 * label sits on the outer side of its cluster, facing away from the destination at the centre.
 *
 * @public
 */
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
  const centre = points.find((point) => point.node.kind === 'production') ?? {
    x: width / 2,
    y: height / 2,
  };
  const labels: IOrbitLabel[] = [];
  const ticketLimit = zoom === 'system' ? 10 : zoom === 'groups' ? 14 : 18;
  let tickets = 0;
  const margin = 12;
  for (const point of candidates) {
    if (point.node.kind === 'ticket' && tickets >= ticketLimit) continue;
    const labelWidth = Math.min(labelWidthOf(point.node), width - 2 * margin);
    const labelHeight =
      point.node.kind === 'group'
        ? 24
        : point.node.kind === 'production' || point.node.kind === 'target'
          ? 52
          : 50;
    const slots =
      point.node.kind === 'group'
        ? clusterSlots(point, centre, labelWidth, labelHeight)
        : bodySlots(Math.max(10, point.radius) + 8, labelWidth, labelHeight);
    for (const [offsetX, offsetY, align] of slots) {
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
          body.node.kind !== 'group' &&
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
        align,
      });
      if (point.node.kind === 'ticket') tickets += 1;
      break;
    }
  }
  return labels;
}

/** Room for the label text; a cluster reserves its `Label · count` badge and its icon. */
function labelWidthOf(node: IOrbitNode): number {
  switch (node.kind) {
    case 'group':
      return Math.min(
        240,
        26 + `${node.label} · ${node.count ?? 0}`.length * 7 + (node.tone === 'danger' ? 18 : 0),
      );
    case 'production':
      return 200;
    case 'target':
      return 168;
    case 'ticket':
      return 140;
  }
}

/** Below, above, right and left of a body, in that order of preference. */
function bodySlots(offset: number, labelWidth: number, labelHeight: number): readonly Slot[] {
  return [
    [-labelWidth / 2, offset, 'center'],
    [-labelWidth / 2, -labelHeight - offset, 'center'],
    [offset, -labelHeight / 2, 'start'],
    [-labelWidth - offset, -labelHeight / 2, 'end'],
  ];
}

/** The four sides of a cluster anchor, the side facing away from the centre first. */
function clusterSlots(
  point: IOrbitProjectedNode,
  centre: { readonly x: number; readonly y: number },
  labelWidth: number,
  labelHeight: number,
): readonly Slot[] {
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  const offset = 4;
  const sides: readonly (readonly [Slot, number])[] = [
    [[offset, -labelHeight / 2, 'start'], dx],
    [[-labelWidth - offset, -labelHeight / 2, 'end'], -dx],
    [[-labelWidth / 2, offset, 'center'], dy],
    [[-labelWidth / 2, -labelHeight - offset, 'center'], -dy],
  ];
  return sides.toSorted((a, b) => b[1] - a[1]).map(([slot]) => slot);
}
