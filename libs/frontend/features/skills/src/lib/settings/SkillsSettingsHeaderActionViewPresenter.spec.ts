// @vitest-environment jsdom

// #region Imports
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { SettingsEditorService } from '@symphony/frontend-setting';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SkillsSettingsHeaderActionViewPresenter } from './SkillsSettingsHeaderActionViewPresenter';
// #endregion

describe('SkillsSettingsHeaderActionViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('opens the same portable import intent through the generic editor owner', () => {
    // arrange
    const open = vi.fn<SettingsEditorService['open']>(async () => undefined);
    TestBed.configureTestingModule({
      providers: [
        SkillsSettingsHeaderActionViewPresenter,
        { provide: SettingsEditorService, useValue: { open } },
      ],
    });
    const presenter = TestBed.inject(SkillsSettingsHeaderActionViewPresenter);
    // act
    presenter.openSkillImportCommand.execute();
    // assert
    expect(open).toHaveBeenCalledExactlyOnceWith({ kind: 'skill-import' });
  });
});
