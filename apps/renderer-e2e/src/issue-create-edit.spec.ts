// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('creates and edits a provider-neutral work item through the shared drawer', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `issue-editor-configuration-${process.pid}`);
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
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '600',
    },
  });

  // assert
  try {
    const page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await expect(page.getByTestId('orbit-view')).toBeVisible();

    await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const current = await api.request('settings.get', {});
      const workspaceId = current.workspaces[0]!.id;
      const connection = {
        id: 'issue-editor-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Example GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const source = {
        id: 'issue-editor-source',
        workspaceId,
        connectionId: connection.id,
        provider: 'simulated' as const,
        displayName: 'Issue editor source',
        project: 'Example',
        enabled: true,
      };
      const repository = {
        id: 'issue-editor-repository',
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: 'example/platform',
        provider: 'github' as const,
        host: 'github.com',
        owner: 'example',
        name: 'platform',
        defaultBranch: 'main',
        localPath,
        enabled: true,
      };
      const context = {
        id: 'issue-editor-context',
        workspaceId,
        displayName: 'Issue editor',
        workItemSourceIds: [source.id],
        repositoryBindingIds: [repository.id],
        ciBindingIds: [],
        agentTeamId: current.agentTeams[0]!.id,
        defaultRepositoryBindingId: repository.id,
        enabled: true,
      };
      await api.request('settings.save', {
        settings: {
          ...current,
          connections: [...current.connections, connection],
          workItemSources: [source],
          repositoryBindings: [repository],
          deliveryContexts: [context],
        },
      });
      const catalog = await api.request('skills.list', {});
      const creator = catalog.packages.find((skill) => skill.name === 'create-change-request');
      if (!creator) throw new Error('The repository Work Item Creator skill is unavailable.');
      await api.request('settings.save', {
        settings: {
          ...current,
          connections: [...current.connections, connection],
          workItemSources: [source],
          repositoryBindings: [repository],
          agentTeams: current.agentTeams.map((team) => ({
            ...team,
            assignments: team.assignments.map((assignment) =>
              assignment.role === 'work-item-creation'
                ? { ...assignment, skillId: creator.id }
                : assignment,
            ),
          })),
          deliveryContexts: [context],
        },
      });
    }, workspace);
    await app.evaluate(
      ({ BrowserWindow }, rendererUrl) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === rendererUrl)
          ?.reload(),
      page.url(),
    );
    await expect(page.getByTestId('orbit-view')).toBeVisible();

    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    const createWorkItem = page.getByTestId('create-work-item');
    await expect(createWorkItem).toHaveAttribute('aria-label', 'Create work item');
    await expect(createWorkItem).toHaveAttribute('variant', 'primary');
    await createWorkItem.click();
    await expect(page.getByTestId('task-drawer')).toBeVisible();
    await expect(page.getByTestId('issue-create-mode-manual')).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('issue-editor')).toBeVisible();
    await expect(page.getByTestId('issue-creator')).toHaveCount(0);
    await page
      .getByTestId('issue-title')
      .locator('input')
      .fill('Create issues manually from the board');
    await page
      .getByTestId('issue-body')
      .locator('textarea')
      .fill('## Manual issue\n\nNo AI is required for this ticket.');
    await page
      .getByTestId('issue-project-field-field-keywords')
      .locator('input')
      .fill('manual, project workflow');
    await page.getByTestId('issue-save').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    const manualCard = page
      .locator('mosaik-flow-board-column-item')
      .filter({ hasText: 'Create issues manually from the board' });
    await expect(manualCard).toBeVisible();
    await expect(manualCard.locator('[test-id^="board-item-fields-"]')).toContainText(
      'manual, project workflow',
    );
    await expect(manualCard.locator('[test-id^="board-item-fields-"]')).not.toContainText(
      'Estimate',
    );

    await page.getByTestId('create-work-item').click();
    await expect(page.getByTestId('issue-editor')).toBeVisible();
    await page.getByTestId('issue-create-mode-ai').click();
    await expect(page.getByTestId('issue-editor')).toHaveCount(0);
    // With a single repository there is nothing to choose, so the field is not shown at all.
    await expect(page.getByTestId('issue-repository')).toHaveCount(0);
    await expect(page.getByTestId('issue-creator-agent')).toBeVisible();

    const creatorPrompt = page.getByTestId('issue-creator-prompt');
    await creatorPrompt
      .locator('textarea')
      .fill('Users must be able to create and edit issues from the board.');
    await creatorPrompt.locator('[part="submit"]').click();
    await expect(page.getByTestId('issue-creator-cancel')).toBeVisible();
    await expect(page.getByTestId('issue-creator-cancel')).toHaveAttribute('variant', 'danger');
    await page.getByTestId('issue-creator-cancel').click();
    await expect(page.getByTestId('issue-creator-cancel')).toHaveCount(0);
    await expect(page.getByTestId('issue-creator')).toBeVisible();
    await expect(creatorPrompt.locator('[part="submit"]')).toBeEnabled();
    await creatorPrompt.locator('[part="submit"]').click();
    await expect(page.getByTestId('issue-editor')).toBeVisible();
    await expect(page.getByTestId('issue-title').locator('input')).toHaveValue(
      'Add complete issue creation to the workspace board',
    );
    await expect(page.getByTestId('issue-body').locator('textarea')).toHaveValue(
      /## Acceptance criteria/,
    );
    await expect(page.getByTestId('issue-project-field-field-status')).toContainText('Backlog');
    await expect(
      page.getByTestId('issue-project-field-field-keywords').locator('input'),
    ).toHaveValue('issue creation, project workflow');
    await expect(
      page.getByTestId('issue-project-field-field-estimate').locator('input'),
    ).toHaveValue('5');
    expect(
      await page
        .getByTestId('issue-project-field-field-target-date')
        .locator('mosaik-datebox')
        .evaluate((element) => {
          const value = (element as HTMLElement & { value: Date }).value;
          return {
            year: value.getFullYear(),
            month: value.getMonth() + 1,
            day: value.getDate(),
          };
        }),
    ).toEqual({ year: 2026, month: 8, day: 28 });
    await expect(page.getByTestId('issue-project-field-field-priority')).toContainText('High');
    await expect(
      page.getByTestId('issue-project-field-field-areas-option-area-projects').locator('input'),
    ).toBeChecked();
    await expect(page.getByTestId('issue-project-field-field-iteration')).toContainText(
      'August 2026',
    );
    await expect(page.getByTestId('issue-label-bug').locator('input')).toBeChecked();
    await expect(page.getByTestId('issue-assignee-octo-operator').locator('input')).toBeChecked();
    await page.getByTestId('issue-project-field-field-keywords').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(outputDirectory, 'board-issue-create-drawer.png'),
      fullPage: true,
    });

    await page.getByTestId('issue-save').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);

    const createdCard = page
      .locator('mosaik-flow-board-column-item')
      .filter({ hasText: 'Add complete issue creation to the workspace board' });
    await expect
      .poll(async () => {
        await page
          .getByTestId('board-column-viewport-backlog')
          .evaluate((viewport) => viewport.scrollTo({ top: viewport.scrollHeight }));
        return createdCard.isVisible();
      })
      .toBe(true);
    await expect(createdCard).toBeVisible();
    await expect(createdCard).toContainText('bug');
    await expect(createdCard.locator('[test-id^="board-item-fields-"]')).toContainText(
      'issue creation, project workflow',
    );
    await expect(createdCard.locator('[test-id^="board-item-fields-"]')).toContainText(
      'Estimate · 5',
    );
    await expect(createdCard.locator('[test-id^="board-item-fields-"]')).toContainText(
      'Areas · Projects',
    );
    await createdCard.click();
    await expect(page.getByTestId('task-summary')).toBeVisible();
    // An existing item opens as the compact summary from the reference: the description is
    // progressively disclosed, editing waits behind its explicit action, and activity opens.
    await expect(page.getByTestId('task-drawer-title')).toContainText(
      'Add complete issue creation to the workspace board',
    );
    await expect(page.getByTestId('task-description-section')).toHaveJSProperty(
      'isExpanded',
      false,
    );
    await page.getByTestId('task-description-section').click();
    await expect(page.getByTestId('task-drawer-description')).toBeVisible();
    await expect(page.getByTestId('issue-title')).toHaveCount(0);
    await expect(page.getByTestId('issue-body')).toHaveCount(0);
    await expect(page.getByTestId('task-activity-section')).toHaveJSProperty('isExpanded', true);
    await expect(page.getByTestId('task-drawer-comments-empty')).toBeVisible();

    // The discussion is not read-only: what is written here reaches the provider and joins the
    // thread in place, without reopening the drawer.
    const commentDraft = page.getByTestId('task-drawer-comment-draft');
    await commentDraft.locator('textarea').fill('Reconcile **managed workspaces** first.');
    await page.getByTestId('task-drawer-comment-submit').click();
    await expect(page.getByTestId('task-drawer-comments-empty')).toHaveCount(0);
    const writtenComment = page.getByTestId('task-drawer-comments').locator('mosaik-comment');
    await expect(writtenComment).toHaveCount(1);
    await expect(writtenComment).toContainText('Octo Operator');
    await expect(writtenComment).toContainText('Reconcile managed workspaces first.');
    await expect(commentDraft.locator('textarea')).toHaveValue('');
    await expect(page.getByTestId('task-checks-section')).toHaveJSProperty('isExpanded', false);
    await page.getByTestId('task-checks-section').click();
    const aiDelegation = page.getByTestId('task-ai-delegation');
    await expect(aiDelegation).toBeVisible();
    await aiDelegation.scrollIntoViewIfNeeded();
    const delegateGoal = page.getByTestId('task-delegate-goal');
    await delegateGoal.scrollIntoViewIfNeeded();
    await expect(delegateGoal).toBeVisible();
    await expect(delegateGoal).toBeEnabled();
    await delegateGoal.click();
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            const item = snapshot.workItems.find(
              (candidate) =>
                candidate.title === 'Add complete issue creation to the workspace board',
            );
            return snapshot.goals.some((goal) => goal.workItemId === item?.id);
          }),
        { timeout: 30_000 },
      )
      .toBe(true);
    await expect(page.getByTestId('task-goal-evidence')).toContainText('Default agent');
    await aiDelegation.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(outputDirectory, 'task-ai-delegation.png'),
      fullPage: true,
    });
    const delegatedGoal = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      const item = snapshot.workItems.find(
        (candidate) => candidate.title === 'Add complete issue creation to the workspace board',
      );
      return snapshot.goals.find((goal) => goal.workItemId === item?.id);
    });
    expect(delegatedGoal).toMatchObject({
      state: 'planning',
      assignment: {
        objective: 'Add complete issue creation to the workspace board',
        responsibleAgentId: expect.any(String),
      },
    });
    // A freshly created work item waits at Human Gate 1; approving it is the only way to
    // release it for technical work, and the drawer offers the gate's decisions. Until then
    // the gate runs no step, so the step controls offer none either.
    await expect(page.getByTestId('task-analysis-step')).toHaveCount(0);
    await expect(page.getByTestId('task-no-step-available')).toContainText('waits for a decision');
    await expect(page.getByTestId('task-gate-decisions')).toBeVisible();
    await page.getByTestId('task-gate-decision-approve').click();
    await expect(page.getByTestId('task-gate-decisions')).toHaveCount(0);

    await expect(page.getByTestId('task-analysis-mode-manual')).toHaveJSProperty('isChecked', true);
    await expect(page.getByTestId('task-analysis-manual')).toBeVisible();
    await expect(page.getByTestId('task-analysis-ai')).toHaveCount(0);
    await page.getByTestId('task-analysis-mode-ai').scrollIntoViewIfNeeded();
    await page.getByTestId('task-analysis-mode-ai').click();
    await expect(page.getByTestId('task-analysis-skill')).toContainText('analysis');
    await expect(page.getByTestId('task-analysis-prompt')).toBeVisible();
    await expect(page.getByTestId('task-analysis-open-skills')).toHaveCount(0);
    await expect(page.getByTestId('task-drawer-start')).toHaveJSProperty('disabled', false);

    await page.getByTestId('task-analysis-mode-manual').click();
    await page
      .getByTestId('task-manual-analysis')
      .locator('textarea')
      .fill('## Manual analysis\n\nThe issue can be implemented without AI.');
    await expect(page.getByTestId('task-drawer-start')).toContainText('Record analysis');
    await expect(page.getByTestId('task-drawer-start')).toHaveAttribute('variant', 'primary');
    await page.getByTestId('task-drawer-start').click();
    await expect(page.getByTestId('task-result-markdown')).toContainText('Manual analysis');
    await expect(page.getByTestId('task-solution-mode-manual')).toHaveJSProperty(
      'isChecked',
      true,
      { timeout: 20_000 },
    );
    await page
      .getByTestId('task-manual-solution')
      .locator('textarea')
      .fill('## Manual implementation\n\nImplemented and verified without AI.');
    await expect(page.getByTestId('task-drawer-solve')).toContainText('Record implementation');
    await expect(page.getByTestId('task-drawer-solve')).toHaveAttribute('variant', 'primary');
    await page.getByTestId('task-drawer-solve').click();
    await expect(page.getByTestId('task-solution-markdown')).toContainText('Manual implementation');
    await page.getByTestId('task-drawer-edit-content').scrollIntoViewIfNeeded();
    await page.getByTestId('task-drawer-edit-content').click();
    await expect(page.getByTestId('task-drawer-edit-content')).toContainText('Preview');
    await page.getByTestId('issue-title').locator('input').fill('Edit issues from the board');
    await page
      .getByTestId('issue-project-field-field-keywords')
      .locator('input')
      .fill('issue editing, project-v2');
    await page.getByTestId('issue-project-field-field-status').locator('mosaik-select').click();
    // Addressed by its option id: "Ready" is also the name of a board column, and the card
    // menus keep one hidden entry per column for their move actions.
    await page.getByTestId('issue-project-field-field-status-option-status-ready').click();
    await page.getByTestId('task-drawer-edit-content').click();
    // Preview renders the unsaved edit while the footer retains the explicit Save/Cancel session.
    await expect(page.getByTestId('task-drawer-title')).toContainText('Edit issues from the board');
    await expect(page.getByTestId('task-drawer-edit-content')).toContainText('Edit');
    await expect(page.getByTestId('issue-save')).toBeVisible();
    await page.getByTestId('issue-save').click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    const editedCard = page
      .getByTestId('board-column-ready')
      .locator('mosaik-flow-board-column-item')
      .filter({ hasText: 'Edit issues from the board' });
    await expect(editedCard).toBeVisible();
    await expect(editedCard.locator('[test-id^="board-item-fields-"]')).toContainText(
      'issue editing, project-v2',
    );

    const saved = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      const item = snapshot.workItems.find((item) => item.title === 'Edit issues from the board');
      return item ? api.request('work-items.detail', { workItemId: item.id }) : undefined;
    });
    expect(saved).toMatchObject({
      body: expect.stringContaining('## Acceptance criteria'),
      stageId: 'ready',
      labels: ['bug'],
      assignees: [{ login: 'octo-operator', displayName: 'Octo Operator' }],
    });
    expect(saved?.projectFields).toEqual(
      expect.arrayContaining([
        { fieldId: 'field-status', type: 'single-select', value: 'status-ready' },
        { fieldId: 'field-keywords', type: 'text', value: 'issue editing, project-v2' },
        { fieldId: 'field-estimate', type: 'number', value: 5 },
        { fieldId: 'field-target-date', type: 'date', value: '2026-08-28' },
        { fieldId: 'field-priority', type: 'single-select', value: 'priority-high' },
        { fieldId: 'field-areas', type: 'multi-select', value: ['area-projects'] },
        { fieldId: 'field-iteration', type: 'iteration', value: 'iteration-august' },
      ]),
    );
    const manualExecutions = await page.evaluate(async () => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      const item = snapshot.workItems.find(
        (candidate) => candidate.title === 'Edit issues from the board',
      );
      return snapshot.executions.filter((execution) => execution.workItemId === item?.id);
    });
    expect(manualExecutions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mode: 'manual',
          kind: 'analysis',
          state: 'succeeded',
          summary: expect.stringContaining('Manual analysis'),
        }),
        expect.objectContaining({
          mode: 'manual',
          kind: 'solution',
          state: 'succeeded',
          summary: expect.stringContaining('Manual implementation'),
        }),
      ]),
    );
    for (const execution of manualExecutions) {
      expect(execution.skillId).toBeUndefined();
      expect(execution.workspacePath).toBeUndefined();
    }
    expect(rendererErrors).toEqual([]);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: resolve(outputDirectory, 'board-issue-create-edit.png'),
      fullPage: true,
    });
    // The search rests as a launcher button and becomes the field on activation.
    await page.getByTestId('global-search-launcher').click();
    const globalSearch = page.getByTestId('global-search-launcher-input').locator('input');
    await globalSearch.fill('project-v2');
    await globalSearch.press('Enter');
    await expect(page).toHaveURL(/\/main\/board\?q=project-v2/);
    await expect(editedCard).toBeVisible();
    await expect(manualCard).toHaveCount(0);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
