// @vitest-environment jsdom

// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { JungleHuntGame } from '../model/JungleHuntGame';
import { JungleHuntRenderer } from './JungleHuntRenderer';

// #endregion

afterEach(() => vi.restoreAllMocks());

describe('JungleHuntRenderer', () => {
  it('renders every stage in a 160 by 192 buffer and stretches it without interpolation using only public scheme colors', () => {
    // arrange
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 700;
    const tones = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'];
    ['background', 'surface', 'highlight', 'middlelight', 'lowlight', 'foreground'].forEach(
      (role, index) => canvas.style.setProperty(`--mosaik-scheme-${role}`, tones[index]!),
    );
    const colors = new Set<string>();
    const buffer = { fillStyle: '', fillRect: vi.fn(() => colors.add(buffer.fillStyle)) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      buffer as unknown as CanvasRenderingContext2D,
    );
    const visible = { setTransform: vi.fn(), imageSmoothingEnabled: true, drawImage: vi.fn() };
    const game = new JungleHuntGame();
    game.startNewGame();
    const renderer = new JungleHuntRenderer();
    // act
    for (const stage of ['vines', 'river', 'boulders', 'rescue'] as const)
      renderer.draw(
        visible as unknown as CanvasRenderingContext2D,
        { ...game.snapshot, stage },
        canvas,
      );
    // assert
    expect(visible.imageSmoothingEnabled).toBe(false);
    expect(visible.drawImage).toHaveBeenCalledTimes(4);
    expect(visible.drawImage.mock.calls[0]).toEqual([
      expect.objectContaining({ width: 160, height: 192 }),
      0,
      0,
      1100,
      700,
    ]);
    expect(colors.size).toBe(6);
    expect([...colors].every((color) => tones.includes(color))).toBe(true);
  });

  it.each([
    { background: '#f4f1ee', foreground: '#373737', surface: '#fdfdfc' },
    { background: '#202020', foreground: '#eeeeee', surface: '#303030' },
  ])('keeps the explorer and Lady Penelope visible against the $background playfield', (scheme) => {
    // arrange
    const canvas = document.createElement('canvas');
    for (const [role, value] of Object.entries(scheme))
      canvas.style.setProperty(`--mosaik-scheme-${role}`, value);
    const pixels: { x: number; y: number; color: string }[] = [];
    const buffer = {
      fillStyle: '',
      fillRect: (x: number, y: number, width: number, height: number) => {
        if (width === 1 && height === 1) pixels.push({ x, y, color: buffer.fillStyle });
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      buffer as unknown as CanvasRenderingContext2D,
    );
    const visible = { setTransform: vi.fn(), imageSmoothingEnabled: true, drawImage: vi.fn() };
    const game = new JungleHuntGame();
    game.startNewGame();
    const renderer = new JungleHuntRenderer();
    // act
    renderer.draw(visible as unknown as CanvasRenderingContext2D, game.snapshot, canvas);
    // assert
    expect(
      pixels.filter(
        (pixel) =>
          pixel.x >= 128 &&
          pixel.x <= 136 &&
          pixel.y >= 115 &&
          pixel.y <= 122 &&
          pixel.color === scheme.foreground,
      ).length,
    ).toBeGreaterThan(8);
    // act
    pixels.length = 0;
    renderer.draw(
      visible as unknown as CanvasRenderingContext2D,
      { ...game.snapshot, stage: 'rescue' },
      canvas,
    );
    // assert
    expect(
      pixels.filter(
        (pixel) =>
          pixel.x >= 5 &&
          pixel.x <= 13 &&
          pixel.y >= 152 &&
          pixel.y <= 159 &&
          pixel.color === scheme.foreground,
      ).length,
    ).toBeGreaterThan(20);
  });
});
