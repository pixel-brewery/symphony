// #region Imports

import type { IPitfallIISnapshot } from '../model/IPitfallIISnapshot';
import { getPitfallIIPlayerSprite } from '../model/getPitfallIIPlayerSprite';
import type { IArcadePalette } from '../../shared/rendering/IArcadePalette';
import { readArcadePalette } from '../../shared/rendering/readArcadePalette';
import { PITFALL_PIXEL_FONT } from '../../pitfall/rendering/PitfallPixelFont';
import { PitfallIIFooterPatterns } from './PitfallIIFooterPatterns';
import { PitfallIISceneryPatterns } from './PitfallIISceneryPatterns';
import { PitfallIIRockPatterns } from './PitfallIIRockPatterns';
import { PitfallIISpritePatterns } from '../model/PitfallIISpritePatterns';

// #endregion

const WIDTH = 160;
const HEIGHT = 192;
const SURFACE = 120;

/**
 * Draws the complete Lost Caverns from the simulation's original-scale geometry.
 * The 160×192 pixel buffer fills the application surface and uses only public Mosaik scheme tones.
 *
 * @public
 */
export class PitfallIIRenderer {
  // #region Fields

  private _buffer: HTMLCanvasElement | null = null;
  private _context: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /**
   * Paints one frame with fixed score/footer bands and the smoothly scrolling cavern in between.
   *
   * @param context - The visible canvas context owned by the arcade controller.
   * @param snapshot - Immutable world, camera, actors, and scoring state.
   * @param canvas - The destination canvas inheriting Symphony's current theme.
   * @param mode - Intro omits the score underneath the owning view's start menu.
   * @public
   */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
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
    const palette = readArcadePalette(canvas);
    bitmap.setTransform(1, 0, 0, 1, 0, 0);
    bitmap.fillStyle = palette.background;
    bitmap.fillRect(0, 0, WIDTH, HEIGHT);
    bitmap.save();
    bitmap.beginPath();
    bitmap.rect(0, 24, WIDTH, 152);
    bitmap.clip();
    bitmap.translate(-snapshot.camera.x, -Math.round(snapshot.camera.y));
    this.drawForest(bitmap, snapshot, palette);
    this.drawGround(bitmap, snapshot, palette);
    this.drawWater(bitmap, snapshot, palette);
    this.drawLadders(bitmap, snapshot, palette);
    this.drawItems(bitmap, snapshot, palette);
    this.drawHazards(bitmap, snapshot, palette);
    this.drawBalloon(bitmap, snapshot, palette);
    this.drawPlayer(bitmap, snapshot, palette);
    bitmap.restore();
    if (mode === 'game') this.drawScore(bitmap, snapshot, palette);
    this.drawFooter(bitmap, snapshot, palette);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  private drawForest(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    if (snapshot.camera.y > SURFACE) return;
    const x = snapshot.camera.x;
    const variant = snapshot.chamber % 2;
    context.fillStyle = palette.surface;
    context.fillRect(x, 85, WIDTH, SURFACE - 85);
    context.fillStyle = palette.lowlight;
    const trees = PitfallIISceneryPatterns.trees[variant] ?? [];
    for (const tree of trees) context.fillRect(x + tree, 85, 4, SURFACE - 85);
    // The NTSC release has a stepped sunset behind the canopy rather than a flat sky.
    const sunset = [
      palette.highlight,
      palette.middlelight,
      palette.lowlight,
      palette.middlelight,
      palette.highlight,
    ];
    for (const [row, tone] of sunset.entries()) {
      context.fillStyle = tone;
      context.fillRect(x, 32 + row * 2, WIDTH, 2);
    }
    context.fillStyle = palette.highlight;
    for (let column = 0; column < 40; column++) {
      const top = PitfallIISceneryPatterns.canopyTop[variant]?.[column] ?? 40;
      const bottom = PitfallIISceneryPatterns.canopyBottom[variant]?.[column] ?? 88;
      context.fillRect(x + column * 4, top, 4, bottom - top);
    }
  }

  private drawGround(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    for (const platform of snapshot.platforms) {
      if (!this.visible(snapshot, platform.x, platform.y, platform.width, 16)) continue;
      context.fillStyle = palette.highlight;
      context.fillRect(platform.x, platform.y, platform.width, Math.min(9, platform.height));
    }
    context.fillStyle = palette.middlelight;
    const runs = PitfallIIRockPatterns.chambers[snapshot.chamber] ?? '';
    let y = SURFACE;
    for (let offset = 0; offset < runs.length; offset += 4) {
      const row =
        PitfallIIRockPatterns.rows[Number.parseInt(runs.slice(offset, offset + 2), 36)] ?? '';
      const height = Number.parseInt(runs.slice(offset + 2, offset + 4), 36);
      if (y + height >= snapshot.camera.y + 24) {
        for (let column = 0; column < row.length; column++) {
          if (row[column] === '1') context.fillRect(snapshot.camera.x + column * 4, y, 4, height);
        }
      }
      y += height;
      if (y > snapshot.camera.y + 176) break;
    }
  }

  private drawWater(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    for (const water of snapshot.water) {
      if (!this.visible(snapshot, water.x, water.y, water.width, water.height)) continue;
      context.fillStyle = palette.lowlight;
      context.fillRect(water.x, water.y, water.width, water.height);
      for (let offset = 0; offset < water.width; offset += 4) {
        const wave = ((Math.floor(offset / 16) + Math.floor(snapshot.frame / 12)) % 5) - 2;
        context.fillRect(water.x + offset, water.y - 1 + wave, 4, 3);
      }
    }
    if (snapshot.chamber !== 4 || snapshot.camera.y > 220) return;
    // The only waterfall joins the upper river to chamber five's lower pool.
    const fallX = 4 * WIDTH;
    this.sprite(
      context,
      PitfallIISpritePatterns.waterfall[Math.floor(snapshot.frame / 4) % 2] ?? [],
      fallX,
      184,
      false,
      (row) =>
        row > 36 ? palette.surface : row % 2 === 0 ? palette.lowlight : palette.middlelight,
    );
  }

  private drawLadders(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    context.fillStyle = palette.lowlight;
    for (const ladder of snapshot.ladders) {
      if (!this.visible(snapshot, ladder.x - 2, ladder.y, 4, ladder.height)) continue;
      for (let y = ladder.y + 1; y < ladder.y + ladder.height; y += 4) {
        context.fillRect(ladder.x - 2, y, 4, Math.min(2, ladder.y + ladder.height - y));
      }
    }
  }

  private drawItems(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    for (const checkpoint of snapshot.checkpoints) {
      if (!this.visible(snapshot, checkpoint.x, checkpoint.y, 8, 7)) continue;
      context.fillStyle =
        checkpoint.id === snapshot.checkpointId ? palette.foreground : palette.lowlight;
      this.sprite(context, PitfallIISpritePatterns.checkpoint, checkpoint.x, checkpoint.y);
    }
    for (const item of snapshot.items) {
      if (item.collected || !this.visible(snapshot, item.x, item.y - 22, 8, 30)) continue;
      const pattern =
        item.kind === 'gold' || item.kind === 'quickclaw' || item.kind === 'rat'
          ? (PitfallIISpritePatterns[item.kind][Math.floor(snapshot.frame / 8) % 2] ?? [])
          : PitfallIISpritePatterns[item.kind];
      const person = item.kind === 'rhonda' || item.kind === 'quickclaw';
      this.sprite(
        context,
        pattern,
        item.x,
        item.y - pattern.length + (person ? 6 : 2),
        false,
        (row) => {
          if (item.kind === 'rhonda')
            return row < 7 ? palette.foreground : row < 14 ? palette.lowlight : palette.foreground;
          if (item.kind === 'quickclaw') return row < 4 ? palette.lowlight : palette.foreground;
          if (item.kind === 'gold') return row > 9 ? palette.lowlight : palette.foreground;
          return palette.foreground;
        },
      );
    }
  }

  private drawHazards(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    for (const hazard of snapshot.hazards) {
      if (!this.visible(snapshot, hazard.x, hazard.y - 16, 8, 22)) continue;
      const kind = hazard.kind === 'balloonBat' ? 'bat' : hazard.kind;
      const pattern = PitfallIISpritePatterns[kind][hazard.frame % 2] ?? [];
      const onGround = hazard.kind === 'scorpion' || hazard.kind === 'frog';
      this.sprite(
        context,
        pattern,
        hazard.x,
        hazard.y - pattern.length + (onGround ? 4 : 0),
        hazard.kind === 'condor' ? hazard.facing === 1 : hazard.facing === -1,
        (row) => {
          if (hazard.kind === 'condor' && row > 4) return palette.lowlight;
          return palette.foreground;
        },
      );
    }
  }

  private drawBalloon(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    const balloon = snapshot.balloon;
    if (!balloon.visible) return;
    if (!this.visible(snapshot, balloon.x, balloon.y - 9, 8, 27)) return;
    const bands = [
      palette.foreground,
      palette.lowlight,
      palette.middlelight,
      palette.highlight,
      palette.lowlight,
    ];
    this.sprite(
      context,
      PitfallIISpritePatterns.balloon,
      balloon.attached ? snapshot.player.x : balloon.x,
      balloon.y - 9,
      balloon.attached && snapshot.player.facing === 1,
      (row) =>
        row >= 9
          ? palette.foreground
          : (bands[Math.min(4, Math.floor(row / 2))] ?? palette.foreground),
    );
  }

  private drawPlayer(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    const player = snapshot.player;
    if (player.invulnerable && Math.floor(snapshot.displayFrames / 4) % 2 !== 0) return;
    const pattern = getPitfallIIPlayerSprite(player);
    const climbing = player.pose === 'climb';
    this.sprite(
      context,
      pattern,
      player.x,
      player.y - pattern.length + 6,
      player.facing === -1,
      (row) => {
        if (player.pose === 'hurt')
          return Math.floor(snapshot.displayFrames / 4) % 2 ? palette.foreground : palette.lowlight;
        if (row < (climbing ? 4 : player.pose === 'swim' ? 4 : 5)) return palette.foreground;
        if (row < (climbing ? 10 : player.pose === 'swim' ? 9 : 12)) return palette.lowlight;
        return palette.foreground;
      },
    );
  }

  private drawScore(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    context.fillStyle = palette.foreground;
    const text = String(Math.max(0, snapshot.score)).padStart(6, ' ');
    for (const [index, character] of Array.from(text).entries()) {
      this.sprite(context, PITFALL_PIXEL_FONT[character] ?? [], 16 + index * 8, 6);
    }
  }

  private drawFooter(
    context: CanvasRenderingContext2D,
    snapshot: IPitfallIISnapshot,
    palette: IArcadePalette,
  ): void {
    const credit = Math.floor(snapshot.displayFrames / 256) % 2 === 1;
    const columns = credit ? PitfallIIFooterPatterns.copyright : PitfallIIFooterPatterns.activision;
    const tones = [
      palette.foreground,
      palette.lowlight,
      palette.middlelight,
      palette.highlight,
      palette.middlelight,
      palette.lowlight,
      palette.foreground,
    ];
    for (const [index, rows] of columns.entries()) {
      this.sprite(context, rows, 16 + index * 8, 182, false, (row) =>
        !credit && index < 2 ? (tones[row] ?? palette.foreground) : palette.foreground,
      );
    }
  }

  private visible(
    snapshot: IPitfallIISnapshot,
    x: number,
    y: number,
    width: number,
    height: number,
  ): boolean {
    return (
      x + width >= snapshot.camera.x &&
      x < snapshot.camera.x + WIDTH &&
      y + height >= snapshot.camera.y + 24 &&
      y < snapshot.camera.y + 176
    );
  }

  private sprite(
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
        if ((mask & (128 >> column)) === 0) continue;
        context.fillRect(
          Math.round(x) + (reflected ? 7 - column : column),
          Math.round(y) + row,
          1,
          1,
        );
      }
    }
  }

  // #endregion
}
