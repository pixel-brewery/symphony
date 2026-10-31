// #region Imports

import type { IPitfallSnapshot } from '../model/IPitfallSnapshot';
import { PitfallSpritePatterns } from '../model/PitfallSpritePatterns';
import { PitfallSoundSequences } from '../audio/PitfallSoundSequences';
import { applyPitfallIdlePalette } from './applyPitfallIdlePalette';
import type { IArcadePalette } from '../../shared/rendering/IArcadePalette';
import { PitfallCopyrightPattern } from './PitfallCopyrightPattern';
import { PITFALL_PIXEL_FONT } from './PitfallPixelFont';
import { readArcadePalette } from '../../shared/rendering/readArcadePalette';

// #endregion

const WORLD_WIDTH = 160;
const WORLD_HEIGHT = 192;
const LEAVES = [
  [255, 207, 131, 1],
  [127, 61, 24, 0],
  [255, 254, 188, 24],
  [254, 252, 120, 48],
] as const;
const BRANCH = [153, 153, 153, 153, 153, 153, 219, 126, 24] as const;
const PIT_INSETS = [0, 4, 8, 16, 28, 32] as const;
const WALL = Array.from({ length: 31 }, (_, row) =>
  row % 4 === 3 ? 254 : Math.floor(row / 4) % 2 === 0 ? 238 : 186,
);

/**
 * Reconstructs the original scanline bands, playfield masks and eight-bit sprites.
 * Only the six public Mosaik scheme colors replace the original Atari palette.
 *
 * @public
 */
export class PitfallRenderer {
  // #region Fields

  private _buffer: HTMLCanvasElement | null = null;
  private _context: CanvasRenderingContext2D | null = null;
  private _footerCounter = 255;
  private _previousDisplayFrame = 0;
  private _previousDeathFrames = 0;
  private _previousStatus: IPitfallSnapshot['status'] | null = null;
  private _lastSoundEventId = 0;
  private _soundUntilDisplayFrame = 0;

  // #endregion

  // #region Methods

  /**
   * Draws the complete original scene stretched to the available application surface.
   *
   * @param context - The visible canvas context, already sized by the owning view.
   * @param snapshot - The simulation's original-coordinate read model.
   * @param canvas - The visible canvas inheriting the current application theme.
   * @param mode - Intro omits the score for the owning start menu.
   * @public
   */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    canvas: HTMLCanvasElement,
    mode: 'game' | 'intro' = 'game',
  ): void {
    if (!this._buffer) {
      this._buffer = canvas.ownerDocument.createElement('canvas');
      this._buffer.width = WORLD_WIDTH;
      this._buffer.height = WORLD_HEIGHT;
      this._context = this._buffer.getContext('2d');
    }
    const bitmap = this._context;
    if (!bitmap) return;
    const palette = applyPitfallIdlePalette(readArcadePalette(canvas), snapshot.idleFrames);
    this.advanceFooter(snapshot);
    this.drawLandscape(bitmap, snapshot, palette);
    this.drawVine(bitmap, snapshot, palette);
    this.drawGround(bitmap, snapshot, palette);
    this.drawUnderground(bitmap, snapshot, palette);
    this.drawObjects(bitmap, snapshot, palette);
    this.drawExplorer(bitmap, snapshot, palette);
    this.drawFooter(bitmap, snapshot, palette);
    if (mode === 'game') this.drawHud(bitmap, snapshot, palette);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  private drawLandscape(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    context.fillStyle = palette.background;
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    context.fillStyle = palette.highlight;
    context.fillRect(0, 56, WORLD_WIDTH, 56);
    context.fillStyle = palette.lowlight;
    for (const x of snapshot.room.trees) {
      context.fillRect(x, 64, 4, 48);
      this.drawSprite(context, BRANCH, x - 2, 55);
    }
    context.fillStyle = palette.background;
    context.fillRect(0, 0, WORLD_WIDTH, 56);
    const leaves = LEAVES[snapshot.room.treePattern] ?? LEAVES[0];
    for (const [row, byte] of leaves.entries()) {
      for (let column = 0; column < 20; column++) {
        // Atari PF0 reverses its high nibble; PF1 and PF2 alternate bit order.
        const bit = column < 4 ? column + 4 : column < 12 ? 11 - column : column - 12;
        if ((byte & (1 << bit)) === 0) continue;
        context.fillRect(column * 4, 56 + row * 2, 4, 2);
        context.fillRect((39 - column) * 4, 56 + row * 2, 4, 2);
      }
    }
    context.fillStyle = palette.surface;
    context.fillRect(0, 112, WORLD_WIDTH, 16);
    context.fillStyle = palette.middlelight;
    context.fillRect(0, 128, WORLD_WIDTH, 16);
    context.fillRect(0, 174, WORLD_WIDTH, 2);
  }

  private drawVine(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    const vine = snapshot.vine;
    if (!vine) return;
    context.fillStyle = palette.lowlight;
    let x = vine.anchorX;
    let accumulator = 0;
    for (let y = vine.anchorY; y <= vine.y; y++) {
      accumulator += vine.slope;
      if (accumulator > 255) {
        accumulator -= 256;
        x += vine.direction;
      }
      context.fillRect(x, y, 1, 1);
    }
  }

  private drawGround(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    const pit = snapshot.room.pit;
    if (pit && pit.width > 0) {
      context.fillStyle = pit.kind === 'tar' ? palette.foreground : palette.lowlight;
      const stage = PIT_INSETS.findIndex((inset) => inset >= (64 - pit.width) / 2);
      for (let row = 0; row < 5; row++) {
        const inset = PIT_INSETS[Math.max(0, stage) + row] ?? 32;
        context.fillRect(48 + inset, 112 + row * 2, Math.max(0, 64 - inset * 2), 2);
      }
    }
    context.fillStyle = palette.background;
    for (const hole of snapshot.room.holes) context.fillRect(hole.x, 112, hole.width, 6);
    if (snapshot.room.ladderX !== null) {
      context.fillStyle = palette.background;
      context.fillRect(76, 118, 8, 26);
      context.fillStyle = palette.lowlight;
      // The original uses the ball as a four-pixel rung, two scanlines on and two off.
      for (let y = 120; y < 174; y += 4) context.fillRect(78, y, 4, 2);
    }
  }

  private drawUnderground(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    const wall = snapshot.room.wall;
    if (wall) {
      this.drawSprite(context, WALL, wall.x, 143, false, (row) =>
        row % 4 === 3 ? palette.middlelight : palette.foreground,
      );
    }
    const scorpion = snapshot.room.scorpion;
    if (scorpion) {
      context.fillStyle = palette.foreground;
      const frame = scorpion.x & 1;
      this.drawSprite(
        context,
        PitfallSpritePatterns.scorpion[frame] ?? [],
        scorpion.x,
        159,
        scorpion.facing === -1,
      );
    }
  }

  private drawObjects(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    for (const log of snapshot.room.logs) {
      context.fillStyle = palette.foreground;
      this.drawSprite(
        context,
        PitfallSpritePatterns.log[log.animationFrame & 1] ?? [],
        log.x,
        log.y,
      );
    }
    for (const crocodile of snapshot.room.crocodiles) {
      context.fillStyle = palette.foreground;
      this.drawSprite(
        context,
        PitfallSpritePatterns.crocodile[crocodile.mouthOpen ? 0 : 1],
        crocodile.x,
        111,
      );
    }
    const obstacle = snapshot.room.obstacle;
    if (obstacle) {
      const frames =
        obstacle.kind === 'fire' ? PitfallSpritePatterns.fire : PitfallSpritePatterns.cobra;
      this.drawSprite(
        context,
        frames[obstacle.animationFrame & 1] ?? [],
        obstacle.x,
        111,
        false,
        (row) => (obstacle.kind === 'fire' && row < 11 ? palette.lowlight : palette.foreground),
      );
    }
    const treasure = snapshot.room.treasure;
    if (!treasure) return;
    const pattern =
      treasure.kind === 'moneyBag'
        ? PitfallSpritePatterns.moneyBag
        : treasure.kind === 'diamond'
          ? PitfallSpritePatterns.ring
          : (PitfallSpritePatterns.bar[treasure.animationFrame & 1] ?? []);
    this.drawSprite(context, pattern, treasure.x, 111, false, (row) => {
      if (treasure.kind === 'gold') return row < 8 ? palette.foreground : palette.lowlight;
      if (treasure.kind === 'silver') return row < 8 ? palette.foreground : palette.middlelight;
      return palette.foreground;
    });
  }

  private drawExplorer(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    const player = snapshot.player;
    if (snapshot.idleFrames >= 32768) return;
    const pattern =
      PitfallSpritePatterns.harry[player.animationFrame] ?? PitfallSpritePatterns.harry[5];
    const climbing = player.animationFrame >= 7;
    context.save();
    if (snapshot.room.pit && snapshot.deathFramesRemaining > 0 && player.y > 120) {
      context.beginPath();
      context.rect(0, 0, WORLD_WIDTH, 112);
      context.clip();
    }
    this.drawSprite(
      context,
      pattern,
      player.x,
      player.y - 22 + player.spriteOffsetY,
      player.facing === -1,
      (row) => {
        if (row >= (climbing ? 10 : 12)) return palette.foreground;
        if (row >= (climbing ? 4 : 5)) return palette.lowlight;
        return row === 1 ? palette.foreground : palette.middlelight;
      },
    );
    context.restore();
  }

  private drawHud(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    context.fillStyle = palette.foreground;
    this.drawNumber(context, String(Math.max(0, snapshot.score)).padStart(6, ' '), 16, 3);
    const remaining = Math.max(0, Math.ceil(snapshot.timeRemaining));
    const minutes = String(Math.floor(remaining / 60)).padStart(2, ' ');
    const seconds = String(remaining % 60).padStart(2, '0');
    this.drawNumber(context, `${minutes}:${seconds}`, 24, 19);
    // The sticks represent spare explorers; the current life has no stick.
    for (let life = 0; life < snapshot.lives - 1; life++) context.fillRect(16 + life * 2, 20, 1, 6);
  }

  private advanceFooter(snapshot: IPitfallSnapshot): void {
    const frames = Math.max(0, snapshot.displayFrames - this._previousDisplayFrame);
    const reset = snapshot.displayFrames < this._previousDisplayFrame;
    const finished = snapshot.status === 'won' || snapshot.status === 'gameOver';
    if (reset || (finished && snapshot.status !== this._previousStatus)) {
      this._footerCounter = 255;
      this._soundUntilDisplayFrame = 0;
    } else if (snapshot.deathFramesRemaining > this._previousDeathFrames) {
      this._footerCounter = 132;
    } else if (snapshot.status === 'playing' && snapshot.deathFramesRemaining === 0) {
      this._footerCounter = 0;
    } else if (this._footerCounter > 0) {
      this._footerCounter = ((((this._footerCounter - 1 - frames) % 255) + 255) % 255) + 1;
    }
    for (const event of snapshot.soundEvents) {
      if (event.id <= this._lastSoundEventId) continue;
      this._lastSoundEventId = event.id;
      if (event.kind === 'log' || event.kind === 'wall') continue;
      const duration = (PitfallSoundSequences[event.kind].length - 1) * 4 + 1;
      this._soundUntilDisplayFrame = snapshot.displayFrames + duration;
    }
    this._previousDisplayFrame = snapshot.displayFrames;
    this._previousDeathFrames = snapshot.deathFramesRemaining;
    this._previousStatus = snapshot.status;
  }

  private drawFooter(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallSnapshot,
    palette: IArcadePalette,
  ): void {
    const counter = snapshot.displayFrames < this._soundUntilDisplayFrame ? 0 : this._footerCounter;
    const stage = counter >> 3;
    const offset = stage >= 20 ? 8 : stage >= 12 ? stage - 12 : 0;
    context.fillStyle = palette.foreground;
    for (let column = 0; column < 6; column++) {
      const rows = Array.from(
        { length: 8 },
        (_, row) => PitfallCopyrightPattern[column * 16 + offset + 7 - row] ?? 0,
      );
      this.drawSprite(context, rows, 16 + column * 8, 180);
    }
  }

  private drawNumber(context: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    for (const [index, character] of Array.from(text).entries()) {
      this.drawSprite(context, PITFALL_PIXEL_FONT[character] ?? [], x + index * 8, y);
    }
  }

  private drawSprite(
    context: CanvasRenderingContext2D,
    rows: readonly number[],
    x: number,
    y: number,
    reflected = false,
    color?: (row: number) => string,
  ): void {
    for (const [row, mask] of rows.entries()) {
      if (color) context.fillStyle = color(row);
      for (let column = 0; column < 8; column++) {
        if ((mask & (128 >> column)) !== 0) {
          context.fillRect(
            Math.round(x) + (reflected ? 7 - column : column),
            Math.round(y) + row,
            1,
            1,
          );
        }
      }
    }
  }

  // #endregion
}
