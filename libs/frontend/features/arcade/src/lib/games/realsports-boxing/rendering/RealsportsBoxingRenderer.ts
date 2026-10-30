// #region Imports

import type { IArcadePalette } from '../../shared/rendering/IArcadePalette';
import { readArcadePalette } from '../../shared/rendering/readArcadePalette';
import type { IBoxingFighter } from '../model/IBoxingFighter';
import type { IBoxingSnapshot } from '../model/IBoxingSnapshot';
import { ArcadePixelFont } from '../../shared/rendering/ArcadePixelFont';
import { BoxingSpritePatterns } from './BoxingSpritePatterns';

// #endregion

/** Draws the side-view ring and original HUD composition using Symphony's six theme tones. @public */
export class RealsportsBoxingRenderer {
  // #region Fields

  private _pixels: HTMLCanvasElement | undefined;

  // #endregion

  // #region Methods

  /**
   * Expands the complete 320 × 192 pixel scene into all available canvas space.
   * @param context - Owning browser drawing context.
   * @param snapshot - Current deterministic match frame.
   * @param canvas - Theme scope and current device-pixel dimensions.
   * @public
   */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: IBoxingSnapshot,
    canvas: HTMLCanvasElement,
  ): void {
    const palette = readArcadePalette(canvas);
    if (!this._pixels) {
      this._pixels = canvas.ownerDocument.createElement('canvas');
      this._pixels.width = 320;
      this._pixels.height = 192;
    }
    const pixels = this._pixels.getContext('2d');
    const target = pixels ?? context;
    target.save();
    target.setTransform(
      pixels ? 1 : canvas.width / 320,
      0,
      0,
      pixels ? 1 : canvas.height / 192,
      0,
      0,
    );
    target.imageSmoothingEnabled = false;
    target.fillStyle = palette.background;
    target.fillRect(0, 0, 320, 192);
    this.drawRing(target, palette);
    const ordered = [...snapshot.fighters].sort((left, right) => left.y - right.y);
    for (const fighter of ordered) this.drawFighter(target, fighter, snapshot.frame, palette);
    this.drawFrontRopes(target, palette, snapshot.frame);
    this.drawScoreboard(target, snapshot, palette);
    const banner =
      snapshot.status === 'paused'
        ? 'PAUSED'
        : snapshot.status === 'demo'
          ? 'REALSPORTS BOXING'
          : snapshot.status === 'ready'
            ? 'ROUND ' + snapshot.round
            : snapshot.status === 'rest'
              ? 'END OF ROUND ' + snapshot.round
              : snapshot.status === 'knockdown'
                ? String(snapshot.count)
                : snapshot.status === 'celebration'
                  ? snapshot.result?.reason === 'technical-knockout'
                    ? 'TKO'
                    : snapshot.result?.reason === 'knockout'
                      ? 'KNOCK OUT'
                      : snapshot.result?.reason === 'draw'
                        ? 'DRAW'
                        : 'WINNER'
                  : '';
    if (banner) this.text(target, banner, 160 - banner.length * 3, 3, palette.foreground, 1);
    target.restore();
    if (pixels) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.imageSmoothingEnabled = false;
      context.drawImage(this._pixels, 0, 0, canvas.width, canvas.height);
      context.restore();
    }
  }

  private drawRing(context: CanvasRenderingContext2D, palette: IArcadePalette): void {
    context.fillStyle = palette.highlight;
    context.fillRect(0, 40, 320, 114);
    context.fillStyle = palette.surface;
    context.fillRect(18, 60, 284, 92);
    // The original arena is lit from a suspended panel; spectators sit in front of the ring.
    context.fillStyle = palette.lowlight;
    context.fillRect(130, 13, 2, 10);
    context.fillRect(188, 13, 2, 10);
    context.fillStyle = palette.foreground;
    context.fillRect(122, 23, 76, 2);
    context.fillStyle = palette.middlelight;
    context.fillRect(116, 25, 88, 2);
    context.fillStyle = palette.surface;
    context.fillRect(110, 27, 100, 3);
    context.fillStyle = palette.lowlight;
    for (const y of [45, 53, 61]) context.fillRect(20, y, 280, 2);
    for (let y = 45; y <= 136; y += 3) {
      const inset = Math.round((y - 45) / 8);
      context.fillRect(20 - inset, y, 2, 3);
      context.fillRect(298 + inset, y, 2, 3);
    }
    for (const x of [18, 298]) {
      context.fillStyle = palette.foreground;
      context.fillRect(x, 39, 4, 31);
    }
    context.fillStyle = palette.highlight;
    context.fillRect(142, 96, 36, 2);
    context.fillRect(158, 88, 4, 18);
  }

  private drawFrontRopes(
    context: CanvasRenderingContext2D,
    palette: IArcadePalette,
    frame: number,
  ): void {
    context.fillStyle = palette.lowlight;
    for (const y of [132, 140, 148]) context.fillRect(8, y, 304, 2);
    context.fillStyle = palette.foreground;
    context.fillRect(6, 124, 4, 32);
    context.fillRect(310, 124, 4, 32);
    for (let spectator = 0; spectator < 17; spectator += 1) {
      const x = 16 + spectator * 18;
      const y = 151 - ((spectator + Math.floor(frame / 24)) % 5 === 0 ? 2 : 0);
      context.fillStyle = spectator % 3 === 0 ? palette.foreground : palette.lowlight;
      context.fillRect(x + 2, y - 4, 5, 3);
      context.fillRect(x, y - 1, 9, 4);
    }
  }

  private drawFighter(
    context: CanvasRenderingContext2D,
    fighter: IBoxingFighter,
    frame: number,
    palette: IArcadePalette,
  ): void {
    const x = Math.round(fighter.x);
    const stride = fighter.pose === 'move' ? fighter.animation * 2 : 0;
    const dancing = fighter.pose === 'celebrate' ? (Math.floor(frame / 8) % 2) * 3 : 0;
    const y = Math.round(fighter.y) - dancing;
    const darkShorts = fighter.contender === 'macho-man' || fighter.contender === 'lefty-oleary';
    const colors: Readonly<Record<string, string>> = {
      '1': darkShorts ? palette.foreground : palette.lowlight,
      '2': fighter.contender === 'iron-fists' ? palette.middlelight : palette.lowlight,
      '3': fighter.contender === 'jabbin-jack' ? palette.middlelight : palette.foreground,
      '4': darkShorts ? palette.middlelight : palette.foreground,
      '5': palette.foreground,
    };
    if (fighter.pose === 'down') {
      context.fillStyle = colors['2'] ?? palette.lowlight;
      context.fillRect(x - 13, y - 7, 24, 6);
      context.fillRect(x + 11, y - 6, 7, 5);
      context.fillStyle = colors['1'] ?? palette.foreground;
      context.fillRect(x - 15, y - 7, 8, 7);
      context.fillStyle = palette.foreground;
      context.fillRect(x - 25, y - 4, 12, 3);
      return;
    }
    const rows =
      fighter.pose === 'cover' ? BoxingSpritePatterns.cover : BoxingSpritePatterns.stance;
    for (const [row, pixels] of rows.entries())
      for (let column = 0; column < pixels.length; column += 1) {
        const code = pixels[column] ?? '0';
        if (code === '0') continue;
        if (fighter.contender === 'iron-fists' && code === '3' && row < 2) continue;
        context.fillStyle = colors[code] ?? palette.foreground;
        const sway = row > 18 ? (column < 8 ? -stride : stride) : 0;
        context.fillRect(x + (column - 8) * 2 * fighter.facing + sway, y - 26 + row, 2, 1);
      }
    if (fighter.pose === 'jab' || fighter.pose === 'body' || fighter.pose === 'payoff') {
      const height = fighter.pose === 'body' ? 12 : fighter.pose === 'payoff' ? 22 : 19;
      const reach = fighter.pose === 'payoff' ? 23 : 19;
      context.fillStyle = colors['2'] ?? palette.lowlight;
      context.fillRect(fighter.facing === 1 ? x + 3 : x - reach, y - height, reach - 3, 3);
      context.fillStyle = colors['4'] ?? palette.foreground;
      context.fillRect(fighter.facing === 1 ? x + reach - 4 : x - reach - 4, y - height - 1, 8, 5);
    }
    if (fighter.pose === 'celebrate') {
      context.fillStyle = colors['4'] ?? palette.foreground;
      context.fillRect(x - 13, y - 33, 7, 6);
      context.fillRect(x + 6, y - 33, 7, 6);
    }
  }

  private drawScoreboard(
    context: CanvasRenderingContext2D,
    snapshot: IBoxingSnapshot,
    palette: IArcadePalette,
  ): void {
    context.fillStyle = palette.background;
    context.fillRect(0, 154, 320, 38);
    const seconds = snapshot.secondsRemaining;
    const time =
      snapshot.status === 'knockdown'
        ? String(snapshot.count)
        : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    this.text(context, time, 160 - time.length * 3, 157, palette.foreground);
    for (const player of [0, 1] as const) {
      const fighter = snapshot.fighters[player];
      const x = player === 0 ? 24 : 238;
      context.fillStyle = palette.middlelight;
      context.fillRect(x, 164, 58, 6);
      context.fillStyle = palette.surface;
      context.fillRect(x + 1, 165, 56, 4);
      if (!fighter.canKnockDown || Math.floor(snapshot.frame / 8) % 2 === 0) {
        context.fillStyle = palette.foreground;
        const width = Math.round(Math.min(1, fighter.strengthLead / 45) * 56);
        context.fillRect(player === 0 ? x + 1 : x + 57 - width, 165, width, 4);
      }
      context.fillStyle = palette.highlight;
      context.fillRect(x + 9, 174, 40, 14);
      const score = String(
        snapshot.status === 'rest' ? fighter.roundScore : fighter.score,
      ).padStart(2, '0');
      this.text(context, score, x + 23, 178, palette.foreground);
    }
    context.fillStyle = palette.highlight;
    context.fillRect(151, 177, 18, 13);
    this.text(context, String(snapshot.round), 157, 180, palette.foreground);
  }

  private text(
    context: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    color: string,
    scale = 1,
  ): void {
    context.fillStyle = color;
    for (const [index, character] of [...value.toUpperCase()].entries()) {
      const rows = ArcadePixelFont[character] ?? ArcadePixelFont[' '];
      for (const [row, cells] of (rows ?? []).entries())
        for (let column = 0; column < cells.length; column += 1)
          if (cells[column] === '1')
            context.fillRect(x + (index * 6 + column) * scale, y + row * scale, scale, scale);
    }
  }

  // #endregion
}
