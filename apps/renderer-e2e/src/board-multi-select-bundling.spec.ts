// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { expandBoardColumn } from './expandBoardColumn';

// #endregion

test('bundles two natively selected cards into an attested delivery group', async () => {
  // arrange
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `board-bundling-${process.pid}`);
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
      // A second backlog card beside work-item-142; the pair shares no repository path in its
      // issue text, so the manual proposal fails the evidence gates and requires attestation.
      SYMPHONY_SIMULATED_ADDITIONAL_WORK_ITEMS: '1',
    },
  });

  // assert
  try {
    const page = await mainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.stack ?? error.message));
    await expect(page.getByTestId('home-view')).toBeVisible();
    await page.getByTestId('navigation-board').click();
    await expect(page.getByTestId('board-view')).toBeVisible();

    // Backlog starts as a collapsed strip; the selected cards live in it.
    await expandBoardColumn(page, 'backlog');
    const rootItemId = 'work-item-142';
    const memberItemId = 'work-item-overflow-1';
    const rootCard = page.getByTestId(`board-item-${rootItemId}`);
    const memberCard = page.getByTestId(`board-item-${memberItemId}`);
    await expect(rootCard).toBeVisible();
    await expect(memberCard).toBeVisible();

    // At rest the cards show no selection checkbox, as drawn. Command-click (Control-click off
    // macOS) starts a selection without opening the card; from then on the board runs the native
    // flow-board multi-selection, so every card renders its own checkbox in the shadow
    // `selection` part, and the selected state lives on the card host as `aria-selected`.
    const rootCheckbox = rootCard.locator('[part="selectionCheckbox"]');
    await expect(rootCheckbox).toHaveCount(0);
    await rootCard.getByTestId(`board-item-title-${rootItemId}`).click({
      modifiers: ['ControlOrMeta'],
    });
    await expect(rootCard).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('board-view')).toBeVisible();

    // One selected ticket cannot deliver alone; the action names the current count.
    const deliverTogether = page.getByTestId('board-deliver-selected');
    await expect(page.getByTestId('board-selection-actions')).toBeVisible();
    await expect(deliverTogether).toHaveJSProperty('label', 'Deliver together (1)');
    await expect(deliverTogether).toHaveJSProperty('disabled', true);

    const memberCheckbox = memberCard.locator('[part="selectionCheckbox"]');
    await expect(memberCheckbox).toBeVisible();
    await memberCheckbox.click();
    await expect(memberCard).toHaveAttribute('aria-selected', 'true');
    await expect(deliverTogether).toHaveJSProperty('label', 'Deliver together (2)');
    await expect(deliverTogether).toHaveJSProperty('disabled', false);
    await page.evaluate(() =>
      Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
    );
    await page.screenshot({
      path: resolve(outputDirectory, 'board-multi-select-bundling-selected.png'),
      fullPage: true,
    });

    // The action requests Analyzer evidence and opens the review drawer on the proposal.
    await deliverTogether.click();
    await expect(page.getByTestId('delivery-group-mode')).toBeVisible();
    await page.getByTestId('delivery-group-mode-analyzer').click();
    await page.getByTestId('delivery-group-mode-continue').click();
    const drawer = page.getByTestId('delivery-group-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId(`delivery-group-item-${rootItemId}`)).toBeVisible();
    await expect(page.getByTestId(`delivery-group-item-${memberItemId}`)).toBeVisible();
    // The first selected card is retained as root.
    await expect(page.getByTestId(`delivery-group-item-${rootItemId}`)).toHaveJSProperty(
      'label',
      'Root · #142',
    );

    // The unrelated pair passes every safety gate but fails the evidence gates, so confirming
    // requires the operator attestation the drawer announces.
    await expect(page.getByTestId('delivery-group-attestation')).toBeVisible();
    const confirm = page.getByTestId('delivery-group-confirm');
    await expect(confirm).toHaveJSProperty('label', 'Deliver together anyway');
    await page.evaluate(() =>
      Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
    );
    await page.screenshot({
      path: resolve(outputDirectory, 'board-multi-select-bundling-attestation.png'),
      fullPage: true,
    });
    await confirm.click();
    await expect(drawer).toHaveCount(0);

    // The attested group is persisted with its operator attestation and the selected members.
    const group = await page.evaluate(
      async (memberIds) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const snapshot = await api.request('snapshot.get', {});
        const match = (snapshot.deliveryGroups ?? []).find((candidate) =>
          memberIds.every((workItemId) => candidate.workItemIds.includes(workItemId)),
        );
        return match
          ? {
              id: match.id,
              state: match.state,
              rootWorkItemId: match.rootWorkItemId,
              activationSource: match.activationSource,
              attested: Boolean(match.operatorAttestation?.attestedAt),
            }
          : undefined;
      },
      [rootItemId, memberItemId],
    );
    expect(group).toMatchObject({
      state: 'active',
      rootWorkItemId: rootItemId,
      activationSource: 'manual-select',
      attested: true,
    });

    // The board now stacks the members behind the root card and retires the selection: the
    // toolbar actions leave and no card on the board keeps a selected state.
    const groupStack = page
      .getByTestId('board-column-backlog')
      .getByTestId(`board-delivery-group-${group!.id}`);
    await expect(groupStack).toBeVisible();
    await expect(groupStack).toContainText('Add deterministic workspace reconciliation');
    await expect(groupStack).toContainText('2 tickets');
    await expect(groupStack).toContainText('Root · #142');
    await expect(page.getByTestId('board-selection-actions')).toHaveCount(0);
    await expect(page.getByTestId('board-view').locator('[aria-selected="true"]')).toHaveCount(0);
    await page.screenshot({
      path: resolve(outputDirectory, 'board-multi-select-bundling-group.png'),
      fullPage: true,
    });
    expect(rendererErrors).toEqual([]);
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});

async function mainWindow(app: ElectronApplication) {
  const existing = app.windows().find((page) => !page.url().includes('#/menu-bar'));
  return (
    existing ??
    (await app.waitForEvent('window', {
      predicate: (page) => !page.url().includes('#/menu-bar'),
    }))
  );
}
