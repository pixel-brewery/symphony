// @vitest-environment jsdom

// #region Imports
import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { SettingsHostSession } from '@symphony/frontend-setting';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';
import { SkillsSettingsDrafts } from './SkillsSettingsDrafts';
// #endregion

function fixture(saveGate?: Promise<void>) {
  const skills = signal<readonly BuiltinSkillDto[]>([
    {
      role: 'analyze',
      displayName: 'Analyzer',
      description: 'Read the issue',
      version: '1',
      promptVersion: 1,
      instructions: 'Read only',
      additionalInstructions: 'Saved additions',
      mutatesWorkspace: false,
      publishesPullRequest: false,
    },
  ]);
  const saves: { role: BuiltinSkillDto['role']; instructions: string }[] = [];
  const drafts = new SkillsSettingsDrafts({
    builtinSkills: skills,
    skillsBusy: signal(false),
    customizeBuiltinSkill: async (role, instructions) => {
      saves.push({ role, instructions });
      if (saveGate) await saveGate;
      skills.update((current) =>
        current.map((skill) =>
          skill.role === role ? { ...skill, additionalInstructions: instructions } : skill,
        ),
      );
    },
  });
  return { drafts, saves, skills };
}

function deferred() {
  let finish: () => void = () => {
    throw new Error('The pending save was not created.');
  };
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { promise, resolve: () => finish() };
}

describe('SkillsSettingsDrafts', () => {
  it('retains edits and selected tabs across section switches while resetting only for a new host session', () => {
    // arrange
    const { drafts } = fixture();
    const session = new SettingsHostSession();
    drafts.beginSession(session);
    drafts.updateSkillInstructionsCommand.execute([
      'analyze',
      { detail: { value: 'Unsaved addition' } },
    ]);
    drafts.selectSkillTabCommand.execute(['analyze', 'shipped']);
    // act
    drafts.beginSession(session);
    // assert
    expect(drafts.skillInstructions()('analyze')).toBe('Unsaved addition');
    expect(drafts.skillTab()('analyze')).toBe('shipped');
    drafts.beginSession(new SettingsHostSession());
    expect(drafts.skillInstructions()('analyze')).toBe('Saved additions');
    expect(drafts.skillTab()('analyze')).toBe('additional');
  });

  it('saves and resets through the same Skills owner and then follows its current confirmed instructions', async () => {
    // arrange
    const { drafts, saves, skills } = fixture();
    drafts.updateSkillInstructionsCommand.execute([
      'analyze',
      { target: { value: 'New additions' } },
    ]);
    // act
    drafts.saveSkillInstructionsCommand.execute('analyze');
    await Promise.resolve();
    skills.update((current) =>
      current.map((skill) => ({ ...skill, additionalInstructions: 'Server confirmed' })),
    );
    // assert
    expect(saves).toEqual([{ role: 'analyze', instructions: 'New additions' }]);
    expect(drafts.skillInstructions()('analyze')).toBe('Server confirmed');
    drafts.resetSkillInstructionsCommand.execute('analyze');
    await Promise.resolve();
    expect(saves.at(-1)).toEqual({ role: 'analyze', instructions: '' });
    expect(drafts.skillInstructions()('analyze')).toBe('');
  });

  it.each(['save', 'reset'] as const)(
    'retains a new Settings route draft when the previous session %s finishes',
    async (operation) => {
      // arrange
      const pending = deferred();
      const { drafts, saves, skills } = fixture(pending.promise);
      drafts.beginSession(new SettingsHostSession());
      drafts.updateSkillInstructionsCommand.execute([
        'analyze',
        { detail: { value: 'Submitted additions' } },
      ]);
      const command =
        operation === 'save'
          ? drafts.saveSkillInstructionsCommand
          : drafts.resetSkillInstructionsCommand;
      command.execute('analyze');
      drafts.beginSession(new SettingsHostSession());
      drafts.updateSkillInstructionsCommand.execute([
        'analyze',
        { detail: { value: 'New route additions' } },
      ]);
      // act
      pending.resolve();
      await pending.promise;
      await Promise.resolve();
      // assert
      const submitted = operation === 'save' ? 'Submitted additions' : '';
      expect(saves).toEqual([{ role: 'analyze', instructions: submitted }]);
      expect(skills()[0]?.additionalInstructions).toBe(submitted);
      expect(drafts.skillInstructions()('analyze')).toBe('New route additions');
    },
  );

  it.each(['save', 'reset'] as const)(
    'retains newer edits in the same Settings session while an earlier %s finishes',
    async (operation) => {
      // arrange
      const pending = deferred();
      const { drafts, skills } = fixture(pending.promise);
      drafts.beginSession(new SettingsHostSession());
      drafts.updateSkillInstructionsCommand.execute([
        'analyze',
        { target: { value: 'Submitted additions' } },
      ]);
      const command =
        operation === 'save'
          ? drafts.saveSkillInstructionsCommand
          : drafts.resetSkillInstructionsCommand;
      command.execute('analyze');
      drafts.updateSkillInstructionsCommand.execute([
        'analyze',
        { target: { value: 'Newer additions' } },
      ]);
      // act
      pending.resolve();
      await pending.promise;
      await Promise.resolve();
      // assert
      expect(skills()[0]?.additionalInstructions).toBe(
        operation === 'save' ? 'Submitted additions' : '',
      );
      expect(drafts.skillInstructions()('analyze')).toBe('Newer additions');
    },
  );
});
