// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { ISkillCustomizationSetting, ISkillPackageDocument } from '@symphony/domain-skills';
import type { ISkillPackagePort } from './ISkillPackagePort';
import type { ISkillRoleAssignment } from './ISkillRoleAssignment';
import type { ISkillCatalogDependencies } from './ISkillCatalogDependencies';
import { SkillCatalogService } from './SkillCatalogService';

// #endregion

function document(
  id: string,
  source: ISkillPackageDocument['source'] = 'user',
): ISkillPackageDocument {
  return {
    id,
    name: id.split(':')[1] ?? id,
    displayName: id,
    description: 'Package policy.',
    source,
    location: '/fixture',
    editable: source === 'user',
    implicitInvocation: false,
    updatedAt: '2026-10-06T12:00:00Z',
    digest: '0123456789abcdef'.repeat(4),
    resourceCount: 0,
    warnings: [],
    instructions: 'Original instructions.',
    openaiYaml: '',
    files: [],
  };
}

function fixture(
  assignments: readonly ISkillRoleAssignment[],
  documents: readonly ISkillPackageDocument[] = [],
) {
  const available = new Map(documents.map((item) => [item.id, item]));
  let customizations: ISkillCustomizationSetting[] = [];
  const packages: ISkillPackagePort = {
    list: vi.fn((repositoryRoot?: string) => ({
      sharedRoot: '/shared',
      repositoryRoot,
      packages: [...available.values()],
    })),
    get: vi.fn((id: string) => {
      const item = available.get(id);
      if (!item) throw new Error('Package unavailable.');
      return item;
    }),
    save: vi.fn(() => document('user:saved')),
    validate: vi.fn(),
    import: vi.fn(() => document('user:imported')),
    export: vi.fn(() => ({ path: '/export', message: 'Exported.' })),
    delete: vi.fn(() => ({ message: 'Removed.' })),
  };
  const repositorySkillRoot = vi.fn<ISkillCatalogDependencies['repositorySkillRoot']>(
    () => '/repository/.agents/skills',
  );
  const service = new SkillCatalogService({
    packages,
    repositorySkillRoot,
    assignmentsFor: () => assignments,
    customizations: () => customizations,
    saveCustomizations: (next) => {
      customizations = next;
    },
    clock: { now: () => '2026-10-06T12:00:00Z' },
    digest: (text) => text.length.toString(16).padStart(64, '0'),
  });
  return { service, packages, repositorySkillRoot, customizations: () => customizations };
}

describe('SkillCatalogService', () => {
  it('keeps a missing explicit assignment unresolved while absent assignments use bundled roles', () => {
    // arrange
    const test = fixture([{ role: 'analysis', skillId: 'user:missing' }]);
    // act
    const missing = test.service.analysisSkill('workspace-1');
    const bundled = test.service.solutionSkill('workspace-1');
    // assert
    expect(missing).toBeUndefined();
    expect(bundled).toMatchObject({
      id: 'bundled:solution',
      source: 'bundled',
      editable: false,
      files: [],
    });
    expect(test.repositorySkillRoot).toHaveBeenCalledWith('workspace-1');
  });

  it('projects only active packages with every assigned role and the existing digest version', () => {
    // arrange
    const selected = document('repository:policy', 'repository');
    const test = fixture(
      [
        { role: 'analysis', skillId: selected.id },
        { role: 'solution', skillId: selected.id },
        { role: 'work-item-creation', skillId: null },
      ],
      [selected, document('user:unused')],
    );
    // act
    const manifests = test.service.skills('workspace-1');
    // assert
    expect(manifests).toHaveLength(2);
    expect(manifests[0]).toMatchObject({
      id: selected.id,
      version: '0123456789ab',
      capabilities: ['analysis', 'solution'],
      source: 'workspace',
    });
    expect(manifests[1]).toMatchObject({
      id: 'bundled:work-item-creation',
      capabilities: ['work-item-creation'],
      source: 'bundled',
    });
    expect(test.packages.get).toHaveBeenCalledWith(selected.id, '/repository/.agents/skills');
  });

  it('omits an unreadable selected package without silently replacing it with a builtin', () => {
    // arrange
    const selected = document('legacy:policy', 'legacy');
    const test = fixture([{ role: 'analysis', skillId: selected.id }], [selected]);
    vi.mocked(test.packages.get).mockImplementation(() => {
      throw new Error('Unreadable.');
    });
    // act
    const manifests = test.service.skills();
    const skill = test.service.analysisSkill();
    // assert
    expect(manifests).toEqual([]);
    expect(skill).toBeUndefined();
  });

  it('keeps legacy packages classified as user manifests', () => {
    // arrange
    const selected = document('legacy:policy', 'legacy');
    const test = fixture([{ role: 'analysis', skillId: selected.id }], [selected]);
    // act
    const manifests = test.service.skills();
    // assert
    expect(manifests[0]?.source).toBe('user');
  });

  it('trims and removes only the addressed customization without widening shipped role fields', () => {
    // arrange
    const test = fixture([]);
    // act
    test.service.customizeBuiltin('solve', 'Keep the existing implementation policy.');
    test.service.customizeBuiltin('analyze', '  Check the contract.\r\n');
    const configured = test.service.builtins().find((role) => role.role === 'analyze');
    test.service.customizeBuiltin('analyze', ' \r\n ');
    // assert
    expect(configured?.additionalInstructions).toBe('Check the contract.');
    expect(configured).not.toHaveProperty('resultContract');
    expect(test.customizations()).toEqual([
      { role: 'solve', additionalInstructions: 'Keep the existing implementation policy.' },
    ]);
  });

  it('loads only user packages for workspace transfer without adding a repository scope', () => {
    // arrange
    const user = document('user:shared');
    const test = fixture(
      [],
      [user, document('repository:policy', 'repository'), document('legacy:policy', 'legacy')],
    );
    // act
    const shared = test.service.sharedPackages();
    // assert
    expect(shared).toEqual([user]);
    expect(test.packages.list).toHaveBeenCalledWith();
    expect(test.packages.get).toHaveBeenCalledWith(user.id);
    expect(test.repositorySkillRoot).not.toHaveBeenCalled();
  });
});
