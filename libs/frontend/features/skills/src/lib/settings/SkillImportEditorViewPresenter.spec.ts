// @vitest-environment jsdom

// #region Imports
import { ApplicationRef, ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DRAWER_REF, DRAWER_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SkillStore } from '../catalog/SkillStore';
import type { ISkillImportPaths } from './ISkillImportPaths';
import { SKILL_IMPORT_PATHS } from './SkillImportPathsToken';
import { SKILLS_SETTINGS_CONTEXT } from './SkillsSettingsContextToken';
import { SkillImportEditorViewPresenter } from './SkillImportEditorViewPresenter';
// #endregion

function arrange(
  importSkill: SkillStore['importSkill'] = async () => true,
  paths: ISkillImportPaths = { selectPath: async () => ({ canceled: true, paths: [] }) },
) {
  const close = vi.fn();
  const busy = signal(false);
  const detectChanges = vi.fn();
  const skills: Pick<SkillStore, 'importSkill'> = { importSkill };
  TestBed.configureTestingModule({
    providers: [
      SkillImportEditorViewPresenter,
      { provide: SkillStore, useValue: skills },
      { provide: DRAWER_REF, useValue: { close } },
      { provide: DRAWER_REF_DATA, useValue: { kind: 'skill-import' } },
      { provide: ChangeDetectorRef, useValue: { detectChanges } },
      { provide: ApplicationRef, useValue: { tick: vi.fn() } },
      { provide: SKILL_IMPORT_PATHS, useValue: paths },
      { provide: SKILLS_SETTINGS_CONTEXT, useValue: { editorBusy: busy } },
    ],
  });
  return { presenter: TestBed.inject(SkillImportEditorViewPresenter), close, busy, detectChanges };
}

describe('SkillImportEditorViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('imports the trimmed path once and closes only after success', async () => {
    // arrange
    let finish: (value: boolean) => void = () => {
      throw new Error('Import was not started');
    };
    const importSkill = vi.fn<SkillStore['importSkill']>(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const { presenter, close } = arrange(importSkill);
    presenter.importPath = ' /portable/skill ';
    // act
    presenter.saveCommand.execute();
    presenter.saveCommand.execute();
    // assert
    expect(importSkill).toHaveBeenCalledExactlyOnceWith('/portable/skill');
    expect(presenter.busy()).toBe(true);
    expect(close).not.toHaveBeenCalled();
    finish(true);
    await vi.waitFor(() => {
      expect(presenter.busy()).toBe(false);
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps a failed import open and follows the existing aggregate editor exclusion', async () => {
    // arrange
    const { presenter, close, busy } = arrange(async () => false);
    presenter.importPath = '/portable/skill';
    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => {
      expect(presenter.busy()).toBe(false);
    });
    busy.set(true);
    // assert
    expect(close).not.toHaveBeenCalled();
    expect(presenter.editorBusy()).toBe(true);
    expect(presenter.importPath).toBe('/portable/skill');
  });

  it('uses the existing directory picker and retains the selected path when selection is cancelled', async () => {
    // arrange
    const selectPath = vi
      .fn<ISkillImportPaths['selectPath']>()
      .mockResolvedValueOnce({ canceled: false, paths: ['/chosen/skill'] })
      .mockResolvedValueOnce({ canceled: true, paths: [] });
    const { presenter, detectChanges } = arrange(async () => false, { selectPath });
    // act
    presenter.chooseImportDirectoryCommand.execute();
    await Promise.resolve();
    presenter.chooseImportDirectoryCommand.execute();
    await Promise.resolve();
    // assert
    expect(selectPath).toHaveBeenNthCalledWith(1, {
      kind: 'directory',
      title: 'Choose portable skill folder',
      defaultPath: undefined,
    });
    expect(selectPath).toHaveBeenNthCalledWith(2, {
      kind: 'directory',
      title: 'Choose portable skill folder',
      defaultPath: '/chosen/skill',
    });
    expect(presenter.importPath).toBe('/chosen/skill');
    expect(detectChanges).toHaveBeenCalledOnce();
  });
});
