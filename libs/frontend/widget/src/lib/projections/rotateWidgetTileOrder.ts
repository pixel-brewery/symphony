/**
 * Exchanges two non-hovered entries in a category's fixed mosaic order.
 *
 * The first ten entries are visible. A visible entry may exchange with an overflow entry so every
 * category projection eventually reaches the fixed surface. Hovered visible slots remain stable.
 *
 * @param order - Tile identifiers in their current presentation order.
 * @param hoveredSlots - Visible slot indexes protected from automatic changes.
 * @param random - Random source, injectable for deterministic tests.
 * @returns The original order when fewer than two entries can move, otherwise a swapped copy.
 * @public
 */
export function rotateWidgetTileOrder(
  order: readonly string[],
  hoveredSlots: ReadonlySet<number>,
  random: () => number = Math.random,
): readonly string[] {
  const visibleCount = Math.min(order.length, 10);
  const visibleCandidates = [...Array(visibleCount).keys()].filter(
    (index) => !hoveredSlots.has(index),
  );
  if (!visibleCandidates.length || order.length < 2) return order;

  const first = pick(visibleCandidates, random());
  const exchangeCandidates = [...Array(order.length).keys()].filter(
    (index) => index !== first && (index >= visibleCount || !hoveredSlots.has(index)),
  );
  if (!exchangeCandidates.length) return order;

  const second = pick(exchangeCandidates, random());
  const rotated = [...order];
  [rotated[first], rotated[second]] = [rotated[second]!, rotated[first]!];
  return rotated;
}

function pick(values: readonly number[], random: number): number {
  const normalized = Number.isFinite(random) ? Math.max(0, Math.min(random, 0.999999999)) : 0;
  return values[Math.floor(normalized * values.length)]!;
}
