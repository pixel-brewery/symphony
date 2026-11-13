// #region Imports

import { ArcadePixelFont } from '../../shared/rendering/ArcadePixelFont';
import type { CaliforniaGamesEvent } from '../model/CaliforniaGamesEvent';
import type { ICaliforniaGamesSnapshot } from '../model/ICaliforniaGamesSnapshot';
import { CaliforniaGamesPalette } from './CaliforniaGamesPalette';
import { CaliforniaGamesSpritePatterns } from './CaliforniaGamesSpritePatterns';
import { CaliforniaGamesSurface } from './CaliforniaGamesSurface';

// #endregion

const WIDTH = 160;
const HEIGHT = 102;
const EVENT_NAMES: Readonly<Record<CaliforniaGamesEvent, string>> = {
  bmx: 'BMX',
  surfing: 'SURFING',
  'half-pipe': 'HALF PIPE',
  'foot-bag': 'FOOT BAG',
};

/** Rasterizes the complete Lynx California Games flow into a 160×102 indexed framebuffer. @public */
export class CaliforniaGamesRenderer {
  // #region Fields

  private readonly _surface = new CaliforniaGamesSurface();
  private _buffer: HTMLCanvasElement | null = null;
  private _bufferContext: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /** Draws one nearest-neighbor frame into the visible responsive canvas. @public */
  public draw(
    context: CanvasRenderingContext2D,
    snapshot: ICaliforniaGamesSnapshot,
    canvas: HTMLCanvasElement,
  ): void {
    const surface = this.render(snapshot);
    if (!this._buffer) {
      this._buffer = canvas.ownerDocument.createElement('canvas');
      this._buffer.width = WIDTH;
      this._buffer.height = HEIGHT;
      this._bufferContext = this._buffer.getContext('2d');
    }
    const bitmap = this._bufferContext;
    if (!bitmap) return;
    const image = bitmap.createImageData(WIDTH, HEIGHT);
    surface.writeImageData(image, CaliforniaGamesPalette, snapshot.flipped);
    bitmap.putImageData(image, 0, 0);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(this._buffer, 0, 0, canvas.width, canvas.height);
  }

  /** Renders one frame and exposes the indexed result for deterministic visual tests. @public */
  public render(snapshot: ICaliforniaGamesSnapshot): CaliforniaGamesSurface {
    this._surface.clear(0);
    switch (snapshot.phase) {
      case 'intro':
        this.drawIntro(snapshot.frame);
        break;
      case 'title':
        this.drawTitle(snapshot.frame);
        break;
      case 'menu':
        this.drawMenu(snapshot.selectedEvent, snapshot.players, snapshot.frame);
        break;
      case 'high-scores':
        this.drawHighScores(snapshot);
        break;
      case 'countdown':
      case 'playing':
      case 'event-over':
        this.drawEvent(snapshot);
        if (snapshot.phase === 'countdown')
          this.drawCentered(String(Math.max(1, snapshot.countdown)), 43, 15, 2);
        if (snapshot.phase === 'event-over') this.drawCentered('EVENT OVER', 44, 15, 1);
        break;
    }
    if (snapshot.status === 'paused') {
      this._surface.fillRect(46, 42, 68, 17, 0);
      this.frame(45, 41, 70, 19, 15);
      this.drawCentered('PAUSED', 47, 15, 1);
    }
    return this._surface;
  }

  private drawIntro(frame: number): void {
    this._surface.clear(7);
    const reveal = Math.min(4, Math.floor(frame / 8));
    this._surface.fillRect(23, 24, 114, 54, 1);
    this._surface.fillRect(27, 28, 106, 46, 5);
    for (let index = 0; index < reveal; index++) {
      const color = [2, 3, 4, 6][index] ?? 15;
      this._surface.line(35 + index * 4, 62 - index * 5, 56 + index * 4, 35, color);
      this._surface.line(56 + index * 4, 35, 68 + index * 5, 62, color);
    }
    this.drawCentered('EPYX', 46, 15, 2);
    this.drawCentered('PRESENTS', 85, 14, 1);
  }

  private drawTitle(frame: number): void {
    this.drawBeach(frame);
    this.drawSun(126, 19, 12);
    this.drawPalm(17, 25);
    this._surface.fillRect(32, 17, 95, 52, 8);
    this._surface.fillRect(35, 20, 89, 46, 3);
    this.frame(38, 23, 83, 40, 15);
    this.drawCentered('CALIFORNIA', 29, 2, 1);
    this.drawCentered('GAMES', 43, 15, 2);
    this.drawCentered('PRESS A OR B', 84, frame % 48 < 36 ? 1 : 14, 1);
  }

  private drawMenu(selected: CaliforniaGamesEvent, players: 1 | 2, frame: number): void {
    this.drawBeach(frame);
    this.drawSun(130, 15, 10);
    this.drawPalm(18, 20);
    this.drawText('SELECT EVENT', 65, 10, 1, 1);
    const events: readonly CaliforniaGamesEvent[] = ['bmx', 'surfing', 'half-pipe', 'foot-bag'];
    for (const [index, event] of events.entries()) {
      const y = 28 + index * 14;
      const chosen = event === selected;
      if (chosen) this._surface.fillRect(63, y - 2, 86, 11, 1);
      this.drawText(EVENT_NAMES[event], 69, y, chosen ? 2 : 15, 1);
      if (chosen) this._surface.drawSprite(['f'], 61, y + 3);
    }
    this.drawText(`${players} PLAYER${players === 1 ? '' : 'S'}`, 82, 88, 8, 1);
  }

  private drawHighScores(snapshot: ICaliforniaGamesSnapshot): void {
    this._surface.clear(7);
    for (let y = 0; y < HEIGHT; y += 4) this._surface.fillRect(0, y, WIDTH, 1, y % 8 === 0 ? 5 : 0);
    this.frame(11, 6, 138, 90, 15);
    this.drawCentered('HIGH SCORES', 11, 3, 1);
    this.drawCentered(EVENT_NAMES[snapshot.selectedEvent], 25, 3, 1);
    const board = snapshot.highScores.find((entry) => entry.event === snapshot.selectedEvent);
    for (let index = 0; index < 3; index++) {
      const entry = board?.entries[index];
      const color = entry && snapshot.newHighScorePlayers.includes(entry.player) ? 2 : 15;
      this.drawText(`${index + 1}.`, 34, 44 + index * 13, color, 1);
      this.drawText(entry ? `PLAYER ${entry.player}` : '---', 53, 44 + index * 13, color, 1);
      this.drawRight(
        entry ? String(entry.score).padStart(6, '0') : '000000',
        133,
        44 + index * 13,
        color,
      );
    }
    this.drawCentered('A/B CONTINUE', 86, 14, 1);
  }

  private drawEvent(snapshot: ICaliforniaGamesSnapshot): void {
    const state = snapshot.eventState;
    if (!state) {
      this.drawTitle(snapshot.frame);
      return;
    }
    switch (state.kind) {
      case 'bmx':
        this.drawBmx(snapshot, state);
        break;
      case 'surfing':
        this.drawSurfing(snapshot, state);
        break;
      case 'half-pipe':
        this.drawHalfPipe(snapshot, state);
        break;
      case 'foot-bag':
        this.drawFootBag(snapshot, state);
        break;
    }
  }

  private drawBmx(
    snapshot: ICaliforniaGamesSnapshot,
    state: Extract<NonNullable<ICaliforniaGamesSnapshot['eventState']>, { kind: 'bmx' }>,
  ): void {
    this._surface.clear(6);
    this._surface.fillRect(0, 22, WIDTH, 20, 4);
    for (let x = -20; x < WIDTH + 30; x += 25) {
      const offset = (x - Math.floor(state.progress / 8)) % 180;
      this._surface.line(offset, 41, offset + 13, 31, 5);
      this._surface.line(offset + 13, 31, offset + 27, 41, 5);
    }
    this._surface.fillRect(0, 42, WIDTH, 60, 8);
    for (let y = 47; y < HEIGHT; y += 11) {
      const width = Math.max(1, Math.floor((y - 38) / 10));
      for (let x = (snapshot.frame * 2 + y * 3) % 31; x < WIDTH; x += 31)
        this._surface.fillRect(x, y, width, 1, 9);
    }
    const horizon = state.progress;
    for (const obstacle of state.obstacles) {
      const distance = obstacle.distance - horizon;
      if (distance < -12 || distance > 115) continue;
      const perspective = 1 - distance / 160;
      const x = 80 + obstacle.lane * 24 * perspective;
      const y = 89 - distance * 0.42;
      const pattern = CaliforniaGamesSpritePatterns[obstacle.kind] ?? [];
      this._surface.drawSprite(pattern, x - 4, y, {
        scaleX: distance < 30 ? 2 : 1,
        shear: obstacle.kind === 'cliff' ? 0.3 : 0,
      });
    }
    for (const rider of state.riders) {
      this._surface.drawSprite(CaliforniaGamesSpritePatterns.bmx ?? [], rider.x - 4, rider.y - 8, {
        flipX: Math.cos(rider.rotation) < 0,
        shear: Math.sin(rider.rotation) * 0.35,
      });
    }
    this.drawHud(
      state.timer,
      state.riders.map((rider) => rider.score),
    );
  }

  private drawSurfing(
    snapshot: ICaliforniaGamesSnapshot,
    state: Extract<NonNullable<ICaliforniaGamesSnapshot['eventState']>, { kind: 'surfing' }>,
  ): void {
    this._surface.clear(6);
    this._surface.fillRect(0, 18, WIDTH, 84, 5);
    this.drawSun(135, 22, 8);
    const crest = 46 + Math.round(Math.sin(state.wavePhase) * 4);
    for (let x = 0; x < WIDTH; x++) {
      const wave = crest + Math.round(Math.sin((x + state.wavePhase * 18) / 13) * 5);
      this._surface.fillRect(x, wave, 1, HEIGHT - wave, x % 5 === 0 ? 6 : 7);
      if (x % 3 === 0) this._surface.setPixel(x, wave, 15);
    }
    const tubeX = 21 + Math.round((state.wavePhase * 9) % 38);
    for (let ring = 0; ring < 22; ring++) {
      const radius = Math.max(2, 18 - ring / 2);
      const x = tubeX + ring;
      this._surface.line(x, crest + 2 - radius, x, crest + 2 + radius, ring % 2 ? 6 : 15);
    }
    for (const surfer of state.surfers)
      this._surface.drawSprite(CaliforniaGamesSpritePatterns.surfer ?? [], surfer.x, surfer.y, {
        flipX: surfer.angle < 0,
        shear: surfer.angle / 70,
        checkerTransparency: surfer.tubeFrames > 0,
      });
    if (state.timer < 15 && snapshot.frame % 90 < 45)
      this._surface.drawSprite(CaliforniaGamesSpritePatterns.pelican ?? [], 111, 25, {
        flipX: true,
      });
    this.drawHud(
      state.timer,
      state.surfers.map((surfer) => surfer.score),
    );
  }

  private drawHalfPipe(
    snapshot: ICaliforniaGamesSnapshot,
    state: Extract<NonNullable<ICaliforniaGamesSnapshot['eventState']>, { kind: 'half-pipe' }>,
  ): void {
    this._surface.clear(6);
    this._surface.fillRect(0, 25, WIDTH, 31, 3);
    this._surface.fillRect(0, 56, WIDTH, 46, 8);
    for (let y = 38; y < HEIGHT; y++) {
      const inset = Math.max(0, Math.round((y - 38) * 0.78));
      this._surface.fillRect(0, y, Math.min(53, inset), 1, 14);
      this._surface.fillRect(WIDTH - Math.min(53, inset), y, Math.min(53, inset), 1, 14);
      this._surface.fillRect(Math.min(53, inset), y, WIDTH - Math.min(106, inset * 2), 1, 1);
    }
    for (let y = 44; y < HEIGHT; y += 8) {
      const inset = Math.max(0, Math.round((y - 38) * 0.78));
      this._surface.fillRect(inset, y, Math.max(0, WIDTH - inset * 2), 1, 9);
    }
    for (const skater of state.skaters) {
      const depthScale = skater.y > 64 ? 2 : 1;
      this._surface.drawSprite(
        CaliforniaGamesSpritePatterns.skater ?? [],
        skater.x - 4 * depthScale,
        skater.y - 10 * depthScale,
        {
          scaleX: depthScale,
          scaleY: depthScale,
          flipX: skater.velocity < 0,
          shear: skater.rotation / 540,
        },
      );
    }
    this.drawHud(
      state.timer,
      state.skaters.map((skater) => skater.score),
    );
    if (snapshot.godMode) this.drawText('FREE', 68, 94, 3, 1);
  }

  private drawFootBag(
    snapshot: ICaliforniaGamesSnapshot,
    state: Extract<NonNullable<ICaliforniaGamesSnapshot['eventState']>, { kind: 'foot-bag' }>,
  ): void {
    this.drawBeach(snapshot.frame);
    this.drawSun(133, 18, 9);
    this.drawPalm(17, 19);
    this._surface.drawSprite(CaliforniaGamesSpritePatterns.seagull ?? [], state.seagullX, 18, {
      flipX: snapshot.frame % 180 > 90,
    });
    for (const player of state.playersState) {
      this._surface.drawSprite(
        CaliforniaGamesSpritePatterns.footbag ?? [],
        player.x,
        player.pose === 'jump' ? 64 : 72,
        { flipX: player.player === 2, shear: player.pose === 'trip' ? 0.35 : 0 },
      );
      this._surface.drawSprite(CaliforniaGamesSpritePatterns.bag ?? [], player.bagX, player.bagY, {
        checkerTransparency: snapshot.frame % 4 < 2,
      });
      if (player.combo > 0) this.drawText(String(player.combo), player.x - 2, 61, 2, 1);
    }
    this.drawHud(
      state.timer,
      state.playersState.map((player) => player.score),
    );
  }

  private drawBeach(frame: number): void {
    this._surface.clear(6);
    this._surface.fillRect(0, 55, WIDTH, 13, 5);
    this._surface.fillRect(0, 68, WIDTH, 34, 3);
    for (let x = (frame >> 2) % 14; x < WIDTH; x += 14)
      this._surface.fillRect(x, 60 + ((x >> 1) % 3), 7, 1, 15);
    for (let x = 0; x < WIDTH; x += 17) this._surface.setPixel(x, 80 + (x % 7), 9);
  }

  private drawPalm(x: number, y: number): void {
    this._surface.drawSprite(CaliforniaGamesSpritePatterns.palmTop ?? [], x - 7, y);
    for (let row = 0; row < 54; row++) {
      const trunkX = x + Math.round(row / 17);
      this._surface.fillRect(trunkX, y + 5 + row, 3, 1, row % 5 === 0 ? 9 : 8);
    }
  }

  private drawSun(x: number, y: number, radius: number): void {
    for (let row = -radius; row <= radius; row++) {
      const width = Math.floor(Math.sqrt(radius * radius - row * row));
      this._surface.fillRect(x - width, y + row, width * 2 + 1, 1, row % 3 === 0 ? 2 : 3);
    }
  }

  private drawHud(timer: number, scores: readonly number[]): void {
    this._surface.fillRect(0, 0, WIDTH, 9, 0);
    this.drawText(this.time(timer), 3, 1, 15, 1);
    for (const [index, score] of scores.entries())
      this.drawRight(
        `P${index + 1} ${String(score).padStart(5, '0')}`,
        157,
        1 + index * 8,
        index ? 3 : 15,
      );
  }

  private time(seconds: number): string {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  private drawCentered(text: string, y: number, color: number, scale: number): void {
    const width = this.textWidth(text, scale);
    this.drawText(text, Math.floor((WIDTH - width) / 2), y, color, scale);
  }

  private drawRight(text: string, right: number, y: number, color: number): void {
    this.drawText(text, right - this.textWidth(text, 1), y, color, 1);
  }

  private drawText(text: string, x: number, y: number, color: number, scale: number): void {
    let cursor = x;
    for (const character of text.toUpperCase()) {
      const rows = ArcadePixelFont[character] ?? ArcadePixelFont[' '];
      for (const [row, cells] of (rows ?? []).entries())
        for (let column = 0; column < cells.length; column++)
          if (cells[column] === '1')
            this._surface.fillRect(cursor + column * scale, y + row * scale, scale, scale, color);
      cursor += 6 * scale;
    }
  }

  private textWidth(text: string, scale: number): number {
    return Math.max(0, text.length * 6 * scale - scale);
  }

  private frame(x: number, y: number, width: number, height: number, color: number): void {
    this._surface.fillRect(x, y, width, 1, color);
    this._surface.fillRect(x, y + height - 1, width, 1, color);
    this._surface.fillRect(x, y, 1, height, color);
    this._surface.fillRect(x + width - 1, y, 1, height, color);
  }

  // #endregion
}
