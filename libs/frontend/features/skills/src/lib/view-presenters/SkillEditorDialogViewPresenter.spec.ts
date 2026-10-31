// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsAlertService } from '@symphony/frontend-setting';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SkillStore } from '../catalog/SkillStore';
import { SKILL_IMPORT_PATHS } from '../settings/SkillImportPathsToken';
import { SkillEditorDialogViewPresenter } from './SkillEditorDialogViewPresenter';

// #endregion

function arrange(confirmed: boolean) {
  const confirm = vi.fn(async () => confirmed);
  const deleteSkill = vi.fn(async () => true);
  const assignSkillToFlow = vi.fn(async () => true);
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      SkillEditorDialogViewPresenter,
      {
        provide: SkillStore,
        useValue: {
          skillCatalog: signal(undefined),
          skillsBusy: signal(false),
          skillFlowRole: () => 'solution',
          deleteSkill,
          assignSkillToFlow,
        },
      },
      { provide: SettingsAlertService, useValue: { confirm } },
      { provide: SKILL_IMPORT_PATHS, useValue: { selectPath: vi.fn() } },
      { provide: DIALOG_REF, useValue: { close } },
      {
        provide: DIALOG_REF_DATA,
        useValue: { kind: 'skill-editor', mode: 'edit', skillId: 'user:xrechnung-validation' },
      },
    ],
  });
  const presenter = TestBed.inject(SkillEditorDialogViewPresenter);
  presenter.draft = { ...presenter.draft, originalName: 'xrechnung-validation' };
  return { presenter, confirm, deleteSkill, assignSkillToFlow, close };
}

describe('SkillEditorDialogViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('moves the package to the trash only after the alert sheet is confirmed', async () => {
    // arrange
    const declined = arrange(false);

    // act
    declined.presenter.deleteSkillCommand.execute();
    await vi.waitFor(() => expect(declined.confirm).toHaveBeenCalledOnce());

    // assert
    expect(declined.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        header: 'Move “xrechnung-validation” to trash?',
        confirmLabel: 'Move to trash',
        destructive: true,
      }),
    );
    expect(declined.deleteSkill).not.toHaveBeenCalled();
  });

  it('deletes the package and closes the sheet after confirmation', async () => {
    // arrange
    const { presenter, deleteSkill, close } = arrange(true);

    // act
    presenter.deleteSkillCommand.execute();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());

    // assert
    expect(deleteSkill).toHaveBeenCalledWith('xrechnung-validation');
  });

  it('moves an active package to another optional AI step', async () => {
    // arrange
    const { presenter, assignSkillToFlow } = arrange(true);

    // act
    presenter.assignFlowCommand.execute({ detail: { value: 'pull-request-review' } });
    await vi.waitFor(() => expect(assignSkillToFlow).toHaveBeenCalledOnce());

    // assert
    expect(presenter.flowRole()).toBe('solution');
    expect(assignSkillToFlow).toHaveBeenCalledWith(
      'user:xrechnung-validation',
      'pull-request-review',
    );
  });
});
