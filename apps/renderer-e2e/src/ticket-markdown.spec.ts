// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

test('renders Markdown in external ticket bodies', async () => {
  // arrange
  const configurationRoot = resolve(
    'output/playwright',
    `ticket-markdown-configuration-${process.pid}`,
  );
  rmSync(configurationRoot, { force: true, recursive: true });
  // act
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));

    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();

    const filterMenu = page.getByTestId('board-filter');
    const labelFilter = page.getByTestId('board-label-filter');
    const assigneeFilter = page.getByTestId('board-assignee-filter');

    await filterMenu.click();
    await labelFilter.click();
    await expect(page.getByTestId('board-label-filter-all')).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('board-label-filter-option-desktop')).toBeVisible();
    await expect(page.getByTestId('board-label-filter-option-orchestration')).toBeVisible();
    await page.getByTestId('board-label-filter-option-desktop').click();
    await expect(filterMenu).toHaveJSProperty('isDropDownOpen', false);
    await expect(page.getByTestId('board-label-filter-option-desktop')).toBeHidden();
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();
    await expect(page.getByTestId('board-item-work-item-142')).toHaveCount(0);

    await filterMenu.click();
    await expect(labelFilter).toContainText('desktop');
    await assigneeFilter.click();
    await expect(page.getByTestId('board-assignee-filter-option-desktop-owner')).toBeVisible();
    await expect(page.getByTestId('board-assignee-filter-option-octo-operator')).toBeVisible();
    await page.getByTestId('board-assignee-filter-option-octo-operator').click();
    await expect(filterMenu).toHaveJSProperty('isDropDownOpen', false);
    await expect(page.getByTestId('board-assignee-filter-option-octo-operator')).toBeHidden();
    await expect(page.getByTestId('board-empty')).toContainText('No matching tickets');

    await filterMenu.click();
    await expect(assigneeFilter).toContainText('Octo Operator');
    await labelFilter.click();
    await page.getByTestId('board-label-filter-all').click();
    await expect(page.getByTestId('board-label-filter-all')).toBeHidden();
    await expect(page.getByTestId('board-item-work-item-142')).toBeVisible();
    await expect(page.getByTestId('board-item-work-item-138')).toHaveCount(0);
    await filterMenu.click();
    await page.screenshot({
      path: resolve('output/playwright', 'board-label-assignee-filters.png'),
      fullPage: true,
    });

    await assigneeFilter.click();
    await page.getByTestId('board-assignee-filter-all').click();
    await expect(page.getByTestId('board-assignee-filter-all')).toBeHidden();
    // Without a filter, Qualified (138) and Backlog (142) return to their collapsed strips.
    await expect(page.getByTestId('board-item-work-item-138')).toHaveCount(0);
    await expandBoardColumn(page, 'qualified');
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();
    await expandBoardColumn(page, 'backlog');
    await page.getByTestId('board-item-work-item-142').click();
    // The work-item screen shows the description at once, rendered from Markdown, with the
    // labels beside the status and the assignees in the inspector.
    await expect(page.getByTestId('work-item-view')).toBeVisible();
    await expect(page.getByTestId('task-drawer-description')).toBeVisible();
    await expect(page.getByTestId('work-item-label-orchestration')).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByTestId('task-metadata')
          .locator('[test-id^="work-item-assignee-"]')
          .evaluateAll((rows) => rows.map((row) => row.getAttribute('test-id'))),
      )
      .toEqual(['work-item-assignee-octo-operator', 'work-item-assignee-workspace-owner']);
    await expect(
      page.getByTestId('work-item-assignee-octo-operator').locator('mosaik-avatar'),
    ).toHaveJSProperty('text', 'Octo Operator');

    const renderedMarkdown = await page
      .getByTestId('task-drawer-description')
      .evaluate((element) => ({
        // The Markdown renderer emits Mosaik elements, so block structure is read from those
        // instead of from bare HTML tags.
        heading: element.shadowRoot?.querySelector('.heading')?.textContent,
        boldText: element.shadowRoot?.querySelector('.strong')?.textContent,
        strongTexts: Array.from(element.shadowRoot?.querySelectorAll('.strong') ?? []).map(
          (item) => item.textContent,
        ),
        listItems: Array.from(
          element.shadowRoot?.querySelectorAll('mosaik-listing-item') ?? [],
        ).map((item) => item.textContent),
        text: element.shadowRoot?.textContent,
      }));

    expect(renderedMarkdown.heading).toBe('Recovery scope');
    expect(renderedMarkdown.boldText).toBe('managed workspaces');
    expect(renderedMarkdown.strongTexts).toEqual(['managed workspaces']);
    expect(renderedMarkdown.listItems).toEqual([
      'Detect actionable drift',
      'Surface safe recovery guidance',
    ]);
    expect(renderedMarkdown.text).not.toContain('**managed workspaces**');
    expect(renderedMarkdown.text).toContain('<strong>not trusted</strong>');

    // The discussion travels with the complete item into the activity, newest first, with the
    // author and instant beside a Markdown body.
    await expect(
      page.getByTestId('task-drawer-events').locator('[data-activity-kind="comment"]'),
    ).toHaveCount(3);
    await expect(page.getByTestId('task-activity-opened')).toBeVisible();
    const firstComment = page.getByTestId('task-drawer-comment-comment-142-1');
    await expect(firstComment).toContainText('Workspace Owner');
    const firstCommentMarkdown = await firstComment
      .locator('symphony-markdown')
      .evaluate((element) => ({
        strongText: element.shadowRoot?.querySelector('.strong')?.textContent,
        text: element.shadowRoot?.textContent,
      }));
    expect(firstCommentMarkdown.strongText).toBe('managed workspaces only');
    expect(firstCommentMarkdown.text).not.toContain('**');
    await expect(page.getByTestId('task-drawer-comment-comment-142-2')).toContainText(
      'Drift detection first, recovery guidance second.',
    );

    // Wide content (code lines, tables) scrolls inside the comment instead of making the whole
    // screen scroll sideways.
    const analysisComment = page.getByTestId('task-drawer-comment-comment-142-3');
    await expect(analysisComment).toContainText('Symphony analysis');
    const horizontalOverflow = await page
      .getByTestId('task-drawer')
      .evaluate((drawer, commentTestId) => {
        const comment = drawer.querySelector(`[test-id="${commentTestId}"]`);
        return {
          drawer: drawer.scrollWidth - drawer.clientWidth,
          comment: comment ? comment.scrollWidth - comment.clientWidth : Number.NaN,
        };
      }, 'task-drawer-comment-comment-142-3');
    expect(horizontalOverflow.drawer).toBe(0);
    expect(horizontalOverflow.comment).toBe(0);

    await page.getByTestId('task-drawer-events').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve('output/playwright', 'board-task-drawer-comments.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
