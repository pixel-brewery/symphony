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
  'foot-bag': 'FOOTBAG',
};

type Point = readonly [number, number];

/** Rasterizes the complete Lynx California Games flow into a 160×102 indexed framebuffer. @public */
export class CaliforniaGamesRenderer {
  // #region Fields

  private readonly _surface = new CaliforniaGamesSurface();
  private _buffer: HTMLCanvasElement | null = null;
  private _bufferContext: CanvasRenderingContext2D | null = null;

  // #endregion

  // #region Methods

  /** Draws one nearest-neighbor frame into the visible responsive canvas without distorting pixels. @public */
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
    const scale = Math.max(1, Math.floor(Math.min(canvas.width / WIDTH, canvas.height / HEIGHT)));
    const targetWidth = WIDTH * scale;
    const targetHeight = HEIGHT * scale;
    const targetX = Math.floor((canvas.width - targetWidth) / 2);
    const targetY = Math.floor((canvas.height - targetHeight) / 2);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.imageSmoothingEnabled = false;
    context.fillStyle = CaliforniaGamesPalette[0];
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this._buffer, targetX, targetY, targetWidth, targetHeight);
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
        this.drawMenu(snapshot.selectedEvent, snapshot.players);
        break;
      case 'high-scores':
        this.drawHighScores(snapshot);
        break;
      case 'countdown':
      case 'playing':
      case 'event-over':
        this.drawEvent(snapshot);
        if (snapshot.phase === 'countdown' && snapshot.currentEvent !== 'surfing')
          this.drawOutlinedCentered('GET READY', 47, 3, 0, 1);
        if (snapshot.phase === 'event-over') this.drawOutlinedCentered('EVENT OVER', 45, 3, 0, 1);
        break;
    }
    if (snapshot.status === 'paused') {
      this._surface.fillRect(43, 41, 74, 19, 0);
      this.frame(42, 40, 76, 21, 15);
      this.drawCentered('PAUSED', 47, 15, 1);
    }
    return this._surface;
  }

  private drawIntro(frame: number): void {
    this._surface.clear(0);
    const reveal = Math.min(10, Math.floor(frame / 5));
    for (let index = 0; index < reveal; index++) {
      const x = 42 + index * 7;
      const height = 6 + index * 3;
      this._surface.line(x, 63, x + 15, 63 - height, index < 4 ? 6 : 7);
      this._surface.line(x + 15, 63 - height, x + 24, 63, index < 6 ? 3 : 2);
    }
    this.drawItalicText('EPYX', 46, 34, 6, 2);
    this.drawOutlinedCentered('PRESENTS', 73, 3, 2, 1);
  }

  private drawTitle(frame: number): void {
    const skyVersion = frame >= 270;
    if (skyVersion) this.drawTitleSky();
    else this._surface.clear(0);
    this.drawLicensePlate(skyVersion);
    if (!skyVersion) {
      this.drawItalicText('EPYX', 8, 8, 6, 1);
      this.drawItalicText('PRESENTS', 47, 9, 3, 1);
      this.drawText('Licensed to Atari Corp.', 45, 91, 6, 1);
    } else {
      this.drawOutlinedCentered('PRESS A OR B', 91, frame % 48 < 36 ? 1 : 6, 7, 1);
    }
  }

  private drawTitleSky(): void {
    this._surface.clear(6);
    this._surface.fillRect(0, 0, WIDTH, 8, 7);
    this.drawCloud(14, 10, 1);
    this.drawCloud(102, 15, 2);
    this._surface.fillRect(0, 80, WIDTH, 22, 3);
    this.ditherRect(0, 80, WIDTH, 22, 3, 9, 5);
  }

  private drawLicensePlate(skyVersion: boolean): void {
    const top = skyVersion ? 19 : 27;
    this._surface.fillRect(17, top + 3, 128, 57, 13);
    this._surface.fillRect(19, top, 124, 57, 14);
    this.frame(20, top + 1, 122, 55, 1);
    this.frame(23, top + 5, 116, 47, 13);
    for (const screwX of [25, 136]) {
      this._surface.fillRect(screwX, top + 5, 3, 3, 13);
      this._surface.setPixel(screwX + 1, top + 6, 1);
    }
    this._surface.fillRect(26, top + 10, 110, 2, 3);
    this._surface.fillRect(26, top + 13, 110, 1, 1);
    this.drawItalicText('CALIFORNIA', 47, top + 8, 2, 1);
    this._surface.fillRect(77, top + 8, 8, 8, 3);
    this._surface.fillRect(79, top + 10, 4, 4, 2);
    this.drawText('GAMES', 36, top + 22, 13, 3);
    this.drawText('GAMES', 34, top + 20, 15, 3);
    this.drawText('GAMES', 32, top + 18, 7, 3);
  }

  private drawMenu(selected: CaliforniaGamesEvent, players: 1 | 2): void {
    this._surface.clear(7);
    const bands = [7, 5, 6, 5, 7, 6];
    for (let index = 0; index < bands.length; index++)
      this._surface.fillRect(0, 22 + index * 9, WIDTH, 7, bands[index] ?? 7);
    this._surface.fillRect(0, 84, WIDTH, 18, 3);
    this.ditherRect(0, 84, WIDTH, 18, 3, 1, 4);
    this.drawMenuPalm();
    const events: readonly CaliforniaGamesEvent[] = ['bmx', 'surfing', 'half-pipe', 'foot-bag'];
    for (const [index, event] of events.entries()) {
      const y = 7 + index * 21;
      const text = EVENT_NAMES[event];
      const width = this.textWidth(text, 2);
      const x = Math.max(37, Math.floor((WIDTH + 24 - width) / 2));
      this.drawItalicText(text, x + 2, y + 2, 14, 2);
      this.drawItalicText(text, x + 1, y + 1, 6, 2);
      this.drawItalicText(text, x, y, event === selected ? 2 : 15, 2);
    }
    this.drawOutlinedText(`${players}P`, 139, 91, 1, 8, 1);
  }

  private drawMenuPalm(): void {
    this._surface.drawSprite(CaliforniaGamesSpritePatterns.palmTop ?? [], -3, 11);
    for (let row = 0; row < 69; row++) {
      const x = 25 - Math.floor(row / 19);
      this._surface.fillRect(x, 24 + row, 4, 1, row % 5 === 0 ? 9 : 8);
      if (row % 7 === 0) this._surface.setPixel(x - 1, 24 + row, 13);
    }
  }

  private drawHighScores(snapshot: ICaliforniaGamesSnapshot): void {
    this._surface.clear(7);
    for (let y = 0; y < HEIGHT; y += 5) this._surface.fillRect(0, y, WIDTH, 2, y % 10 ? 5 : 6);
    this._surface.fillRect(10, 5, 140, 92, 0);
    this.frame(11, 6, 138, 90, 15);
    this.drawOutlinedCentered('HIGH SCORES', 11, 3, 7, 1);
    this.drawOutlinedCentered(EVENT_NAMES[snapshot.selectedEvent], 24, 2, 0, 1);
    const board = snapshot.highScores.find((entry) => entry.event === snapshot.selectedEvent);
    for (let index = 0; index < 3; index++) {
      const entry = board?.entries[index];
      const color = entry && snapshot.newHighScorePlayers.includes(entry.player) ? 3 : 15;
      this.drawText(`${index + 1}.`, 30, 42 + index * 13, color, 1);
      this.drawText(entry ? `PLAYER ${entry.player}` : '---', 49, 42 + index * 13, color, 1);
      this.drawRight(
        entry ? String(entry.score).padStart(6, '0') : '000000',
        134,
        42 + index * 13,
        color,
      );
    }
    this.drawCentered('A/B CONTINUE', 86, 6, 1);
  }

  private drawEvent(snapshot: ICaliforniaGamesSnapshot): void {
    const state = snapshot.eventState;
    if (!state) {
      this.drawTitle(snapshot.frame);
      return;
    }
    switch (state.kind) {
      case 'bmx':
        this.drawBmx(state);
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
    state: Extract<NonNullable<ICaliforniaGamesSnapshot['eventState']>, { kind: 'bmx' }>,
  ): void {
    this._surface.clear(4);
    this.ditherRect(0, 0, WIDTH, HEIGHT, 4, 5, 13);
    this.polygon(
      [
        [-22, 17],
        [27, 17],
        [89, 102],
        [-22, 102],
      ],
      8,
    );
    for (let y = 18; y < HEIGHT; y++) {
      const left = -22;
      const right = 27 + (y - 17) * 0.73;
      for (let x = Math.max(0, Math.floor(left)); x < Math.min(WIDTH, right); x++) {
        const pattern = this.noise(x, y, Math.floor(state.progress / 8)) % 23;
        if (pattern < 6) this._surface.setPixel(x, y, pattern < 2 ? 9 : pattern === 2 ? 13 : 14);
      }
    }
    this._surface.line(25, 18, 87, 102, 9);
    this._surface.line(27, 18, 89, 102, 13);
    for (const obstacle of state.obstacles) {
      const distance = obstacle.distance - state.progress;
      if (distance < -12 || distance > 105) continue;
      const y = 23 + (105 - distance) * 0.65;
      const roadRight = 27 + (y - 17) * 0.73;
      const center = roadRight * 0.52;
      const x = center + obstacle.lane * Math.max(6, roadRight * 0.34);
      const pattern = CaliforniaGamesSpritePatterns[obstacle.kind] ?? [];
      this._surface.drawSprite(pattern, x - 5, y - 3, {
        scaleX: y > 76 ? 2 : 1,
        shear: obstacle.kind === 'cliff' ? 0.3 : 0,
      });
    }
    for (const rider of state.riders) {
      const x = 34 + rider.lane * 15;
      const y = 50 - rider.height * 0.35;
      this._surface.drawSprite(CaliforniaGamesSpritePatterns.bmx ?? [], x - 10, y - 12, {
        flipX: Math.cos(rider.rotation) < 0,
        shear: Math.sin(rider.rotation) * 0.2,
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
    this.drawCloud(17, 12, 1);
    this._surface.fillRect(0, 26, WIDTH, 76, 7);
    this._surface.fillRect(0, 27, WIDTH, 3, 5);
    this._surface.fillRect(0, 30, WIDTH, 2, 15);
    const crest = 32 + Math.round(Math.sin(state.wavePhase) * 2);
    for (let x = 0; x < WIDTH; x++) {
      const waveTop = crest + Math.round(Math.sin((x + state.wavePhase * 17) / 10) * 3);
      this._surface.fillRect(x, waveTop, 1, HEIGHT - waveTop, 7);
      if ((x + Math.floor(state.wavePhase * 10)) % 4 === 0) {
        this._surface.setPixel(x, waveTop, 15);
        this._surface.setPixel(x, waveTop + 1, 6);
      }
      for (let y = waveTop + 5; y < HEIGHT; y += 7)
        if ((x * 7 + y * 3) % 13 < 3) this._surface.setPixel(x, y, y > 87 ? 6 : 5);
    }
    const tubeX = 92 + Math.round(Math.sin(state.wavePhase) * 5);
    for (let column = tubeX; column < WIDTH; column++) {
      const distance = column - tubeX;
      const top = crest - Math.round(Math.sqrt(distance) * 1.7);
      const bottom = Math.min(HEIGHT - 1, crest + 20 + Math.round(distance * 0.45));
      this._surface.line(column, top, column, bottom, distance % 4 === 0 ? 15 : 6);
      for (let y = top; y <= bottom; y++)
        if ((column * 11 + y * 7) % 17 < 4) this._surface.setPixel(column, y, 15);
    }
    for (const surfer of state.surfers)
      this._surface.drawSprite(
        CaliforniaGamesSpritePatterns.surfer ?? [],
        surfer.x - 9,
        surfer.y - 13,
        {
          flipX: surfer.angle < 0,
          shear: surfer.angle / 90,
          checkerTransparency: surfer.tubeFrames > 0,
        },
      );
    if (state.timer < 15)
      this._surface.drawSprite(
        CaliforniaGamesSpritePatterns.pelican ?? [],
        state.pelicanX - 7,
        24,
        {
          flipX: true,
        },
      );
    if (
      snapshot.phase === 'countdown' ||
      state.surfers.every((surfer) => surfer.pose === 'waiting')
    )
      this.drawOutlinedCentered('GET READY', 54, 3, 0, 1);
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
    this.drawCloud(55, 8, 2);
    this.polygon(
      [
        [0, 45],
        [25, 31],
        [52, 41],
        [75, 29],
        [111, 45],
        [160, 35],
        [160, 61],
        [0, 61],
      ],
      8,
    );
    this.ditherRect(0, 39, WIDTH, 22, 8, 9, 5);
    this.drawText('HOLLYWOOD', -5, 45, 1, 1);
    this._surface.fillRect(0, 61, WIDTH, 41, 8);
    this.drawPipeSupports();
    this.polygon(
      [
        [23, 43],
        [46, 55],
        [67, 81],
        [94, 81],
        [115, 55],
        [137, 43],
        [137, 102],
        [23, 102],
      ],
      14,
    );
    this.polygon(
      [
        [35, 45],
        [51, 59],
        [69, 77],
        [91, 77],
        [109, 59],
        [125, 45],
        [125, 102],
        [35, 102],
      ],
      13,
    );
    for (let y = 50; y < HEIGHT; y += 7) this._surface.line(24, y, 136, y, 1);
    const closeScale = state.cameraScale > 1.34 ? 2 : 1;
    for (const skater of state.skaters)
      this._surface.drawSprite(
        CaliforniaGamesSpritePatterns.skater ?? [],
        skater.x - 5 * closeScale,
        skater.y - 14 * closeScale,
        {
          scaleX: closeScale,
          scaleY: closeScale,
          flipX: skater.velocity < 0,
          shear: skater.rotation / 720,
        },
      );
    this.drawHalfPipeHud(
      state.timer,
      state.skaters.map((skater) => skater.score),
    );
    if (snapshot.godMode) this.drawText('FREE', 69, 94, 3, 1);
  }

  private drawPipeSupports(): void {
    for (const x of [18, 139]) {
      this._surface.fillRect(x, 48, 4, 54, 14);
      this._surface.fillRect(x + 2, 48, 1, 54, 1);
    }
    for (const x of [27, 128]) {
      this._surface.line(x, 53, x + (x < 80 ? 17 : -17), 99, 0);
      this._surface.line(x + (x < 80 ? 17 : -17), 53, x, 99, 0);
    }
  }

  private drawFootBag(
    snapshot: ICaliforniaGamesSnapshot,
    state: Extract<NonNullable<ICaliforniaGamesSnapshot['eventState']>, { kind: 'foot-bag' }>,
  ): void {
    this._surface.clear(7);
    this.drawSanFranciscoSkyline();
    this._surface.fillRect(0, 49, WIDTH, 22, 7);
    this.ditherRect(0, 49, WIDTH, 22, 7, 5, 3);
    this._surface.fillRect(0, 71, WIDTH, 21, 4);
    this.ditherRect(0, 71, WIDTH, 21, 4, 0, 4);
    this._surface.fillRect(0, 92, WIDTH, 10, 13);
    this._surface.fillRect(0, 94, WIDTH, 2, 14);
    for (let x = 8; x < WIDTH; x += 22) {
      this._surface.fillRect(x, 91, 3, 7, 14);
      this._surface.fillRect(x - 2, 90, 7, 2, 13);
    }
    this._surface.drawSprite(CaliforniaGamesSpritePatterns.seagull ?? [], state.seagullX - 6, 15, {
      flipX: snapshot.frame % 180 > 90,
    });
    for (const player of state.playersState) {
      this._surface.drawSprite(
        CaliforniaGamesSpritePatterns.footbag ?? [],
        player.x - 5,
        player.pose === 'jump' ? 43 : 54,
        {
          scaleY: 2,
          flipX: player.player === 2,
          shear: player.pose === 'trip' ? 0.15 : 0,
        },
      );
      this._surface.drawSprite(CaliforniaGamesSpritePatterns.bag ?? [], player.bagX, player.bagY, {
        checkerTransparency: snapshot.frame % 4 < 2,
      });
    }
    this.drawFootBagHud(state);
  }

  private drawSanFranciscoSkyline(): void {
    this._surface.fillRect(0, 0, WIDTH, 18, 7);
    this.polygon(
      [
        [0, 35],
        [19, 24],
        [43, 34],
        [70, 19],
        [93, 33],
        [122, 17],
        [160, 31],
        [160, 49],
        [0, 49],
      ],
      14,
    );
    this.drawBridge();
    const buildings: readonly (readonly [number, number, number, number])[] = [
      [59, 23, 9, 26],
      [69, 18, 11, 31],
      [81, 12, 8, 37],
      [91, 20, 12, 29],
      [104, 7, 7, 42],
      [112, 15, 12, 34],
      [126, 23, 8, 26],
    ];
    for (const [x, y, width, height] of buildings) {
      this._surface.fillRect(x, y, width, height, x % 3 === 0 ? 13 : 14);
      for (let row = y + 3; row < y + height; row += 5)
        for (let column = x + 2; column < x + width - 1; column += 4)
          this._surface.setPixel(column, row, column % 2 ? 1 : 0);
    }
  }

  private drawBridge(): void {
    this._surface.fillRect(7, 19, 4, 30, 13);
    this._surface.fillRect(42, 20, 4, 29, 13);
    this._surface.line(9, 21, 44, 22, 13);
    this._surface.line(9, 24, 44, 25, 1);
    for (let x = 11; x < 44; x += 4) {
      const curve = Math.round(((x - 27) * (x - 27)) / 44);
      this._surface.line(x, 21, x, 28 + curve, 13);
    }
    this._surface.line(0, 34, 58, 34, 13);
  }

  private drawFootBagHud(
    state: Extract<NonNullable<ICaliforniaGamesSnapshot['eventState']>, { kind: 'foot-bag' }>,
  ): void {
    const primary = state.playersState[0];
    this.drawOutlinedText(String(primary?.score ?? 0).padStart(6, '0'), 2, 2, 4, 7, 1);
    this.drawOutlinedText(String(primary?.combo ?? 0), 67, 2, 2, 7, 1);
    this.drawOutlinedText(this.time(state.timer), 128, 2, 3, 7, 1);
  }

  private drawHud(timer: number, scores: readonly number[]): void {
    this.drawOutlinedText(this.time(timer), 3, 2, 3, 0, 1);
    for (const [index, score] of scores.entries())
      this.drawRightOutlined(String(score).padStart(5, '0'), 157, 2 + index * 8, index ? 1 : 3, 0);
  }

  private drawHalfPipeHud(timer: number, scores: readonly number[]): void {
    this.drawOutlinedText(this.time(timer), 3, 93, 3, 0, 1);
    for (const [index, score] of scores.entries())
      this.drawRightOutlined(String(score).padStart(5, '0'), 157, 93 - index * 8, index ? 1 : 3, 0);
  }

  private drawCloud(x: number, y: number, scale: number): void {
    this._surface.fillRect(x, y + 3 * scale, 20 * scale, 3 * scale, 1);
    this._surface.fillRect(x + 4 * scale, y + scale, 11 * scale, 5 * scale, 1);
    this._surface.fillRect(x + 8 * scale, y, 4 * scale, 6 * scale, 15);
    this._surface.fillRect(x + 2 * scale, y + 4 * scale, 18 * scale, scale, 15);
  }

  private ditherRect(
    x: number,
    y: number,
    width: number,
    height: number,
    base: number,
    accent: number,
    modulus: number,
  ): void {
    this._surface.fillRect(x, y, width, height, base);
    for (let row = y; row < y + height; row++)
      for (let column = x; column < x + width; column++)
        if (this.noise(column, row, modulus) % modulus === 0)
          this._surface.setPixel(column, row, accent);
  }

  private noise(x: number, y: number, seed: number): number {
    let value = (Math.floor(x) * 374_761_393 + Math.floor(y) * 668_265_263 + seed * 69_069) | 0;
    value = (value ^ (value >>> 13)) * 1_274_126_177;
    return (value ^ (value >>> 16)) >>> 0;
  }

  private polygon(points: readonly Point[], color: number): void {
    const minimumY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))));
    const maximumY = Math.min(HEIGHT - 1, Math.ceil(Math.max(...points.map((point) => point[1]))));
    for (let y = minimumY; y <= maximumY; y++) {
      const intersections: number[] = [];
      for (let index = 0; index < points.length; index++) {
        const start = points[index]!;
        const end = points[(index + 1) % points.length]!;
        if ((start[1] <= y && end[1] > y) || (end[1] <= y && start[1] > y))
          intersections.push(
            start[0] + ((y - start[1]) * (end[0] - start[0])) / (end[1] - start[1]),
          );
      }
      intersections.sort((left, right) => left - right);
      for (let index = 0; index + 1 < intersections.length; index += 2)
        this._surface.fillRect(
          Math.ceil(intersections[index] ?? 0),
          y,
          Math.floor(intersections[index + 1] ?? 0) - Math.ceil(intersections[index] ?? 0) + 1,
          1,
          color,
        );
    }
  }

  private time(seconds: number): string {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  private drawCentered(text: string, y: number, color: number, scale: number): void {
    this.drawText(text, Math.floor((WIDTH - this.textWidth(text, scale)) / 2), y, color, scale);
  }

  private drawOutlinedCentered(
    text: string,
    y: number,
    color: number,
    outline: number,
    scale: number,
  ): void {
    this.drawOutlinedText(
      text,
      Math.floor((WIDTH - this.textWidth(text, scale)) / 2),
      y,
      color,
      outline,
      scale,
    );
  }

  private drawRight(text: string, right: number, y: number, color: number): void {
    this.drawText(text, right - this.textWidth(text, 1), y, color, 1);
  }

  private drawRightOutlined(
    text: string,
    right: number,
    y: number,
    color: number,
    outline: number,
  ): void {
    this.drawOutlinedText(text, right - this.textWidth(text, 1), y, color, outline, 1);
  }

  private drawOutlinedText(
    text: string,
    x: number,
    y: number,
    color: number,
    outline: number,
    scale: number,
  ): void {
    for (const [offsetX, offsetY] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const)
      this.drawText(text, x + offsetX, y + offsetY, outline, scale);
    this.drawText(text, x, y, color, scale);
  }

  private drawItalicText(text: string, x: number, y: number, color: number, scale: number): void {
    let cursor = x;
    for (const character of text.toUpperCase()) {
      const rows = ArcadePixelFont[character] ?? ArcadePixelFont[' '];
      for (const [row, cells] of (rows ?? []).entries()) {
        const slant = Math.floor((7 - row) / 3) * scale;
        for (let column = 0; column < cells.length; column++)
          if (cells[column] === '1')
            this._surface.fillRect(
              cursor + column * scale + slant,
              y + row * scale,
              scale,
              scale,
              color,
            );
      }
      cursor += 6 * scale;
    }
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
