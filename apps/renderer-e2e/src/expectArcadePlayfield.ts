// #region Imports

import { expect, type Page } from '@playwright/test';

// #endregion

/** Verifies the full inner pane and the native-density backing bitmap for any game. @public */
export async function expectArcadePlayfield(
  page: Page,
  ids: { root: string; header: string; playfield: string; canvas: string },
): Promise<void> {
  await expect
    .poll(async () => {
      const [view, header, playfield, screen] = await Promise.all([
        page.getByTestId(ids.root).boundingBox(),
        page.getByTestId(ids.header).boundingBox(),
        page.getByTestId(ids.playfield).boundingBox(),
        page.getByTestId(ids.canvas).boundingBox(),
      ]);
      if (!view || !header || !playfield || !screen) return Number.POSITIVE_INFINITY;
      return Math.max(
        Math.abs(screen.x - view.x),
        Math.abs(screen.width - view.width),
        Math.abs(screen.y - header.y - header.height),
        Math.abs(screen.y + screen.height - view.y - view.height),
        Math.abs(screen.x - playfield.x),
        Math.abs(screen.y - playfield.y),
        Math.abs(screen.width - playfield.width),
        Math.abs(screen.height - playfield.height),
      );
    })
    .toBeLessThanOrEqual(1);
  await expect
    .poll(() =>
      page.getByTestId(ids.canvas).evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const bounds = canvas.getBoundingClientRect();
        return (
          canvas.width === Math.round(bounds.width * window.devicePixelRatio) &&
          canvas.height === Math.round(bounds.height * window.devicePixelRatio)
        );
      }),
    )
    .toBe(true);
}
