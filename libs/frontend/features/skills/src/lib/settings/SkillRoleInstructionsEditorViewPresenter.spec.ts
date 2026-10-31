// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SkillStore } from '../catalog/SkillStore';
import { SkillRoleInstructionsEditorViewPresenter } from './SkillRoleInstructionsEditorViewPresenter';

// #endregion

function arrange(saves = true) {
  const skills = signal<readonly BuiltinSkillDto[]>([
    {
      role: 'create',
      displayName: 'Create',
      description: 'Turns a request into a structured, implementation-ready work item.',
      version: '1.1.0',
      promptVersion: 2,
      instructions: 'You draft a work item from a human request.',
      mutatesWorkspace: false,
      publishesPullRequest: false,
      additionalInstructions: 'Link the Teams message.',
    },
  ]);
  const customizeBuiltinSkill = vi.fn(async (role: string, additionalInstructions: string) => {
    if (saves)
      skills.update((items) =>
        items.map((item) => (item.role === role ? { ...item, additionalInstructions } : item)),
      );
  });
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      SkillRoleInstructionsEditorViewPresenter,
      { provide: SkillStore, useValue: { builtinSkills: skills, customizeBuiltinSkill } },
      { provide: DIALOG_REF, useValue: { close } },
      { provide: DIALOG_REF_DATA, useValue: { kind: 'skill-role-instructions', role: 'create' } },
    ],
  });
  return {
    presenter: TestBed.inject(SkillRoleInstructionsEditorViewPresenter),
    customizeBuiltinSkill,
    close,
  };
}

describe('SkillRoleInstructionsEditorViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('starts on the stored additions of the role and its delivery-flow step', () => {
    // act
    const { presenter } = arrange();

    // assert
    expect(presenter.additions()).toBe('Link the Teams message.');
    expect(presenter.step?.label).toBe('Create');
    expect(presenter.tab()).toBe('additional');
  });

  it('saves the written additions and closes the sheet', async () => {
    // arrange
    const { presenter, customizeBuiltinSkill, close } = arrange();
    presenter.updateAdditionsCommand.execute({ detail: { value: 'Number the criteria.' } });

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());

    // assert
    expect(customizeBuiltinSkill).toHaveBeenCalledWith('create', 'Number the criteria.');
  });

  it('keeps the sheet open with the written text when saving fails', async () => {
    // arrange
    const { presenter, close } = arrange(false);
    presenter.updateAdditionsCommand.execute({ detail: { value: 'Number the criteria.' } });

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(close).not.toHaveBeenCalled();
    expect(presenter.additions()).toBe('Number the criteria.');
  });

  it('resets the role to its built-in instructions', async () => {
    // arrange
    const { presenter, customizeBuiltinSkill, close } = arrange();

    // act
    presenter.resetCommand.execute();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());

    // assert
    expect(customizeBuiltinSkill).toHaveBeenCalledWith('create', '');
  });
});
