// #region Imports

import { readArcadePalette } from '../../shared/rendering/readArcadePalette';
import type { IPongSnapshot } from '../model/IPongSnapshot';
import { PongRules } from '../model/PongRules';

// #endregion

// The original 7448 decoder omits the top of 6 and the bottom of 9.
const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7c, 0x07, 0x7f, 0x67] as const;
const SEGMENTS = [
  [0, 0, 16, 4],
  [12, 0, 4, 16],
  [12, 16, 4, 16],
  [0, 28, 16, 4],
  [0, 16, 4, 16],
  [0, 0, 4, 16],
  [0, 12, 16, 4],
] as const;

/** Original monochrome Pong raster expressed through live Symphony scheme tones across the full inner pane. @public */
export class PongRenderer {
  // #region Fields

  private _buffer: HTMLCanvasElement | undefined;
  private _bitmap: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /** Draws the circuit's net, unadorned paddles, square ball and dimmer seven-segment scores. @public */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: IPongSnapshot,
    canvas: HTMLCanvasElement,
  ): void {
    if (!this._buffer) {
      this._buffer = canvas.ownerDocument.createElement('canvas');
      this._buffer.width = PongRules.width;
      this._buffer.height = PongRules.height;
      this._bitmap = this._buffer.getContext('2d');
    }
    const bitmap = this._bitmap;
    if (!bitmap) return;
    const palette = readArcadePalette(canvas);
    bitmap.fillStyle = palette.background;
    bitmap.fillRect(0, 0, PongRules.width, PongRules.height);
    bitmap.fillStyle = palette.foreground;
    for (let y = 0; y < PongRules.height; y += 8)
      bitmap.fillRect(PongRules.netX, y, 1, Math.min(4, PongRules.height - y));
    if (snapshot.status !== 'attract' && snapshot.status !== 'gameOver')
      for (const [index, top] of snapshot.paddles.entries())
        bitmap.fillRect(
          PongRules.paddleX[index]!,
          top,
          PongRules.paddleWidth,
          PongRules.paddleHeight,
        );
    if (snapshot.ball.visible)
      bitmap.fillRect(
        Math.round(snapshot.ball.x),
        Math.round(snapshot.ball.y),
        PongRules.ballSize,
        PongRules.ballSize,
      );
    bitmap.fillStyle = palette.lowlight;
    for (const player of [0, 1] as const) {
      const score = snapshot.scores[player];
      const x = player === 0 ? 63 : 255;
      if (score >= 10) this.digit(bitmap, 1, x, 16);
      this.digit(bitmap, score % 10, x + 32, 16);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  private digit(context: CanvasRenderingContext2D, value: number, x: number, y: number): void {
    const mask = DIGITS[value]!;
    for (const [index, segment] of SEGMENTS.entries())
      if ((mask & (1 << index)) !== 0)
        context.fillRect(x + segment[0], y + segment[1], segment[2], segment[3]);
  }

  // #endregion
}
