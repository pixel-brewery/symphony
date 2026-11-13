// @vitest-environment jsdom

// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ICaliforniaGamesSnapshot } from '../model/ICaliforniaGamesSnapshot';
import { CaliforniaGamesRenderer } from './CaliforniaGamesRenderer';

// #endregion

const BASE: ICaliforniaGamesSnapshot = {
  status: 'running',
  phase: 'title',
  frame: 24,
  players: 1,
  selectedEvent: 'bmx',
  currentEvent: null,
  flipped: false,
  godMode: false,
  countdown: 3,
  music: 'title',
  musicId: 1,
  resultId: 0,
  latestResults: [],
  highScores: [
    {
      event: 'bmx',
      entries: [
        { player: 1, score: 1500 },
        { player: 2, score: 800 },
      ],
    },
  ],
  newHighScorePlayers: [1],
  eventState: null,
  soundEvents: [],
};

afterEach(() => vi.restoreAllMocks());

describe('CaliforniaGamesRenderer', () => {
  it('renders the cartridge intro title menu and top-three screen at original Lynx resolution', () => {
    // arrange
    const renderer = new CaliforniaGamesRenderer();
    const phases = ['intro', 'title', 'menu', 'high-scores'] as const;

    // act
    const frames = phases.map((phase) => {
      const frame = renderer.render({ ...BASE, phase });
      const colors = new Set<number>();
      for (let y = 0; y < frame.height; y += 3)
        for (let x = 0; x < frame.width; x += 3) colors.add(frame.getPixel(x, y));
      return { width: frame.width, height: frame.height, colors };
    });

    // assert
    expect(frames.every((frame) => frame.width === 160 && frame.height === 102)).toBe(true);
    expect(frames.every((frame) => frame.colors.size >= 2)).toBe(true);
    expect(frames.map((frame) => [...frame.colors])).not.toEqual([
      [...frames[0]!.colors],
      [...frames[0]!.colors],
      [...frames[0]!.colors],
      [...frames[0]!.colors],
    ]);
    expect(renderer.render({ ...BASE, phase: 'high-scores' }).getPixel(11, 6)).toBe(15);
  });

  it('renders all four events with their event-specific scenery and HUD', () => {
    // arrange
    const renderer = new CaliforniaGamesRenderer();
    const snapshots: readonly ICaliforniaGamesSnapshot[] = [
      {
        ...BASE,
        phase: 'playing',
        currentEvent: 'bmx',
        eventState: {
          kind: 'bmx',
          timer: 88,
          progress: 20,
          trackLength: 1200,
          obstacles: [{ id: 1, distance: 38, lane: 0, kind: 'ramp' }],
          riders: [
            {
              player: 1,
              score: 100,
              finished: false,
              x: 0,
              y: 0,
              lane: 0,
              progress: 20,
              speed: 5,
              height: 6,
              rotation: 30,
              pose: 'air',
              crashes: 0,
              finishFrame: null,
            },
          ],
        },
      },
      {
        ...BASE,
        phase: 'playing',
        currentEvent: 'surfing',
        eventState: {
          kind: 'surfing',
          timer: 60,
          wavePhase: 1.4,
          pelicanX: 120,
          surfers: [
            {
              player: 1,
              score: 650,
              finished: false,
              x: 67,
              y: 47,
              angle: 18,
              speed: 4,
              wipeouts: 0,
              rideFrames: 120,
              tubeFrames: 30,
              pose: 'ride',
            },
          ],
        },
      },
      {
        ...BASE,
        phase: 'playing',
        currentEvent: 'half-pipe',
        eventState: {
          kind: 'half-pipe',
          timer: 45,
          cameraScale: 1,
          skaters: [
            {
              player: 1,
              score: 320,
              finished: false,
              x: 72,
              y: 76,
              velocity: 3,
              rotation: 90,
              falls: 0,
              handplantFrames: 0,
              pose: 'aerial',
            },
          ],
        },
      },
      {
        ...BASE,
        phase: 'playing',
        currentEvent: 'foot-bag',
        eventState: {
          kind: 'foot-bag',
          timer: 72,
          seagullX: 91,
          playersState: [
            {
              player: 1,
              score: 410,
              finished: false,
              x: 72,
              bagX: 81,
              bagY: 69,
              bagVelocityX: 1,
              bagVelocityY: -2,
              combo: 50,
              pose: 'kick',
              drops: 0,
              lastMove: 'heel-lift',
            },
          ],
        },
      },
    ];

    // act
    const samples = snapshots.map((snapshot) => {
      const frame = renderer.render(snapshot);
      const colors = new Set<number>();
      for (let y = 0; y < 102; y += 3)
        for (let x = 0; x < 160; x += 3) colors.add(frame.getPixel(x, y));
      return colors;
    });

    // assert
    expect(samples.every((colors) => colors.size >= 5)).toBe(true);
    expect(samples.map((colors) => [...colors])).not.toEqual([
      [...samples[0]!],
      [...samples[0]!],
      [...samples[0]!],
      [...samples[0]!],
    ]);
  });

  it('scales the indexed buffer without interpolation and honors screen flipping', () => {
    // arrange
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 612;
    const imageData = { data: new Uint8ClampedArray(160 * 102 * 4) } as ImageData;
    const bitmap = { createImageData: vi.fn(() => imageData), putImageData: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      bitmap as unknown as CanvasRenderingContext2D,
    );
    const visible = {
      setTransform: vi.fn(),
      imageSmoothingEnabled: true,
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
    const renderer = new CaliforniaGamesRenderer();

    // act
    renderer.draw(
      visible as unknown as CanvasRenderingContext2D,
      { ...BASE, flipped: true },
      canvas,
    );

    // assert
    expect(bitmap.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    expect(visible.imageSmoothingEnabled).toBe(false);
    expect(visible.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 160, height: 102 }),
      0,
      0,
      960,
      612,
    );
  });
});
