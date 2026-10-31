// @vitest-environment jsdom

// #region Imports

import type { BuiltinSkillDto, SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';
import { describe, expect, it } from 'vitest';
import { projectSkillSteps } from './projectSkillSteps';

// #endregion

function role(name: BuiltinSkillDto['role']): BuiltinSkillDto {
  return {
    role: name,
    displayName: name,
    description: '',
    version: '1.0.0',
    promptVersion: 1,
    instructions: '',
    mutatesWorkspace: false,
    publishesPullRequest: false,
    additionalInstructions: '',
  };
}

function skillPackage(id: string): SkillPackageCatalogDto['packages'][number] {
  return {
    id,
    name: id,
    displayName: id,
    description: '',
    source: 'user',
    location: `/skills/${id}`,
    editable: true,
    implicitInvocation: false,
    updatedAt: '2026-10-31T00:00:00.000Z',
    digest: 'digest',
    resourceCount: 0,
    warnings: [],
  };
}

describe('projectSkillSteps', () => {
  it('orders the process roles and attached packages by the delivery-flow steps', () => {
    // arrange
    const roles = ['pull-request-review', 'verify', 'create', 'solve', 'ci-repair'].map((name) =>
      role(name as BuiltinSkillDto['role']),
    );
    const packages = [skillPackage('triage'), skillPackage('xrechnung')];
    const assignments: Record<string, string> = {
      'work-item-creation': 'triage',
      solution: 'xrechnung',
    };

    // act
    const actual = projectSkillSteps(roles, packages, (flowRole) => assignments[flowRole]).map(
      (entry) => ({
        step: entry.step.label,
        roles: entry.roles.map((item) => item.role),
        packages: entry.packages.map((item) => item.id),
        open: entry.openOptions.map((option) => option.label),
      }),
    );

    // assert
    expect(actual).toEqual([
      { step: 'Create', roles: ['create'], packages: ['triage'], open: [] },
      { step: 'Plan', roles: [], packages: [], open: ['Analyze with AI'] },
      {
        step: 'Implement and verify',
        roles: ['solve', 'verify'],
        packages: ['xrechnung'],
        open: [],
      },
      {
        step: 'Fix failed checks',
        roles: ['ci-repair'],
        packages: [],
        open: ['Diagnose CI with AI', 'Repair CI with AI'],
      },
      {
        step: 'Address reviews',
        roles: ['pull-request-review'],
        packages: [],
        open: ['Address reviews with AI'],
      },
    ]);
  });

  it('leaves an attached package out when the catalog no longer lists it', () => {
    // act
    const actual = projectSkillSteps([], [], () => 'missing')[0];

    // assert
    expect(actual?.packages).toEqual([]);
    expect(actual?.openOptions.map((option) => option.role)).toEqual(['work-item-creation']);
  });
});
