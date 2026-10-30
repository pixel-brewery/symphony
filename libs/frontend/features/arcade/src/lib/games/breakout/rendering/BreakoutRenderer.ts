// #region Imports

import { readArcadePalette } from '../../shared/rendering/readArcadePalette';
import { BreakoutVariations } from '../model/BreakoutVariations';
import type { IBreakoutSnapshot } from '../model/IBreakoutSnapshot';
import { BreakoutPixelFont } from './BreakoutPixelFont';

// #endregion

/** Full-area Atari-style raster presentation using only the active public Mosaik tones. @public */
export class BreakoutRenderer {
  // #region Fields

  private _buffer: HTMLCanvasElement | null = null;
  private _context: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /**
   * Draws six eighteen-brick rows, paddles, a ball and the original counter arrangement.
   * @param context - The visible canvas context.
   * @param snapshot - The model's logical 160 × 192 match state.
   * @param canvas - The visible canvas inheriting the application theme.
   * @param mode - Intro suppresses the game counters behind the owning menu.
   * @public
   */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: IBreakoutSnapshot,
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
    bitmap.fillStyle = palette.background;
    bitmap.fillRect(0, 0, 160, 192);
    bitmap.fillStyle = palette.lowlight;
    bitmap.fillRect(1, 18, 3, 174);
    bitmap.fillRect(156, 18, 3, 174);
    bitmap.fillRect(4, 18, 152, 2);
    const displayTeam =
      snapshot.status === 'gameOver' && snapshot.teams.length === 2
        ? Math.floor(snapshot.frame / 60) % 2
        : snapshot.currentTeamIndex;
    const team = snapshot.teams[displayTeam];
    const shades = [
      palette.foreground,
      palette.foreground,
      palette.lowlight,
      palette.lowlight,
      palette.middlelight,
      palette.middlelight,
    ];
    if (snapshot.wallVisible || mode === 'intro') {
      for (const brick of snapshot.bricks) {
        if (!(team?.brickMask[brick.id] ?? brick.alive)) continue;
        bitmap.fillStyle = shades[brick.row] ?? palette.foreground;
        bitmap.fillRect(brick.x, brick.y, brick.width, brick.height);
      }
    }
    if (snapshot.status !== 'gameOver') {
      for (const [index, paddle] of snapshot.paddles.entries()) {
        bitmap.fillStyle = index === 0 ? palette.foreground : palette.lowlight;
        bitmap.fillRect(Math.round(paddle.x), paddle.y, Math.round(paddle.width), paddle.height);
      }
      bitmap.fillStyle = palette.foreground;
      bitmap.fillRect(
        Math.round(snapshot.ball.x - snapshot.ball.radius),
        Math.round(snapshot.ball.y - snapshot.ball.radius),
        2,
        2,
      );
    }
    if (mode === 'game') {
      bitmap.fillStyle = palette.foreground;
      const variation = BreakoutVariations[snapshot.options.variation - 1] ?? BreakoutVariations[0];
      const seconds = Math.floor(team?.elapsedSeconds ?? 0);
      const primary = variation.timed
        ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
        : String(team?.score ?? 0).padStart(3, '0');
      this.drawNumber(bitmap, primary, 9, 5);
      this.drawNumber(bitmap, String(team?.ballsRemaining ?? 5), 78, 5);
      this.drawNumber(bitmap, String(displayTeam + 1), 143, 5);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  private drawNumber(context: CanvasRenderingContext2D, value: string, x: number, y: number): void {
    let cursor = x;
    for (const character of value) {
      const rows = BreakoutPixelFont[character] ?? [];
      for (const [row, pixels] of rows.entries()) {
        for (let column = 0; column < pixels.length; column++) {
          if (pixels[column] === '1') context.fillRect(cursor + column, y + row, 1, 1);
        }
      }
      cursor += (rows[0]?.length ?? 5) + 2;
    }
  }

  // #endregion
}
