// @vitest-environment jsdom

// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeaquestGame } from '../model/SeaquestGame';
import { SeaquestRenderer } from './SeaquestRenderer';

// #endregion

function createHarness() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const colors = ['#f4f1ee', '#fdfdfc', '#d6d3d0', '#b9b6b3', '#93908d', '#373737'];
  const roles = ['background', 'surface', 'highlight', 'middlelight', 'lowlight', 'foreground'];
  roles.forEach((role, index) =>
    canvas.style.setProperty(`--mosaik-scheme-${role}`, colors[index] ?? ''),
  );
  const paints: string[] = [];
  const bitmap = {
    fillStyle: '',
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    translate: vi.fn(),
    fillRect: vi.fn(() => paints.push(bitmap.fillStyle)),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    bitmap as unknown as CanvasRenderingContext2D,
  );
  const output = { setTransform: vi.fn(), drawImage: vi.fn(), imageSmoothingEnabled: true };
  return { canvas, colors, paints, bitmap, output, renderer: new SeaquestRenderer() };
}

describe('SeaquestRenderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('fills wide and tall destination surfaces using only the current live scheme colors', () => {
    // arrange
    const { canvas, colors, paints, output, renderer } = createHarness();
    const snapshot = new SeaquestGame().snapshot;
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
    expect(paints.every((color) => [...colors, '#fafafa'].includes(color))).toBe(true);
    expect(paints).toContain('#fafafa');
  });
});
