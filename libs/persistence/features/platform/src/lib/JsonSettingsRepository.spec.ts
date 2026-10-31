// #region Imports

import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonSettingsRepository } from './JsonSettingsRepository';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('JsonSettingsRepository', () => {
  it('splits portable settings from machine paths and restores workspace bindings', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-settings-'));
    temporaryDirectories.push(directory);
    const settingsPath = join(directory, 'settings.json');
    const machinePath = join(directory, 'machine.json');
    const repository = new JsonSettingsRepository(settingsPath, machinePath);
    repository.initialize();
    const defaults = createDefaultApplicationSettings('/Users/operator');
    const githubConnection = {
      id: 'platform-github',
      workspaceId: 'personal',
      kind: 'github' as const,
      displayName: 'Platform GitHub',
      hostname: 'github.com',
      accountLogin: 'ada',
      gitProtocol: 'https' as const,
    };
    const binding = {
      id: 'platform',
      workspaceId: 'personal',
      sourceControlConnectionId: githubConnection.id,
      displayName: 'Platform',
      provider: 'github' as const,
      host: 'github.com',
      owner: 'example',
      name: 'platform',
      defaultBranch: 'main',
      localPath: '/src/platform',
      enabled: true,
      localCiSetupScript: '# Install repository dependencies\nsudo apt-get install -y libvips',
    };
    const saved = repository.save({
      ...defaults,
      workspaces: defaults.workspaces.map((workspace) => ({
        ...workspace,
        avatar: { kind: 'emoji' as const, value: '👩🏽‍💻' },
        color: '#ff6900',
      })),
      user: { ...defaults.user, displayName: 'Ada' },
      localCi: {
        reuseVirtualMachine: false,
        resourcePreset: 'custom',
        customResources: { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 4 },
        storageLimitGiB: 32,
      },
      connections: [...defaults.connections, githubConnection],
      repositoryBindings: [binding],
      agentRoutePolicies: defaults.agentRoutePolicies.map((policy) => ({
        ...policy,
        candidates: policy.candidates.map((candidate) => ({
          ...candidate,
          model: 'gpt-5.6-sol',
          reasoningEffort: 'high',
        })),
      })),
      agentTeams: defaults.agentTeams.map((team) => ({
        ...team,
        assignments: team.assignments.map((assignment) =>
          assignment.role === 'analysis'
            ? { ...assignment, skillId: 'repository:analyze-change-request' }
            : assignment,
        ),
      })),
    });

    // act
    const loaded = applicationSettingsSchema.parse(repository.load(defaults));

    // assert
    expect(loaded).toEqual(saved);
    expect(loaded.workspaces[0]).toMatchObject({
      avatar: { kind: 'emoji', value: '👩🏽‍💻' },
      color: '#ff6900',
    });
    expect(loaded.repositoryBindings[0]?.localPath).toBe('/src/platform');
    expect(
      loaded.agentTeams[0]?.assignments.find((assignment) => assignment.role === 'analysis')
        ?.skillId,
    ).toBe('repository:analyze-change-request');
    expect(readFileSync(settingsPath, 'utf8')).not.toContain('/src/platform');
    expect(readFileSync(settingsPath, 'utf8')).not.toContain(defaults.runtime.workspaceRoot);
    expect(readFileSync(settingsPath, 'utf8')).not.toContain('resourcePreset');
    expect(readFileSync(settingsPath, 'utf8')).toContain('localCiEnabled');
    expect(readFileSync(settingsPath, 'utf8')).toContain('localCiSetupScript');
    expect(readFileSync(machinePath, 'utf8')).toContain('/src/platform');
    expect(readFileSync(machinePath, 'utf8')).toContain(defaults.runtime.workspaceRoot);
    expect(readFileSync(machinePath, 'utf8')).toContain('resourcePreset');
    for (const path of [settingsPath, machinePath]) {
      const file = statSync(path);
      expect(file.isFile()).toBe(true);
      expect(file.mode & 0o600).toBe(0o600);
      // Node on Windows cannot express POSIX owner/group/other separation.
      if (process.platform !== 'win32') expect(file.mode & 0o777).toBe(0o600);
    }
  });
});
