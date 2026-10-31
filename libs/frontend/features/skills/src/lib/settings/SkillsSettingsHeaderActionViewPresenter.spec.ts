// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { SettingsEditorService } from '@symphony/frontend-setting';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SkillStore } from '../catalog/SkillStore';
import { SkillsSettingsHeaderActionViewPresenter } from './SkillsSettingsHeaderActionViewPresenter';

// #endregion

function arrange() {
  const open = vi.fn<SettingsEditorService['open']>(async () => undefined);
  const refreshSkills = vi.fn(async () => undefined);
  TestBed.configureTestingModule({
    providers: [
      SkillsSettingsHeaderActionViewPresenter,
      { provide: SettingsEditorService, useValue: { open } },
      { provide: SkillStore, useValue: { skillsBusy: signal(false), refreshSkills } },
    ],
  });
  return {
    presenter: TestBed.inject(SkillsSettingsHeaderActionViewPresenter),
    open,
    refreshSkills,
  };
}

describe('SkillsSettingsHeaderActionViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('opens the import, catalog and new-skill sheets through the Settings editor owner', () => {
    // arrange
    const { presenter, open } = arrange();

    // act
    presenter.openSkillImportCommand.execute();
    presenter.openSkillCatalogCommand.execute();
    presenter.newSkillCommand.execute();

    // assert
    expect(open.mock.calls.map(([request]) => request)).toEqual([
      { kind: 'skill-import' },
      { kind: 'skill-catalog' },
      { kind: 'skill-editor', mode: 'create' },
    ]);
  });

  it('reloads the installed skills', () => {
    // arrange
    const { presenter, refreshSkills } = arrange();

    // act
    presenter.refreshSkillsCommand.execute();

    // assert
    expect(refreshSkills).toHaveBeenCalledOnce();
  });
});
