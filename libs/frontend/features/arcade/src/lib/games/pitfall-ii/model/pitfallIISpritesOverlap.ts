interface IBitmap {
  readonly rows: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly mirrored: boolean;
}

/** Tests overlapping lit TIA sprite pixels, including transparent wings and mirrored poses. @public */
export function pitfallIISpritesOverlap(first: IBitmap, second: IBitmap): boolean {
  const ax = Math.round(first.x);
  const ay = Math.round(first.y);
  const bx = Math.round(second.x);
  const by = Math.round(second.y);
  for (
    let y = Math.max(ay, by);
    y < Math.min(ay + first.rows.length, by + second.rows.length);
    y += 1
  ) {
    const a = first.rows[y - ay] ?? 0;
    const b = second.rows[y - by] ?? 0;
    for (let x = Math.max(ax, bx); x < Math.min(ax + 8, bx + 8); x += 1) {
      const abit = first.mirrored ? x - ax : 7 - x + ax;
      const bbit = second.mirrored ? x - bx : 7 - x + bx;
      if ((a & (1 << abit)) !== 0 && (b & (1 << bbit)) !== 0) return true;
    }
  }
  return false;
}
