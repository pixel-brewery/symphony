// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { IAgentPhaseAssignment } from '@symphony/domain-team';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ISkillsClient } from '../ports/ISkillsClient';
import { SKILLS_CLIENT } from '../ports/SkillsClientToken';
import { SkillsAssignments } from './SkillsAssignments';

// #endregion

function arrange() {
  const original = applicationSettingsSchema.parse(
    createDefaultApplicationSettings('/tmp/symphony'),
  );
  const settings = signal<ApplicationSettingsDto | undefined>(original);
  const saveSettings = vi.fn<ConfigurationStore['saveSettings']>().mockResolvedValue(true);
  const configuration: Pick<ConfigurationStore, 'settings' | 'saveSettings' | 'applySettings'> = {
    settings,
    saveSettings,
    applySettings: (next) => settings.set(next),
  };
  const client: ISkillsClient = {
    request: async () => {
      throw new Error('Unexpected native request.');
    },
  };
  TestBed.configureTestingModule({
    providers: [
      SkillsAssignments,
      { provide: ConfigurationStore, useValue: configuration },
      { provide: SKILLS_CLIENT, useValue: client },
    ],
  });
  return { original, saveSettings, assignments: TestBed.inject(SkillsAssignments) };
}

describe('SkillsAssignments', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('saves through the one writer and isolates the submitted assignments from later draft edits', async () => {
    // arrange
    const { original, saveSettings, assignments } = arrange();
    const team = original.agentTeams[0];
    const phase = team?.assignments[0];
    if (!team || !phase) throw new Error('The default workspace must contain a staffed team.');
    const fallbackAgentIds: string[] = [...phase.fallbackAgentIds];
    const proposal: readonly IAgentPhaseAssignment[] = [{ ...phase, fallbackAgentIds }];

    // act
    const accepted = await assignments.saveAssignments([
      { teamId: team.id, assignments: proposal },
    ]);
    fallbackAgentIds.push('later-draft-edit');

    // assert
    expect(accepted).toBe(true);
    expect(saveSettings).toHaveBeenCalledOnce();
    const [submitted, successMessage] = saveSettings.mock.calls[0] ?? [];
    expect(successMessage).toBe(false);
    expect(
      submitted?.agentTeams.find((candidate) => candidate.id === team.id)?.assignments[0]
        ?.fallbackAgentIds,
    ).toEqual(phase.fallbackAgentIds);
    expect(submitted?.repositoryBindings).toBe(original.repositoryBindings);
    expect(submitted?.workflow).toBe(original.workflow);
  });

  it('declines an assignment for an absent team without issuing a settings transaction', async () => {
    // arrange
    const { assignments, saveSettings } = arrange();

    // act
    const accepted = await assignments.saveAssignments([
      { teamId: 'removed-team', assignments: [] },
    ]);

    // assert
    expect(accepted).toBe(false);
    expect(saveSettings).not.toHaveBeenCalled();
  });
});
