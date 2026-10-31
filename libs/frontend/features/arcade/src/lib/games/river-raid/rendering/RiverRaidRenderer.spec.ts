// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { RiverRaidGame } from '../model/RiverRaidGame';
import { RiverRaidRenderer } from './RiverRaidRenderer';

// #endregion

describe('RiverRaidRenderer', () => {
  it('keeps either pilot visible in both themes and expands a native bitmap without smoothing', () => {
    // arrange
    const painted: { x: number; y: number; width: number; height: number; tone: string }[] = [];
    const bitmap = {
      fillStyle: '',
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fillRect(x: number, y: number, width: number, height: number) {
        painted.push({ x, y, width, height, tone: this.fillStyle });
      },
    };
    const buffer = { width: 0, height: 0, getContext: () => bitmap };
    const destination = { setTransform: vi.fn(), imageSmoothingEnabled: true, drawImage: vi.fn() };
    const palette = {
      background: '#f4f1ee',
      surface: '#fdfdfc',
      foreground: '#373737',
      highlight: '#d6d3d0',
      middlelight: '#b9b6b3',
      lowlight: '#93908d',
    };
    const canvas = {
      width: 1200,
      height: 700,
      ownerDocument: {
        createElement: () => buffer,
        defaultView: {
          getComputedStyle: () => ({
            getPropertyValue: (name: string) =>
              palette[name.replace('--mosaik-scheme-', '') as keyof typeof palette],
          }),
        },
      },
    };
    const renderer = new RiverRaidRenderer();
    const game = new RiverRaidGame();

    for (const foreground of ['#373737', '#f4f1ee'])
      for (const player of [1, 2] as const) {
        palette.foreground = foreground;
        painted.length = 0;

        // act
        renderer.draw(
          destination as unknown as CanvasRenderingContext2D,
          { ...game.snapshot, player },
          canvas as unknown as HTMLCanvasElement,
        );

        // assert
        expect(
          painted.find(
            (pixel) => pixel.x === 80 && pixel.y === 141 && pixel.width === 1 && pixel.height === 1,
          )?.tone,
        ).toBe(foreground);
        expect(buffer).toMatchObject({ width: 160, height: 192 });
        expect(destination.imageSmoothingEnabled).toBe(false);
        expect(destination.drawImage).toHaveBeenLastCalledWith(buffer, 0, 0, 1200, 700);
      }
  });
});
