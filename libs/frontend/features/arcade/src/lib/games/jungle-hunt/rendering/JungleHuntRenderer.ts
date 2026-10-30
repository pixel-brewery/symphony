// #region Imports

import type { IArcadePalette } from '../../shared/rendering/IArcadePalette';
import { readArcadePalette } from '../../shared/rendering/readArcadePalette';
import type { IJungleHuntSnapshot } from '../model/IJungleHuntSnapshot';
import { JungleHuntSpritePatterns } from './JungleHuntSpritePatterns';

// #endregion

const NUMBERS = [
  '1111110001100011000111111',
  '0010001100001000010001110',
  '1111100001111111000011111',
  '1111100001011110000111111',
  '1000110001111110000100001',
  '1111110000111110000111111',
  '1111110000111111000111111',
  '1111100010001000100001000',
  '1111110001111111000111111',
  '1111110001111110000111111',
];

/** Draws the scrolling cartridge composition in an exact 160 × 192 six-tone buffer. @public */
export class JungleHuntRenderer {
  // #region Fields

  private _buffer: HTMLCanvasElement | undefined;
  private _context: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /** Fills the inner pane with a nearest-neighbor image using only live Mosaik scheme tones. @public */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: IJungleHuntSnapshot,
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
    this.scenery(bitmap, snapshot, palette);
    switch (snapshot.stage) {
      case 'vines':
        bitmap.fillStyle = palette.lowlight;
        for (const vine of snapshot.vines) {
          const x = vine.x - snapshot.cameraX;
          if (x < -42 || x > 202) continue;
          for (let pixel = 0; pixel < 66; pixel++) {
            const t = pixel / 65;
            bitmap.fillRect(
              Math.round(x + (vine.tipX - vine.x) * t),
              Math.round(vine.y + (vine.tipY - vine.y) * t),
              1,
              2,
            );
          }
          bitmap.fillRect(x - 2, 48, 5, 2);
        }
        break;
      case 'river':
        for (const crocodile of snapshot.crocodiles)
          if (crocodile.alive)
            this.sprite(
              bitmap,
              `crocodile${crocodile.mouth}`,
              crocodile.x - snapshot.cameraX - 12,
              crocodile.y - 4,
              palette,
              false,
              crocodile.rogue,
            );
        bitmap.fillStyle = palette.foreground;
        bitmap.fillRect(131, 70, 22, 2);
        bitmap.fillRect(131, 70, 1, 7);
        bitmap.fillRect(152, 70, 1, 7);
        bitmap.fillStyle =
          snapshot.air < 0.2 && snapshot.frame % 24 < 12 ? palette.lowlight : palette.foreground;
        bitmap.fillRect(133, 73, Math.floor(18 * snapshot.air), 3);
        break;
      case 'boulders':
        for (const rock of snapshot.boulders) {
          const x = Math.round(rock.x - snapshot.cameraX);
          const y = Math.round(rock.y);
          if (x < -12 || x > 172) continue;
          for (let row = -rock.radius; row <= rock.radius; row++) {
            const width = Math.floor(Math.sqrt(rock.radius ** 2 - row ** 2));
            bitmap.fillStyle = palette.foreground;
            bitmap.fillRect(x - width, y + row, width * 2, 1);
            bitmap.fillStyle = palette.lowlight;
            if (Math.abs(row) < rock.radius - 2)
              bitmap.fillRect(x - width + 2, y + row, Math.max(1, width - 2), 1);
          }
          bitmap.fillStyle = palette.middlelight;
          const rotation = Math.floor(snapshot.frame / 7) % 4;
          bitmap.fillRect(x - 2 + rotation, y - 2, 2, 3);
        }
        break;
      case 'rescue':
        for (const guard of snapshot.guards) {
          this.sprite(
            bitmap,
            `guard${Math.floor(snapshot.frame / 12) % 2}`,
            guard.x - 4,
            guard.y,
            palette,
          );
          bitmap.fillStyle = palette.foreground;
          bitmap.fillRect(Math.round(guard.x - 6), guard.spearY + 3, 1, 29);
          bitmap.fillRect(Math.round(guard.x - 7), guard.spearY + 1, 3, 4);
        }
        this.sprite(bitmap, 'lady', 5, 147, palette);
        break;
    }
    this.player(bitmap, snapshot, palette);
    if (mode === 'game') {
      bitmap.fillStyle = palette.foreground;
      this.number(bitmap, String(snapshot.score).padStart(6, '0'), 62, 12, 1);
      this.number(bitmap, String(snapshot.timerValue).padStart(4, '0'), 120, 27, 1);
      this.number(bitmap, String(snapshot.lives), 28, 29, 1);
      bitmap.fillRect(19, 30, 1, 4);
      bitmap.fillRect(17, 32, 5, 1);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  private scenery(
    context: CanvasRenderingContext2D,
    snapshot: IJungleHuntSnapshot,
    palette: IArcadePalette,
  ): void {
    const river = snapshot.stage === 'river';
    context.fillStyle = river ? palette.middlelight : palette.highlight;
    context.fillRect(0, 0, 160, river ? 61 : 48);
    context.fillStyle = river ? palette.highlight : palette.background;
    context.fillRect(0, river ? 61 : 48, 160, 192);
    const scroll = Math.floor(snapshot.cameraX / 3);
    for (let x = -8; x < 168; x += 4) {
      const pattern = Math.abs(Math.floor((x + scroll) / 4));
      context.fillStyle = pattern % 3 ? palette.middlelight : palette.lowlight;
      context.fillRect(x, 44 + ((pattern * 13) % 5) * 2, 4, 5);
      if (!river) {
        context.fillStyle = palette.middlelight;
        context.fillRect(x, 170 - ((pattern * 7) % 4) * 3, 4, 22);
        context.fillStyle = palette.lowlight;
        context.fillRect(x, 180 - ((pattern * 11) % 4) * 2, 4, 12);
        context.fillStyle = palette.foreground;
        context.fillRect(x, 187 + (pattern % 3), 4, 5);
      }
    }
    if (river) {
      context.fillStyle = palette.surface;
      for (let x = 0; x < 160; x += 16)
        context.fillRect((x + Math.floor(snapshot.frame / 7)) % 160, 63, 9, 1);
      context.fillStyle = palette.lowlight;
      context.fillRect(0, 178, 160, 14);
      for (let x = 0; x < 160; x += 8) {
        context.fillStyle = x % 16 ? palette.foreground : palette.middlelight;
        context.fillRect(x, 177 + (x % 3), 4, 12);
      }
    } else if (snapshot.stage !== 'vines') {
      context.fillStyle = palette.lowlight;
      context.fillRect(0, 163, 160, 9);
      context.fillStyle = palette.foreground;
      context.fillRect(0, 163, 160, 1);
      for (let x = 0; x < 160; x += 21) context.fillRect((x - scroll) % 160, 166, 3, 1);
    }
  }

  private player(
    context: CanvasRenderingContext2D,
    snapshot: IJungleHuntSnapshot,
    palette: IArcadePalette,
  ): void {
    const player = snapshot.player;
    if (snapshot.status === 'dying' && snapshot.frame % 10 < 5) return;
    const x = player.x - snapshot.cameraX;
    const swimming = player.pose === 'swim' || player.pose === 'knife';
    const key = swimming
      ? `swim${Math.floor(snapshot.frame / 10) % 2}`
      : player.pose === 'swing'
        ? 'swing'
        : player.pose === 'jump' || player.pose === 'celebrate'
          ? 'jump'
          : player.pose === 'duck'
            ? 'duck'
            : `run${Math.floor(snapshot.frame / 9) % 2}`;
    this.sprite(
      context,
      key,
      x - (swimming ? 9 : player.pose === 'duck' ? 8 : 4),
      player.y,
      palette,
      swimming ? player.facing < 0 : player.facing > 0,
    );
    if (player.pose === 'knife') {
      context.fillStyle = palette.foreground;
      context.fillRect(Math.round(x + player.facing * 4), Math.round(player.y - 11), 1, 17);
      context.fillRect(Math.round(x + player.facing * 4) - 1, Math.round(player.y - 3), 3, 1);
    }
  }

  private sprite(
    context: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    palette: IArcadePalette,
    mirror = false,
    rogue = false,
  ): void {
    const rows = JungleHuntSpritePatterns[key] ?? [];
    const colors: Readonly<Record<string, string>> = {
      '1': key.startsWith('guard')
        ? palette.lowlight
        : rogue
          ? palette.lowlight
          : palette.foreground,
      '2': palette.foreground,
      '3': palette.lowlight,
      '4': palette.foreground,
    };
    for (const [row, cells] of rows.entries())
      for (let col = 0; col < cells.length; col++) {
        const color = colors[cells[col] ?? ''];
        if (!color) continue;
        context.fillStyle = color;
        context.fillRect(
          Math.round(x) + (mirror ? cells.length - col - 1 : col),
          Math.round(y) + row,
          1,
          1,
        );
      }
  }

  private number(
    context: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    scale: number,
  ): void {
    for (const [index, character] of [...value].entries()) {
      const cells = NUMBERS[Number(character)] ?? '';
      for (let cell = 0; cell < cells.length; cell++)
        if (cells[cell] === '1')
          context.fillRect(
            x + index * 7 * scale + (cell % 5) * scale,
            y + Math.floor(cell / 5) * scale,
            scale,
            scale,
          );
    }
  }

  // #endregion
}
