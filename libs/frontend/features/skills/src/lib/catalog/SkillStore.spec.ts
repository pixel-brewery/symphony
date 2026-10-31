// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { computed, signal } from '@angular/core';
import type { IAgentTeam } from '@symphony/domain-team';
import type { ISkillManifest } from '@symphony/domain-skills';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type {
  BuiltinSkillDto,
  skillRequestSchemas,
  SkillPackageCatalogDto,
  SkillPackageDocumentDto,
} from '@symphony/ipc-contracts-skills';
import { describe, expect, it, vi } from 'vitest';
import type { ISkillsClient } from '../ports/ISkillsClient';
import type { ISkillsTeamAssignments } from '../ports/ISkillsTeamAssignments';
import { SkillStore } from './SkillStore';

// #endregion

type SkillsMethod = keyof typeof skillRequestSchemas;
type SkillsRequestHandlers = {
  [M in SkillsMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
};

function createFixture() {
  const team = signal<IAgentTeam | undefined>({
    id: 'team-1',
    workspaceId: 'workspace-1',
    displayName: 'Team',
    description: '',
    assignments: [
      {
        role: 'analysis',
        primaryAgentId: 'agent-1',
        fallbackAgentIds: [],
        skillId: 'analysis-skill',
      },
      {
        role: 'solution',
        primaryAgentId: 'agent-1',
        fallbackAgentIds: [],
        skillId: 'solution-skill',
      },
    ],
  });
  // A second workspace whose AI team has nobody on Implement and verify (`solution`).
  const otherTeam = signal<IAgentTeam | undefined>({
    id: 'team-2',
    workspaceId: 'workspace-2',
    displayName: 'Other team',
    description: '',
    assignments: [
      { role: 'analysis', primaryAgentId: 'agent-2', fallbackAgentIds: [], skillId: null },
    ],
  });
  const teams = [
    { workspaceName: 'FLAMOX365', team },
    { workspaceName: 'Personal', team: otherTeam },
  ];
  const workspaceTeams = computed(() =>
    teams.flatMap(({ workspaceName, team: entry }) => {
      const value = entry();
      return value ? [{ workspaceId: value.workspaceId, workspaceName, team: value }] : [];
    }),
  );
  const skillManifests = signal<readonly ISkillManifest[]>([]);
  const saveAssignments = vi.fn(
    async (changes: readonly ISkillsTeamAssignments[]): Promise<boolean> => {
      for (const change of changes) {
        const entry = teams.find(({ team: candidate }) => candidate()?.id === change.teamId)?.team;
        const current = entry?.();
        if (!entry || !current) return false;
        entry.set({ ...current, assignments: change.assignments });
      }
      return true;
    },
  );
  const requests = {
    'skills.list': vi.fn<SkillsRequestHandlers['skills.list']>(),
    'skills.builtin.list': vi.fn<SkillsRequestHandlers['skills.builtin.list']>(),
    'skills.builtin.customize': vi.fn<SkillsRequestHandlers['skills.builtin.customize']>(),
    'skills.get': vi.fn<SkillsRequestHandlers['skills.get']>(),
    'skills.save': vi.fn<SkillsRequestHandlers['skills.save']>(),
    'skills.import': vi.fn<SkillsRequestHandlers['skills.import']>(),
    'skills.export': vi.fn<SkillsRequestHandlers['skills.export']>(),
    'skills.delete': vi.fn<SkillsRequestHandlers['skills.delete']>(),
  };
  const handlers: SkillsRequestHandlers = requests;
  const client: ISkillsClient = {
    request<M extends SkillsMethod>(
      method: M,
      payload: RequestPayload<M>,
    ): Promise<ResponsePayload<M>> {
      return handlers[method](payload);
    },
  };
  const refresh = vi.fn().mockResolvedValue(undefined);
  const customizeBuiltinSkill = vi.fn().mockResolvedValue(undefined);
  const notifications = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() };
  const store = new SkillStore(
    {
      workspaceTeams,
      skillManifests: skillManifests.asReadonly(),
      configurationBusy: signal(false).asReadonly(),
    },
    { saveAssignments, customizeBuiltinSkill },
    { refresh },
    client,
    notifications,
  );
  return {
    store,
    team,
    otherTeam,
    skillManifests,
    saveAssignments,
    requests,
    refresh,
    customizeBuiltinSkill,
    notifications,
  };
}

function packageDocument(): SkillPackageDocumentDto {
  return {
    id: 'user:analysis',
    name: 'analysis',
    displayName: 'Analysis',
    description: 'Analyze the repository.',
    source: 'user',
    location: '/test/skills/analysis',
    editable: true,
    implicitInvocation: false,
    updatedAt: '2026-10-30T08:00:00.000Z',
    digest: 'digest',
    resourceCount: 0,
    warnings: [],
    instructions: 'Inspect the repository.',
    openaiYaml: '',
    files: [],
  };
}

describe('SkillStore', () => {
  it('moves an active skill to another role and clears both prior assignments', async () => {
    // arrange
    const { store, team, saveAssignments, refresh } = createFixture();

    // act
    const actual = await store.assignSkillToFlow('analysis-skill', 'solution');

    // assert
    expect(actual).toBe(true);
    expect(saveAssignments).toHaveBeenCalledOnce();
    expect(team()?.assignments.map(({ role, skillId }) => ({ role, skillId }))).toEqual([
      { role: 'analysis', skillId: null },
      { role: 'solution', skillId: 'analysis-skill' },
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('preserves team assignments and skips refresh when aggregate persistence refuses a save', async () => {
    // arrange
    const { store, team, saveAssignments, refresh, notifications } = createFixture();
    const previous = team();
    saveAssignments.mockResolvedValueOnce(false);

    // act
    const actual = await store.assignSkillToFlow('analysis-skill', 'solution');

    // assert
    expect(actual).toBe(false);
    expect(team()).toBe(previous);
    expect(refresh).not.toHaveBeenCalled();
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('attaches a package to the step in every workspace team that has someone on it', async () => {
    // arrange
    const { store, team, otherTeam, saveAssignments, notifications } = createFixture();

    // act
    const actual = await store.activateSkill('review-skill', 'analysis');

    // assert
    expect(actual).toBe(true);
    expect(saveAssignments).toHaveBeenCalledOnce();
    expect(team()?.assignments.find((item) => item.role === 'analysis')?.skillId).toBe(
      'review-skill',
    );
    expect(otherTeam()?.assignments[0]?.skillId).toBe('review-skill');
    expect(notifications.showSuccess).toHaveBeenCalledWith(
      'Skill assigned to the selected flow step. The previous skill was deactivated.',
      '',
    );
  });

  it('names the workspaces without anyone on the step after attaching it elsewhere', async () => {
    // arrange
    const { store, team, otherTeam, notifications } = createFixture();

    // act
    const actual = await store.activateSkill('implementation-skill', 'solution');

    // assert
    expect(actual).toBe(true);
    expect(team()?.assignments.find((item) => item.role === 'solution')?.skillId).toBe(
      'implementation-skill',
    );
    expect(otherTeam()?.assignments).toHaveLength(1);
    expect(notifications.showSuccess).toHaveBeenCalledWith(
      'Skill assigned to the selected flow step. The previous skill was deactivated.',
      'Not attached in Personal: nobody works on Implement and verify there.',
    );
  });

  it('changes nothing and warns instead of reporting success when nobody works on the step', async () => {
    // arrange
    const { store, saveAssignments, refresh, notifications } = createFixture();

    // act
    const actual = await store.activateSkill('review-skill', 'pull-request-review');

    // assert
    expect(actual).toBe(false);
    expect(saveAssignments).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(notifications.showSuccess).not.toHaveBeenCalled();
    expect(notifications.showWarning).toHaveBeenCalledWith(
      'Nobody works on Address reviews',
      'No AI team has someone on Address reviews. Assign an agent to it under AI team, then attach the skill.',
    );
  });

  it('deactivates only the selected skill before refreshing the authoritative snapshot', async () => {
    // arrange
    const { store, team, refresh } = createFixture();

    // act
    const actual = await store.deactivateSkill('analysis-skill');

    // assert
    expect(actual).toBe(true);
    expect(team()?.assignments.map(({ skillId }) => skillId)).toEqual([null, 'solution-skill']);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('refreshes its catalog and built-in roles into one read-only state owner', async () => {
    // arrange
    const { store, requests } = createFixture();
    const catalog: SkillPackageCatalogDto = { sharedRoot: '/test/skills', packages: [] };
    const builtinSkills: readonly BuiltinSkillDto[] = [
      {
        role: 'analyze',
        displayName: 'Analyzer',
        description: 'Analyze the repository.',
        version: '1.0.0',
        promptVersion: 1,
        instructions: 'Inspect the repository.',
        mutatesWorkspace: false,
        publishesPullRequest: false,
        additionalInstructions: '',
      },
    ];
    const catalogSignal = store.skillCatalog;
    requests['skills.list'].mockResolvedValueOnce(catalog);
    requests['skills.builtin.list'].mockResolvedValueOnce({ skills: builtinSkills });

    // act
    await store.refreshSkills();

    // assert
    expect(store.skillCatalog()).toEqual(catalog);
    expect(store.builtinSkills()).toEqual(builtinSkills);
    expect(store.skillsBusy()).toBe(false);
    expect(store.skillCatalog).toBe(catalogSignal);
    expect(store.skillCatalog).not.toHaveProperty('set');
  });

  it('retains the loaded document and clears busy state when a later load fails', async () => {
    // arrange
    const { store, requests, notifications } = createFixture();
    const document = packageDocument();
    requests['skills.get'].mockResolvedValueOnce(document);
    await store.loadSkill(document.id);
    requests['skills.get'].mockRejectedValueOnce(new Error('Provider unavailable.'));

    // act
    const actual = await store.loadSkill('missing-skill');

    // assert
    expect(actual).toBe(false);
    expect(store.activeSkill()).toEqual(document);
    expect(store.skillsBusy()).toBe(false);
    expect(notifications.showError).toHaveBeenCalledWith(
      'Unable to open skill.',
      'Provider unavailable.',
    );
  });
});
