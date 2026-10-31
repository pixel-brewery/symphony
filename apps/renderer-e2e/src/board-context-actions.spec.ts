// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

test('reveals board context actions and starts analysis from right-click', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `board-actions-${process.pid}`);
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
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
      SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS: '800',
    },
  });

  // assert
  try {
    const page = await app.firstWindow();
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.evaluate(async (localPath) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const settings = await api.request('settings.get', {});
      const workspaceId = settings.workspaces[0]!.id;
      const analysisSkill = await api.request('skills.save', {
        skill: {
          name: 'board-context-analysis',
          description: 'Analyze a work item from its board context action.',
          instructions: 'Analyze the selected work item and return an implementation-ready plan.',
          openaiYaml: '',
          files: [],
        },
      });
      const connection = {
        id: 'board-actions-github',
        workspaceId,
        kind: 'github' as const,
        displayName: 'Board actions GitHub',
        hostname: 'github.com',
        gitProtocol: 'https' as const,
      };
      const repository = {
        id: 'board-actions-repository',
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
      await api.request('settings.save', {
        settings: {
          ...settings,
          connections: [...settings.connections, connection],
          repositoryBindings: [repository],
          deliveryContexts: [
            {
              id: 'board-actions-context',
              workspaceId,
              displayName: 'Board actions',
              workItemSourceIds: settings.workItemSources
                .filter((source) => source.workspaceId === workspaceId)
                .map((source) => source.id),
              repositoryBindingIds: [repository.id],
              ciBindingIds: [],
              agentTeamId: settings.agentTeams[0]!.id,
              defaultRepositoryBindingId: repository.id,
              enabled: true,
            },
          ],
          agentTeams: settings.agentTeams.map((team) => ({
            ...team,
            assignments: team.assignments.map((assignment) =>
              assignment.role === 'analysis'
                ? { ...assignment, skillId: analysisSkill.id }
                : assignment,
            ),
          })),
        },
      });
      await api.request('repositories.prepare', { repositoryBindingId: repository.id });
    }, workspace);
    await app.evaluate(
      ({ BrowserWindow }, rendererUrl) =>
        BrowserWindow.getAllWindows()
          .find((window) => window.webContents.getURL() === rendererUrl)
          ?.reload(),
      page.url(),
    );
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    // Backlog and Qualified start as collapsed strips; the card rests in Qualified and is moved
    // to Backlog below, so both are expanded.
    await expandBoardColumn(page, 'qualified');
    await expandBoardColumn(page, 'backlog');

    // The analysis is offered by the stage, not by the card: only an item resting in the
    // stage that runs the analysis may start one.
    const workItemId = 'work-item-138';
    const executionContext = await page.evaluate(async (id) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const [settings, snapshot, repositories] = await Promise.all([
        api.request('settings.get', {}),
        api.request('snapshot.get', {}),
        api.request('repositories.runtime.list', {}),
      ]);
      const item = snapshot.workItems.find((candidate) => candidate.id === id);
      const repository = settings.repositoryBindings.find(
        (candidate) => candidate.workspaceId === item?.workspaceId,
      );
      const runtime = repositories.find(
        (candidate) => candidate.repositoryBindingId === repository?.id,
      );
      return {
        repositoryName: repository ? `${repository.owner}/${repository.name}` : undefined,
        preparation: runtime?.preparation.state,
        trust: runtime?.trust.state,
        capabilities: runtime?.trust.capabilities,
      };
    }, workItemId);
    expect(executionContext).toEqual({
      repositoryName: 'example/platform',
      preparation: 'prepared',
      trust: 'restricted',
      capabilities: [],
    });
    const card = page.getByTestId(`board-item-${workItemId}`);
    const trigger = page.getByTestId(`board-item-actions-${workItemId}`);
    await expect(card).toBeVisible();
    await expect(trigger).toBeAttached();
    expect(
      await trigger.evaluate((element) => ({
        opacity: getComputedStyle(element).opacity,
        pointerEvents: getComputedStyle(element).pointerEvents,
      })),
    ).toEqual({ opacity: '0', pointerEvents: 'none' });

    await card.hover();
    await expect
      .poll(() =>
        trigger.evaluate((element) => ({
          opacity: getComputedStyle(element).opacity,
          pointerEvents: getComputedStyle(element).pointerEvents,
        })),
      )
      .toEqual({ opacity: '1', pointerEvents: 'auto' });

    await card.click({ button: 'right' });
    const analyzeAction = page.getByTestId(`board-item-action-analyze-${workItemId}`);
    await expect(analyzeAction).toBeVisible();
    await expect(analyzeAction).toContainText('Analyze now');
    await expect(analyzeAction).toHaveJSProperty('disabled', false);
    const openAction = page.getByTestId(`board-item-action-open-${workItemId}`);
    await expect(openAction).toBeVisible();
    await card.evaluate((element) =>
      Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      ),
    );
    await page.screenshot({
      path: resolve(outputDirectory, 'board-context-actions.png'),
      fullPage: true,
    });

    rendererErrors.length = 0;
    await expect(analyzeAction).toBeVisible();
    await expect(analyzeAction).toHaveJSProperty('hasChildren', false);
    await analyzeAction.click();
    await expect(page.getByTestId('task-drawer')).toHaveCount(0);
    await expect
      .poll(
        async () => {
          const executionStates = await page.evaluate(async (id) => {
            const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
            const snapshot = await api.request('snapshot.get', {});
            return snapshot.executions
              .filter((execution) => execution.workItemId === id && execution.kind === 'analysis')
              .map((execution) => execution.state);
          }, workItemId);
          return {
            executionStates,
            notifications: await page
              .locator(
                '[test-id="notification-success"], [test-id="notification-info"], [test-id="notification-warning"], [test-id="notification-error"]',
              )
              .allTextContents(),
            messageBoxes: await page.locator('mosaik-message-box').count(),
          };
        },
        { timeout: 10_000 },
      )
      .toEqual({
        executionStates: ['running'],
        notifications: [],
        messageBoxes: 0,
      });
    await expect(card).toHaveJSProperty('pinned', true);
    expect(rendererErrors).toEqual([]);
    await page.evaluate(async (id) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      const execution = snapshot.executions.find(
        (candidate) =>
          candidate.workItemId === id &&
          candidate.kind === 'analysis' &&
          ['queued', 'running', 'waiting'].includes(candidate.state),
      );
      if (execution) await api.request('execution.cancel', { executionId: execution.id });
    }, workItemId);
    await expect(card).toHaveJSProperty('pinned', false);

    // The card names the step its stage owns, and it names it as the drawer would: after a
    // cancelled run the analysis is restarted, not started for the first time.
    await card.click({ button: 'right' });
    await expect(analyzeAction).toContainText('Restart analysis');

    const boardColumnOf = () =>
      page.evaluate(async (id) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const snapshot = await api.request('snapshot.get', {});
        return snapshot.workItems.find((candidate) => candidate.id === id)?.boardColumnId;
      }, workItemId);
    expect(await boardColumnOf()).toBe('qualified');

    // Moving the card writes the provider column; the board only follows the tracker.
    const moveForward = page.getByTestId(`board-item-action-move-forward-${workItemId}`);
    await expect(moveForward).toBeVisible();
    await expect(moveForward).toContainText('Ready');
    await moveForward.click();
    await expect.poll(boardColumnOf).toBe('ready');
    await expect(
      page.getByTestId(`board-column-ready`).getByTestId(`board-item-${workItemId}`),
    ).toBeVisible();

    // "Move to" lists every column of the board, so no step needs the item dragged there first.
    await card.click({ button: 'right' });
    await page.getByTestId(`board-item-action-move-to-${workItemId}`).click();
    const backlogTarget = page.getByTestId(`board-item-move-target-backlog-${workItemId}`);
    const readyTarget = page.getByTestId(`board-item-move-target-ready-${workItemId}`);
    await expect(backlogTarget).toBeVisible();
    await expect(readyTarget).toHaveJSProperty('isChecked', true);
    await expect(readyTarget).toHaveJSProperty('disabled', false);
    await readyTarget.click();
    await expect.poll(boardColumnOf).toBe('ready');
    await card.click({ button: 'right' });
    await page.getByTestId(`board-item-action-move-to-${workItemId}`).click();
    await expect(readyTarget).toHaveJSProperty('isChecked', true);
    await backlogTarget.click();
    await expect.poll(boardColumnOf).toBe('backlog');

    // "Assign to" lists the people the tracker accepts, marks the ones the item carries, and
    // writes a choice back as an assignment toggle.
    const assigneeLoginsOf = () =>
      page.evaluate(async (id) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const snapshot = await api.request('snapshot.get', {});
        return (snapshot.workItems.find((candidate) => candidate.id === id)?.assignees ?? []).map(
          (assignee) => assignee.login,
        );
      }, workItemId);
    const untouchedAssignees = await assigneeLoginsOf();
    expect(untouchedAssignees).not.toContain('workspace-owner');
    await card.click({ button: 'right' });
    await page.getByTestId(`board-item-action-assign-${workItemId}`).click();
    const assignTarget = page.getByTestId(`board-item-assign-target-workspace-owner-${workItemId}`);
    await expect(assignTarget).toBeVisible();
    await expect(assignTarget).toContainText('Workspace Owner');
    await expect(assignTarget).toHaveJSProperty('isChecked', false);
    await assignTarget.click();
    await expect.poll(assigneeLoginsOf).toEqual([...untouchedAssignees, 'workspace-owner']);
    await card.click({ button: 'right' });
    await page.getByTestId(`board-item-action-assign-${workItemId}`).click();
    await expect(assignTarget).toBeVisible();
    await expect(assignTarget).toHaveJSProperty('isChecked', true);
    await assignTarget.click();
    await expect.poll(assigneeLoginsOf).toEqual(untouchedAssignees);

    // The backlog is a human gate, so the card offers the decisions the drawer offers there.
    await card.click({ button: 'right' });
    await expect(page.getByTestId(`board-item-action-decide-approve-${workItemId}`)).toBeVisible();
    await expect(page.getByTestId(`board-item-action-analyze-${workItemId}`)).toHaveCount(0);

    // `Open work item` opens the work item's own screen; Back returns to the board.
    await expect(openAction).toBeVisible();
    await openAction.click();
    await expect
      .poll(() => page.evaluate(() => window.location.hash))
      .toBe(`#/main/board/${encodeURIComponent(workItemId)}`);
    await page.getByTestId('navigate-back').click();
    await expect(page.getByTestId('board-view')).toBeVisible();
    await expect(card).toBeVisible();

    // The trigger sits in the card's id row, before the avatar that keeps the trailing edge, so
    // revealing it never moves the avatar or the title. It stays inside the card's content box.
    const triggerPlacement = await card.evaluate((element) => {
      const button = element.querySelector('mosaik-dropdown-button')!.getBoundingClientRect();
      const id = element.querySelector('[test-id^="board-item-id-"]')!.getBoundingClientRect();
      const avatar = element
        .querySelector('[test-id^="board-item-avatar-"]')
        ?.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return {
        insideCard: button.left >= bounds.left && button.right <= bounds.right,
        afterId: button.left >= id.right - 1,
        beforeAvatar: avatar ? button.right <= avatar.left + 1 : true,
        sharesIdRow:
          Math.abs(button.top + button.height / 2 - (id.top + id.height / 2)) <= button.height / 2,
      };
    });
    expect(triggerPlacement).toEqual({
      insideCard: true,
      afterId: true,
      beforeAvatar: true,
      sharesIdRow: true,
    });

    // Every provider write behind a card action takes as long as the provider does, so the
    // corner records what it showed at each step: the trigger has to give way to a running
    // indicator in exactly its place, whether or not the pointer is still on the card.
    await page.evaluate((id) => {
      const corner = document.querySelector(`[test-id="board-item-actions-${id}"]`)!.parentElement!;
      const samples: unknown[] = [];
      (window as unknown as { cornerSamples: unknown[] }).cornerSamples = samples;
      const sample = () => {
        const button = corner.querySelector('mosaik-dropdown-button');
        const ring = corner.querySelector('mosaik-progress-ring');
        samples.push({
          buttonVisible: button ? getComputedStyle(button).visibility === 'visible' : false,
          ringBox: ring?.getBoundingClientRect(),
          buttonBox: button?.getBoundingClientRect(),
        });
      };
      new MutationObserver(sample).observe(corner, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }, workItemId);

    // Closing through the gate is a provider write, not a local note: the issue is closed
    // where it lives, and the board stops offering it as work that is still to be done.
    await card.click({ button: 'right' });
    const closeAsDuplicate = page.getByTestId(`board-item-action-decide-duplicate-${workItemId}`);
    await expect(closeAsDuplicate).toBeVisible();
    await expect(closeAsDuplicate).toContainText('Close as duplicate');
    await closeAsDuplicate.click();
    // The pointer leaves the card the moment the menu closes; the indicator must not leave with it.
    await page.mouse.move(5, 5);
    await expect.poll(boardColumnOf).toBe('done');
    const closed = await page.evaluate(async (id) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      const snapshot = await api.request('snapshot.get', {});
      const process = await api.request('workflow.get', { workItemId: id });
      const item = snapshot.workItems.find((candidate) => candidate.id === id);
      return {
        nativeState: item?.nativeState,
        runtimeState: process.record?.runtimeState,
        closureReason: process.record?.routing?.closureReason,
      };
    }, workItemId);
    expect(closed).toEqual({
      nativeState: 'closed',
      runtimeState: 'closed',
      closureReason: 'duplicate',
    });
    const running = await page.evaluate(() =>
      (
        window as unknown as {
          cornerSamples: {
            buttonVisible: boolean;
            ringBox?: DOMRect;
            buttonBox?: DOMRect;
          }[];
        }
      ).cornerSamples.filter((sample) => sample.ringBox),
    );
    expect(running.length).toBeGreaterThan(0);
    for (const sample of running) {
      expect(sample.buttonVisible).toBe(false);
      // The ring stands where the trigger stood, so nothing on the card moves while it runs.
      expect(Math.round(sample.ringBox!.left + sample.ringBox!.width / 2)).toBe(
        Math.round(sample.buttonBox!.left + sample.buttonBox!.width / 2),
      );
      expect(Math.round(sample.ringBox!.top + sample.ringBox!.height / 2)).toBe(
        Math.round(sample.buttonBox!.top + sample.buttonBox!.height / 2),
      );
    }
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
