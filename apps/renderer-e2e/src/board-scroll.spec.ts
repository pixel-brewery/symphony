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

    const backlog = page.getByTestId('board-column-backlog');
    const longCard = backlog.getByTestId('board-item-work-item-142');
    await expect(longCard).toBeVisible();
    await expect(longCard).toContainText(longTitle);
    const readColumn = () =>
      backlog.evaluate((column) => {
        const flowColumn = column as HTMLElementTagNameMap['mosaik-flow-board-column'];
        const viewport = flowColumn.getScrollableElement();
        const items = flowColumn.getItems();
        const rendered = items.filter((item) => item.getClientRects().length > 0);
        return {
          horizontalOverflow: viewport.scrollWidth - viewport.clientWidth,
          horizontalOffset: viewport.scrollLeft,
          top: viewport.scrollTop,
          remaining: viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
          total: items.length,
          rendered: rendered.length,
          firstRendered: rendered.includes(items[0]!),
          lastRendered: rendered.includes(items.at(-1)!),
        };
      });
    await expect.poll(readColumn).toMatchObject({ horizontalOverflow: 0, horizontalOffset: 0 });
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
    await expect.poll(readColumn).toMatchObject({ horizontalOffset: 0 });
    const neighbouringColumn = page.getByTestId('board-column-ready');
    await neighbouringColumn.locator('[part="toggle"]').click();
    await expect(neighbouringColumn).toHaveJSProperty('isExpanded', false);
    await app.evaluate(({ BrowserWindow }, rendererUrl) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL() === rendererUrl)
        ?.webContents.setZoomFactor(1.25);
    }, page.url());
    await expect.poll(readColumn).toMatchObject({ horizontalOverflow: 0, horizontalOffset: 0 });
    await app.evaluate(({ BrowserWindow }, rendererUrl) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL() === rendererUrl)
        ?.webContents.setZoomFactor(1);
    }, page.url());
    await expect(neighbouringColumn).toHaveJSProperty('isExpanded', false);
    await expect.poll(readColumn).toMatchObject({ horizontalOffset: 0 });
    await page.screenshot({ path: resolve(outputDirectory, 'board-cards-fit-column.png') });

    await expect
      .poll(readColumn)
      .toMatchObject({ total: 133, top: 0, firstRendered: true, lastRendered: false });
    await expect.poll(async () => (await readColumn()).rendered).toBeLessThan(30);
    await expect.poll(async () => (await readColumn()).remaining).toBeGreaterThan(0);

    // The first jump replaces the estimates near the end with measured heights. Keep scrolling
    // until the last item is rendered and the measured bottom has reached the viewport.
    await expect
      .poll(async () => {
        await backlog.evaluate((column) => {
          const viewport = (
            column as HTMLElementTagNameMap['mosaik-flow-board-column']
          ).getScrollableElement();
          viewport.scrollTo({ top: viewport.scrollHeight });
        });
        const { lastRendered, remaining } = await readColumn();
        return lastRendered && remaining <= 1;
      })
      .toBe(true);
    await expect.poll(async () => (await readColumn()).rendered).toBeLessThan(30);

    await backlog.evaluate((column) => {
      (column as HTMLElementTagNameMap['mosaik-flow-board-column'])
        .getScrollableElement()
        .scrollTo({ top: 0 });
    });
    await expect
      .poll(readColumn)
      .toMatchObject({ top: 0, firstRendered: true, lastRendered: false });
    await expect
      .poll(() =>
        page
          .getByTestId('board-columns')
          .evaluate(
            (board) =>
              (board as HTMLElementTagNameMap['mosaik-flow-board']).getScrollableElement()
                .scrollTop,
          ),
      )
      .toBe(0);
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
