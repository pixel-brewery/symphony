// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { expandBoardColumn } from './expandBoardColumn';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('scrolls a dense board column to both boundaries', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `board-scroll-configuration-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: workspace,
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_ADDITIONAL_WORK_ITEMS: '132',
    },
  });

  // assert
  try {
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') rendererErrors.push(message.text());
    });
    await expect(page.getByTestId('home-view')).toBeVisible();
    const longTitle =
      'CR-0372 – [Abholorte] Kontaktwege zwischen Adresse und Wochenöffnungszeiten ergänzen · ' +
      'Wiederherstellungsprüfung'.repeat(4);
    const longFieldValue = 'workspaceReconciliation'.repeat(12);
    await page.evaluate(
      async ({ title, fieldValue }) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const snapshot = await api.request('snapshot.get', {});
        const item = snapshot.workItems.find((candidate) => candidate.id === 'work-item-142')!;
        await api.request('work-items.update', {
          workItemId: item.id,
          item: {
            workspaceId: item.workspaceId,
            sourceId: item.sourceId,
            title,
            body: item.body ?? '',
            repository: item.repository,
            projectFields: item.projectFields.map((field) =>
              field.fieldId === 'field-keywords' && field.type === 'text'
                ? { ...field, value: fieldValue }
                : field,
            ),
            labels: [...item.labels, 'produktdokumentation'.repeat(5)],
            assignees: item.assignees.map((assignee) => assignee.login),
          },
        });
      },
      { title: longTitle, fieldValue: longFieldValue },
    );
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(page.getByTestId('board-loading-skeleton')).toHaveCount(0);
    // Backlog starts as a collapsed strip; its long card and its 133 entries are under test.
    await expandBoardColumn(page, 'backlog');

    const cards = page.locator('mosaik-flow-board-column-item');
    const backlogViewport = page.getByTestId('board-column-viewport-backlog');
    const backlogEntries = backlogViewport.locator('symphony-board-column-entry');
    await expect(backlogViewport).toBeVisible();
    const longCard = page.getByTestId('board-item-work-item-142');
    await expect(longCard).toContainText(longTitle);
    await expect
      .poll(() =>
        backlogViewport.evaluate((viewport) => ({
          horizontalOverflow: viewport.scrollWidth - viewport.clientWidth,
          horizontalOffset: viewport.scrollLeft,
        })),
      )
      .toEqual({ horizontalOverflow: 0, horizontalOffset: 0 });
    // Verify the actual glyph ranges as well: hiding overflow must not make a clipped compound
    // title look like a fitting card. The card shows the title, the id and the status; the
    // project fields live on the work item's own screen.
    await expect
      .poll(() =>
        longCard.evaluate((card) => {
          const texts = [card.querySelector<HTMLElement>('[test-id^="board-item-title-"]')];
          const cardBounds = card.getBoundingClientRect();
          return texts.every((text) => {
            const content = text?.shadowRoot?.querySelector('[part="text"]');
            if (!text || !content) return false;
            const bounds = text.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(content);
            return (
              bounds.width > 0 &&
              bounds.left >= cardBounds.left &&
              bounds.right <= cardBounds.right &&
              [...range.getClientRects()].every(
                (line) => line.left >= bounds.left - 1 && line.right <= bounds.right + 1,
              )
            );
          });
        }),
      )
      .toBe(true);
    await page.getByTestId('board-item-actions-work-item-142').focus();
    await expect.poll(() => backlogViewport.evaluate((viewport) => viewport.scrollLeft)).toBe(0);
    const neighbouringColumn = page.getByTestId('board-column-ready');
    await page.getByTestId('board-column-collapse-ready').click();
    await expect(neighbouringColumn).toHaveAttribute('aria-expanded', 'false');
    await app.evaluate(({ BrowserWindow }, rendererUrl) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL() === rendererUrl)
        ?.webContents.setZoomFactor(1.25);
    }, page.url());
    await expect
      .poll(() =>
        backlogViewport.evaluate((viewport) => ({
          horizontalOverflow: viewport.scrollWidth - viewport.clientWidth,
          horizontalOffset: viewport.scrollLeft,
          contentFitsViewport:
            Math.abs(
              (viewport.firstElementChild?.getBoundingClientRect().width ?? 0) -
                viewport.clientWidth,
            ) <= 1,
        })),
      )
      .toEqual({ horizontalOverflow: 0, horizontalOffset: 0, contentFitsViewport: true });
    await app.evaluate(({ BrowserWindow }, rendererUrl) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL() === rendererUrl)
        ?.webContents.setZoomFactor(1);
    }, page.url());
    await expect(neighbouringColumn).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => backlogViewport.evaluate((viewport) => viewport.scrollLeft)).toBe(0);
    await page.screenshot({ path: resolve(outputDirectory, 'board-cards-fit-column.png') });
    await expect.poll(() => cards.count()).toBeLessThan(30);
    await expect
      .poll(() =>
        backlogEntries.evaluateAll((elements) =>
          elements.map((element) => Number(element.getAttribute('data-board-virtual-index'))),
        ),
      )
      .toContain(0);
    await expect
      .poll(() =>
        cards.evaluateAll(
          (elements) =>
            elements.filter((element) => {
              const card = element as HTMLElement & {
                itemKey?: string;
                value?: { title?: string };
              };
              const expectedItemKey = card.getAttribute('test-id')?.replace('board-item-', '');
              const title = card.querySelector<HTMLElement>('mosaik-text') as
                (HTMLElement & { text?: string }) | null;
              return (
                card.itemKey !== expectedItemKey ||
                !card.value?.title?.trim() ||
                !title?.text?.trim()
              );
            }).length,
        ),
      )
      .toBe(0);
    expect(rendererErrors).toEqual([]);

    const board = page.locator('mosaik-flow-board');
    const backlogColumn = page.locator('mosaik-flow-board-column[column-key="backlog"]');
    await expect(backlogColumn).toBeVisible();
    // The column owns a bounded CDK viewport. Its total height represents all 133 logical
    // backlog entries while Angular keeps only the visible variable-height cards mounted.
    await expect
      .poll(() =>
        backlogViewport.evaluate(
          (viewport) => viewport.scrollHeight > viewport.clientHeight && viewport.scrollTop === 0,
        ),
      )
      .toBe(true);

    await expect
      .poll(() =>
        backlogViewport.evaluate((viewport) => {
          viewport.scrollTo({ top: viewport.scrollHeight });
          return viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
        }),
      )
      .toBeLessThanOrEqual(1);
    await expect
      .poll(() =>
        backlogViewport.evaluate((viewport) => {
          viewport.scrollTo({ top: viewport.scrollHeight });
          const entries = [
            ...viewport.querySelectorAll<HTMLElement>('symphony-board-column-entry'),
          ];
          return Math.max(
            ...entries.map((element) => Number(element.getAttribute('data-board-virtual-index'))),
          );
        }),
      )
      .toBe(132);
    await expect.poll(() => cards.count()).toBeLessThan(30);

    await backlogViewport.evaluate((viewport) => viewport.scrollTo({ top: 0 }));
    await expect.poll(() => backlogViewport.evaluate((viewport) => viewport.scrollTop)).toBe(0);
    await expect
      .poll(() =>
        backlogEntries.evaluateAll((elements) =>
          elements.map((element) => Number(element.getAttribute('data-board-virtual-index'))),
        ),
      )
      .toContain(0);
    expect(
      await board.evaluate((element) => {
        const viewport = element.shadowRoot?.querySelector<HTMLElement>('[part~="viewport"]');
        return viewport?.scrollTop ?? 0;
      }),
    ).toBe(0);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
