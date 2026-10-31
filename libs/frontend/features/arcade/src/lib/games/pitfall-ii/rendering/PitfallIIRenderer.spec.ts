// @vitest-environment jsdom

// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PitfallIIGame } from '../model/PitfallIIGame';
import { PitfallIIRenderer } from './PitfallIIRenderer';

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
  return { canvas, colors, paints, bitmap, output, renderer: new PitfallIIRenderer() };
}

describe('PitfallIIRenderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('fills wide and tall destination surfaces using only the current live scheme colors', () => {
    // arrange
    const { canvas, colors, paints, output, renderer } = createHarness();
    const snapshot = new PitfallIIGame().snapshot;
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

  it('clips the scrolling global world between fixed score and footer bands without changing its snapshot', () => {
    // arrange
    const { canvas, bitmap, output, renderer } = createHarness();
    const snapshot = {
      ...new PitfallIIGame().snapshot,
      chamber: 4,
      camera: { x: 640, y: 412.4, width: 160, height: 192 },
    };
    const original = JSON.stringify(snapshot);

    // act
    renderer.draw(output as unknown as CanvasRenderingContext2D, snapshot, canvas);

    // assert
    expect(bitmap.rect).toHaveBeenCalledWith(0, 24, 160, 152);
    expect(bitmap.translate).toHaveBeenCalledWith(-640, -412);
    expect(bitmap.restore).toHaveBeenCalledOnce();
    expect(JSON.stringify(snapshot)).toBe(original);
  });
});
