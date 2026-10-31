/** Samples the original A6 wiring: contact supplies C/D, but the opposite paddle supplies B. @public */
export function getPongRebound(contactCounter: number, oppositeCounter: number): number {
  const own = Math.max(0, Math.min(15, Math.floor(contactCounter)));
  const other = Math.max(0, Math.min(15, Math.floor(oppositeCounter)));
  const region = ((own >> 1) & 6) | ((other >> 1) & 1);
  return [-3, -2, -1, 0, 0, 1, 2, 3][region]!;
}
