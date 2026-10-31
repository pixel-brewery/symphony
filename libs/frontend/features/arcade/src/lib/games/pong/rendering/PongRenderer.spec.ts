// @vitest-environment jsdom

// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PongGame } from '../model/PongGame';
import { PongRenderer } from './PongRenderer';

// #endregion

function createHarness() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const colors = ['#f4f1ee', '#fdfdfc', '#d6d3d0', '#b9b6b3', '#93908d', '#373737'];
  const roles = ['background', 'surface', 'highlight', 'middlelight', 'lowlight', 'foreground'];
  roles.forEach((role, index) =>
    canvas.style.setProperty(`--mosaik-scheme-${role}`, colors[index]!),
  );
  const paints: { color: string; rect: number[] }[] = [];
  const bitmap = {
    fillStyle: '',
    fillRect: vi.fn((...rect: number[]) => paints.push({ color: bitmap.fillStyle, rect })),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    bitmap as unknown as CanvasRenderingContext2D,
  );
  const output = { setTransform: vi.fn(), drawImage: vi.fn(), imageSmoothingEnabled: true };
  return { canvas, colors, paints, output, renderer: new PongRenderer() };
}

describe('PongRenderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('preserves the original 7448 decoder forms of six and nine without modern tails', () => {
    // arrange
    const { canvas, paints, output, renderer } = createHarness();
    const snapshot = { ...new PongGame().snapshot, scores: [6, 9] as const };
    // act
    renderer.draw(output as unknown as CanvasRenderingContext2D, snapshot, canvas);
    const scoreRects = paints.filter(({ color }) => color === '#93908d').map(({ rect }) => rect);
    // assert
    expect(scoreRects).not.toContainEqual([95, 16, 16, 4]);
    expect(scoreRects).toContainEqual([95, 44, 16, 4]);
    expect(scoreRects).toContainEqual([287, 16, 16, 4]);
    expect(scoreRects).not.toContainEqual([287, 44, 16, 4]);
  });

  it('fills wide and tall canvases with sharp pixels and only live Symphony scheme tones', () => {
    // arrange
    const { canvas, colors, paints, output, renderer } = createHarness();
    const snapshot = new PongGame().snapshot;
    canvas.width = 1600;
    canvas.height = 900;
    // act
    renderer.draw(output as unknown as CanvasRenderingContext2D, snapshot, canvas);
    canvas.width = 600;
    canvas.height = 1200;
    canvas.style.setProperty('--mosaik-scheme-foreground', '#fafafa');
    renderer.draw(output as unknown as CanvasRenderingContext2D, snapshot, canvas);
    // assert
    expect(output.drawImage).toHaveBeenNthCalledWith(
      1,
      expect.any(HTMLCanvasElement),
      0,
      0,
      1600,
      900,
    );
    expect(output.drawImage).toHaveBeenNthCalledWith(
      2,
      expect.any(HTMLCanvasElement),
      0,
      0,
      600,
      1200,
    );
    expect(output.imageSmoothingEnabled).toBe(false);
    expect(paints.every(({ color }) => [...colors, '#fafafa'].includes(color))).toBe(true);
    expect(paints.some(({ color }) => color === '#fafafa')).toBe(true);
  });

  it('uses the two score-decoder regions with 16 by 32 digits and suppresses leading zeroes', () => {
    // arrange
    const { canvas, paints, output, renderer } = createHarness();
    const snapshot = { ...new PongGame().snapshot, scores: [8, 15] as const };
    // act
    renderer.draw(output as unknown as CanvasRenderingContext2D, snapshot, canvas);
    const scoreRects = paints.filter(({ color }) => color === '#93908d').map(({ rect }) => rect);
    // assert
    expect(scoreRects).toContainEqual([95, 16, 16, 4]);
    expect(scoreRects).toContainEqual([95, 44, 16, 4]);
    expect(scoreRects).toContainEqual([267, 16, 4, 16]);
    expect(scoreRects).toContainEqual([287, 16, 16, 4]);
    expect(scoreRects.every(([x]) => x! >= 95)).toBe(true);
    expect(paints.some(({ rect }) => rect[0] === 47 && rect[2] === 4 && rect[3] === 15)).toBe(
      false,
    );
  });
});
