// #region Imports

import type { ISeaquestSnapshot } from '../model/ISeaquestSnapshot';
import { SeaquestSpritePatterns } from './SeaquestSpritePatterns';
import { readArcadePalette } from '../../shared/rendering/readArcadePalette';
import { ArcadePixelFont } from '../../shared/rendering/ArcadePixelFont';

// #endregion

const WIDTH = 160;
const HEIGHT = 210;

/** Cartridge-sized pixel composition mapped only onto public Mosaik scheme tones. @public */
export class SeaquestRenderer {
  // #region Fields

  private _buffer: HTMLCanvasElement | undefined;
  private _context: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /** Draws the original single-screen sea, score, reserves, oxygen and rescued divers. @public */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: ISeaquestSnapshot,
    canvas: HTMLCanvasElement,
    mode: 'game' | 'intro' = 'game',
  ): void {
    if (!this._buffer) {
      this._buffer = canvas.ownerDocument.createElement('canvas');
      this._buffer.width = WIDTH;
      this._buffer.height = HEIGHT;
      this._context = this._buffer.getContext('2d');
    }
    const bitmap = this._context;
    if (!bitmap) return;
    const colors = readArcadePalette(canvas);
    bitmap.setTransform(1, 0, 0, 1, 0, 0);
    bitmap.fillStyle = colors.surface;
    bitmap.fillRect(0, 0, WIDTH, HEIGHT);
    bitmap.fillStyle = colors.lowlight;
    bitmap.fillRect(0, 48, WIDTH, 116);
    const sky = [
      colors.background,
      colors.lowlight,
      colors.middlelight,
      colors.highlight,
      colors.surface,
    ];
    sky.forEach((color, index) => {
      bitmap.fillStyle = color;
      bitmap.fillRect(0, 33 + index * 2, WIDTH, 2);
    });
    for (let line = 0; line < 5; line++) {
      bitmap.fillStyle = (snapshot.frame + line) % 5 < 2 ? colors.middlelight : colors.lowlight;
      bitmap.fillRect(0, 43 + line, WIDTH, 1);
    }
    bitmap.fillStyle = colors.middlelight;
    bitmap.fillRect(0, 164, WIDTH, 4);
    bitmap.fillStyle = colors.background;
    bitmap.fillRect(0, 168, WIDTH, 42);
    for (let x = 0; x < WIDTH; x += 8)
      this.sprite(bitmap, SeaquestSpritePatterns.reef, x, 165, colors.surface);
    for (const row of snapshot.rows) {
      const phase = (snapshot.frame >> 2) & 15;
      const floating = 7 - (phase < 8 ? phase : 15 - phase);
      const pattern =
        row.kind === 'sub'
          ? SeaquestSpritePatterns.player[snapshot.player.animation]!
          : SeaquestSpritePatterns.shark[2 - (Math.floor(snapshot.frame / 8) % 3)]!;
      for (const x of row.positions)
        this.sprite(
          bitmap,
          pattern,
          x,
          30 + row.y + (row.kind === 'shark' ? floating : 0),
          row.kind === 'sub'
            ? colors.foreground
            : row.lane % 2 === 0
              ? colors.middlelight
              : colors.highlight,
          1,
          row.direction,
        );
      if (row.diver !== null && row.kind === 'shark')
        this.sprite(
          bitmap,
          (row.direction === 1
            ? SeaquestSpritePatterns.diverRight
            : SeaquestSpritePatterns.diverLeft)[Math.floor(snapshot.frame / 8) % 3]!,
          row.diver,
          30 + row.y,
          colors.foreground,
        );
      if (row.torpedo !== null) {
        bitmap.fillStyle = colors.foreground;
        bitmap.fillRect(Math.round(row.torpedo), row.y + 37, 4, 2);
      }
    }
    if (snapshot.patrol.active)
      this.sprite(
        bitmap,
        SeaquestSpritePatterns.player[snapshot.player.animation]!,
        snapshot.patrol.x,
        43,
        colors.foreground,
        1,
        -1,
      );
    if (snapshot.torpedo) {
      bitmap.fillStyle = colors.highlight;
      bitmap.fillRect(Math.round(snapshot.torpedo.x), snapshot.torpedo.y + 30, 8, 2);
    }
    if (snapshot.status !== 'gameOver') {
      const dying = snapshot.player.deathFrame > 0;
      const pattern =
        dying && snapshot.player.deathFrame < 60
          ? SeaquestSpritePatterns.explosion[
              Math.min(2, Math.floor((60 - snapshot.player.deathFrame) / 20))
            ]!
          : SeaquestSpritePatterns.player[snapshot.player.animation]!;
      this.sprite(
        bitmap,
        pattern,
        snapshot.player.x,
        snapshot.player.y + 30,
        dying && snapshot.frame % 8 < 4 ? colors.foreground : colors.highlight,
        2,
        snapshot.player.facing,
      );
    }
    if (mode === 'game') {
      this.digits(bitmap, snapshot.score, 56, 7, colors.foreground);
      for (let i = 0; i < snapshot.reserves; i++)
        this.sprite(bitmap, SeaquestSpritePatterns.reserve, 47 + i * 11, 21, colors.foreground);
      SeaquestSpritePatterns.oxygen.forEach((rows, index) =>
        this.sprite(bitmap, rows, 10 + index * 8, 178, colors.foreground),
      );
      bitmap.fillStyle = colors.surface;
      bitmap.fillRect(48, 178, 64, 5);
      const warning = snapshot.oxygen < 17 && snapshot.frame % 8 < 4;
      bitmap.fillStyle = warning ? colors.middlelight : colors.foreground;
      bitmap.fillRect(48, 178, snapshot.oxygen, 5);
      for (let i = 0; i < 6; i++)
        this.sprite(
          bitmap,
          SeaquestSpritePatterns.rescued,
          46 + i * 12,
          187,
          i < snapshot.divers ? colors.foreground : colors.lowlight,
        );
      if (snapshot.options.players === 2)
        this.text(bitmap, `P${snapshot.currentPlayer}`, 124, 8, colors.foreground);
      if (snapshot.status === 'paused' || snapshot.status === 'ready')
        this.text(
          bitmap,
          snapshot.status === 'paused' ? 'PAUSED' : 'DIVE',
          63,
          156,
          colors.foreground,
        );
    }
    if (mode === 'intro' || snapshot.status === 'completed' || snapshot.status === 'gameOver')
      SeaquestSpritePatterns.copyright.forEach((rows, index) =>
        this.sprite(bitmap, rows, 56 + index * 8, 200, colors.middlelight),
      );
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  private sprite(
    context: CanvasRenderingContext2D,
    rows: readonly number[],
    x: number,
    y: number,
    color: string,
    scale = 1,
    direction = 1,
  ): void {
    context.fillStyle = color;
    rows.forEach((row, line) => {
      for (let bit = 0; bit < 8; bit++)
        if (row & (128 >> bit))
          context.fillRect(
            Math.round(x) + (direction === -1 ? 7 - bit : bit) * scale,
            y + line,
            scale,
            1,
          );
    });
  }

  private digits(
    context: CanvasRenderingContext2D,
    score: number,
    x: number,
    y: number,
    color: string,
  ): void {
    const digits = String(score);
    for (let i = 0; i < digits.length; i++)
      this.sprite(
        context,
        SeaquestSpritePatterns.digits[Number(digits[i])]!,
        x + (6 - digits.length + i) * 8,
        y,
        color,
      );
  }

  private text(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
  ): void {
    context.fillStyle = color;
    for (const [index, character] of [...text].entries()) {
      const glyph = ArcadePixelFont[character];
      if (!glyph) continue;
      glyph.forEach((row, line) => {
        for (let bit = 0; bit < row.length; bit++)
          if (row[bit] === '1') context.fillRect(x + index * 6 + bit, y + line, 1, 1);
      });
    }
  }

  // #endregion
}
