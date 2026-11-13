// #region Imports

import type { ICaliforniaGamesSpriteOptions } from './ICaliforniaGamesSpriteOptions';

// #endregion

const WIDTH = 160;
const HEIGHT = 102;

/** Owns the fixed 160×102 four-bit framebuffer used by the Lynx reconstruction. @public */
export class CaliforniaGamesSurface {
  // #region Fields

  private readonly _pixels = new Uint8Array(WIDTH * HEIGHT);

  // #endregion

  // #region Properties

  /** Logical Lynx width. @public */
  public get width(): number {
    return WIDTH;
  }

  /** Logical Lynx height. @public */
  public get height(): number {
    return HEIGHT;
  }

  // #endregion

  // #region Methods

  /** Clears every pixel to one four-bit palette index. @public */
  public clear(color: number): void {
    this._pixels.fill(color & 0x0f);
  }

  /** Returns the clipped pixel value or zero outside the logical screen. @public */
  public getPixel(x: number, y: number): number {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return 0;
    return this._pixels[Math.floor(y) * WIDTH + Math.floor(x)] ?? 0;
  }

  /** Sets one pixel while clipping writes outside the logical screen. @public */
  public setPixel(x: number, y: number, color: number): void {
    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);
    if (pixelX < 0 || pixelX >= WIDTH || pixelY < 0 || pixelY >= HEIGHT) return;
    this._pixels[pixelY * WIDTH + pixelX] = color & 0x0f;
  }

  /** Fills a clipped axis-aligned rectangle. @public */
  public fillRect(x: number, y: number, width: number, height: number, color: number): void {
    const left = Math.max(0, Math.floor(x));
    const top = Math.max(0, Math.floor(y));
    const right = Math.min(WIDTH, Math.ceil(x + width));
    const bottom = Math.min(HEIGHT, Math.ceil(y + height));
    for (let row = top; row < bottom; row++)
      this._pixels.fill(color & 0x0f, row * WIDTH + left, row * WIDTH + right);
  }

  /** Draws a clipped integer line with Bresenham stepping. @public */
  public line(x0: number, y0: number, x1: number, y1: number, color: number): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const endX = Math.round(x1);
    const endY = Math.round(y1);
    const dx = Math.abs(endX - x);
    const sx = x < endX ? 1 : -1;
    const dy = -Math.abs(endY - y);
    const sy = y < endY ? 1 : -1;
    let error = dx + dy;
    while (true) {
      this.setPixel(x, y, color);
      if (x === endX && y === endY) break;
      const doubled = error * 2;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }
  }

  /**
   * Projects hexadecimal sprite rows with clipping, mirroring, scaling, shear and collision masks.
   *
   * @returns Whether an occupied destination pixel was already set in the supplied mask.
   * @public
   */
  public drawSprite(
    rows: readonly string[],
    x: number,
    y: number,
    options: ICaliforniaGamesSpriteOptions = {},
  ): boolean {
    const transparentIndex = options.transparentIndex ?? 0;
    const scaleX = Math.max(1, Math.floor(options.scaleX ?? 1));
    const scaleY = Math.max(1, Math.floor(options.scaleY ?? 1));
    let collided = false;
    for (let sourceY = 0; sourceY < rows.length; sourceY++) {
      const rowIndex = options.flipY ? rows.length - sourceY - 1 : sourceY;
      const row = rows[rowIndex] ?? '';
      const rowOffset = Math.round((options.shear ?? 0) * sourceY);
      for (let sourceX = 0; sourceX < row.length; sourceX++) {
        const column = options.flipX ? row.length - sourceX - 1 : sourceX;
        const color = Number.parseInt(row[column] ?? '0', 16);
        if (!Number.isFinite(color) || color === transparentIndex) continue;
        for (let pixelY = 0; pixelY < scaleY; pixelY++)
          for (let pixelX = 0; pixelX < scaleX; pixelX++) {
            const destinationX = Math.floor(x) + sourceX * scaleX + pixelX + rowOffset;
            const destinationY = Math.floor(y) + sourceY * scaleY + pixelY;
            if (
              destinationX < 0 ||
              destinationX >= WIDTH ||
              destinationY < 0 ||
              destinationY >= HEIGHT ||
              (options.checkerTransparency && (destinationX + destinationY) % 2 === 0)
            )
              continue;
            const maskIndex = destinationY * WIDTH + destinationX;
            if (options.collisionMask) {
              collided = collided || options.collisionMask[maskIndex] === 1;
              options.collisionMask[maskIndex] = 1;
            }
            this._pixels[maskIndex] = color & 0x0f;
          }
      }
    }
    return collided;
  }

  /** Creates an empty collision mask matching the indexed surface. @public */
  public createCollisionMask(): Uint8Array {
    return new Uint8Array(WIDTH * HEIGHT);
  }

  /** Copies the indexed framebuffer into RGBA image data, optionally rotated by 180 degrees. @public */
  public writeImageData(
    imageData: ImageData,
    palette: readonly string[],
    screenFlipped = false,
  ): void {
    const colors = palette.map((color) => this.parseColor(color));
    for (let destination = 0; destination < this._pixels.length; destination++) {
      const source = screenFlipped ? this._pixels.length - destination - 1 : destination;
      const [red, green, blue] = colors[this._pixels[source] ?? 0] ?? [0, 0, 0];
      const offset = destination * 4;
      imageData.data[offset] = red;
      imageData.data[offset + 1] = green;
      imageData.data[offset + 2] = blue;
      imageData.data[offset + 3] = 255;
    }
  }

  private parseColor(color: string): readonly [number, number, number] {
    const hex = color.startsWith('#') ? color.slice(1) : color;
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  // #endregion
}
