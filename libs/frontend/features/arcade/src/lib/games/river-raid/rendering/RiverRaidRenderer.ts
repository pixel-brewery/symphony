// #region Imports

import type { IRiverRaidSnapshot } from '../model/IRiverRaidSnapshot';
import { RiverRaidSpritePatterns } from '../model/RiverRaidSpritePatterns';
import { riverRaidActorRows } from '../model/riverRaidActorRows';
import { readArcadePalette } from '../../shared/rendering/readArcadePalette';
import type { IArcadePalette } from '../../shared/rendering/IArcadePalette';

// #endregion

/** Original 160-pixel river, sprite bitmaps and score panel using the six public Mosaik tones. @public */
export class RiverRaidRenderer {
  // #region Fields

  private _buffer: HTMLCanvasElement | undefined;
  private _context: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /** Expands one native-resolution bitmap to the entire pane without texture interpolation. @public */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: IRiverRaidSnapshot,
    canvas: HTMLCanvasElement,
    mode: 'game' | 'intro' = 'game',
  ): void {
    if (!this._buffer) {
      this._buffer = canvas.ownerDocument.createElement('canvas');
      this._buffer.width = 160;
      this._buffer.height = 192;
      this._context = this._buffer.getContext('2d');
    }
    const bitmap = this._context;
    if (!bitmap) return;
    const palette = readArcadePalette(canvas);
    bitmap.setTransform(1, 0, 0, 1, 0, 0);
    bitmap.fillStyle = snapshot.flash % 2 ? palette.highlight : palette.background;
    bitmap.fillRect(0, 0, 160, 192);
    bitmap.save();
    bitmap.beginPath();
    bitmap.rect(0, 0, 160, 160);
    bitmap.clip();
    for (const block of snapshot.blocks) {
      for (let line = 0; line < 32; line++) {
        const y = 159 - (block.id * 32 + line - snapshot.bottom);
        if (y < 0 || y >= 160) continue;
        bitmap.fillStyle = block.level % 2 ? palette.lowlight : palette.middlelight;
        if (block.road && line < 26)
          bitmap.fillStyle = line === 12 || line === 13 ? palette.foreground : palette.highlight;
        for (let column = 0; column < 20; column++) {
          if ((block.rows[line]! & (1 << column)) === 0) continue;
          bitmap.fillRect(column * 4, y, 4, 1);
          bitmap.fillRect(156 - column * 4, y, 4, 1);
        }
      }
    }
    for (const actor of snapshot.actors) {
      const rows = riverRaidActorRows(actor, snapshot.frame);
      this.sprite(
        bitmap,
        rows,
        actor.x,
        159 - (actor.y - snapshot.bottom),
        actor.scale,
        actor.direction === -1 && actor.kind !== 'fuel',
        actor.destroyed
          ? palette.foreground
          : actor.kind === 'fuel'
            ? palette.surface
            : actor.kind === 'house'
              ? palette.highlight
              : palette.foreground,
        actor.kind === 'fuel' ? palette.foreground : undefined,
      );
    }
    if (snapshot.missile) {
      bitmap.fillStyle = palette.foreground;
      bitmap.fillRect(snapshot.missile.x, 159 - (snapshot.missile.y - snapshot.bottom), 1, 8);
    }
    if (snapshot.status !== 'ended')
      this.sprite(
        bitmap,
        snapshot.status === 'crashed'
          ? RiverRaidSpritePatterns.JetExplode
          : snapshot.bank
            ? RiverRaidSpritePatterns.JetMove
            : RiverRaidSpritePatterns.JetStraight,
        snapshot.x + (snapshot.bank < 0 ? 1 : 0),
        141,
        1,
        snapshot.bank < 0,
        palette.foreground,
      );
    bitmap.restore();
    this.panel(bitmap, snapshot, palette, mode);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  private sprite(
    context: CanvasRenderingContext2D,
    rows: readonly number[],
    x: number,
    y: number,
    scale: number,
    reflect: boolean,
    color: string,
    alternate?: string,
  ): void {
    for (let row = 0; row < rows.length; row++) {
      context.fillStyle = alternate && Math.floor(row / 7) % 2 ? alternate : color;
      for (let column = 0; column < 8; column++)
        if (rows[row]! & (128 >> column))
          context.fillRect(
            Math.round(x) + (reflect ? 7 - column : column) * scale,
            Math.round(y) + row,
            scale,
            1,
          );
    }
  }

  private panel(
    context: CanvasRenderingContext2D,
    snapshot: IRiverRaidSnapshot,
    palette: IArcadePalette,
    mode: 'game' | 'intro',
  ): void {
    context.fillStyle = palette.surface;
    context.fillRect(0, 160, 160, 32);
    if (mode === 'intro') return;
    const score = snapshot.score >= 1000000 ? '!!!!!!' : String(snapshot.score);
    for (let index = 0; index < score.length; index++) {
      const rows =
        score[index] === '!'
          ? [24, 24, 24, 24, 24, 0, 24, 24]
          : RiverRaidSpritePatterns.digits[Number(score[index])]!;
      this.sprite(
        context,
        rows,
        112 - score.length * 8 + index * 8,
        163,
        1,
        false,
        palette.foreground,
      );
    }
    if (snapshot.reserves > 0)
      this.sprite(
        context,
        RiverRaidSpritePatterns.digits[snapshot.reserves]!,
        43,
        163,
        1,
        false,
        palette.foreground,
      );
    // The cartridge places the E/F gauge beneath the score with a 32-position needle.
    context.fillStyle = palette.foreground;
    context.fillRect(62, 176, 38, 1);
    context.fillRect(62, 181, 38, 1);
    for (let x = 62; x <= 100; x += 19) context.fillRect(x, 176, 1, 6);
    context.fillRect(65 + Math.floor(snapshot.fuel * 32), 177, 1, 4);
    this.sprite(context, [0xf0, 0x80, 0xe0, 0x80, 0xf0], 54, 177, 1, false, palette.foreground);
    this.sprite(context, [0xf0, 0x80, 0xe0, 0x80, 0x80], 104, 177, 1, false, palette.foreground);
    // Small player identifier remains legible in either application scheme.
    this.sprite(
      context,
      RiverRaidSpritePatterns.digits[snapshot.player]!,
      43,
      183,
      1,
      false,
      palette.foreground,
    );
    context.fillStyle = palette.lowlight;
    context.fillRect(62, 187, 38, 1);
  }

  // #endregion
}
