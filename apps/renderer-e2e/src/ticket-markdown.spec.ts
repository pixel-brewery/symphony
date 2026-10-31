// #region Imports

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';

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

    await expect(page.getByTestId('orbit-view')).toBeVisible();
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
    await expect(page.getByTestId('board-item-work-item-138')).toBeVisible();
    await expect(page.getByTestId('board-item-labels-work-item-142')).toContainText(
      'orchestration',
    );
    const assigneeGroup = page.getByTestId('board-item-assignees-work-item-142');
    const assigneeAvatars = assigneeGroup.locator('mosaik-avatar');
    await expect(assigneeGroup).toBeVisible();
    await expect(assigneeAvatars).toHaveCount(2);
    await expect(assigneeAvatars.nth(0)).toHaveAttribute('aria-label', 'Octo Operator');
    await expect(assigneeAvatars.nth(1)).toHaveAttribute('aria-label', 'Workspace Owner');
    await assigneeAvatars.nth(0).hover();
    // The tooltip surface is portal-projected to <body>; the role locator finds the one
    // rendered instance instead of hidden slot copies inside menu items.
    await expect(page.getByRole('tooltip', { name: 'Octo Operator' })).toBeVisible();
    await page.getByTestId('board-item-work-item-142').click();
    await page.getByTestId('task-description-section').click();
    await expect(page.getByTestId('task-drawer-description')).toBeVisible();

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

    // The discussion travels with the complete item: oldest comment first, author and
    // instant beside a Markdown body.
    await expect(page.getByTestId('task-activity-section')).toContainText('Activity · 4');
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

    // Comments render through the Mosaik comment element, and wide content (code lines,
    // tables) scrolls inside the comment instead of making the whole dialog scrollable.
    const analysisComment = page.getByTestId('task-drawer-comment-comment-142-3');
    await expect(analysisComment).toContainText('Symphony analysis');
    expect(await analysisComment.evaluate((element) => element.tagName.toLowerCase())).toBe(
      'mosaik-comment',
    );
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

    await page.getByTestId('task-drawer-comments').scrollIntoViewIfNeeded();
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
