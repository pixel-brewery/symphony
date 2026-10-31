// #region Imports

import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createExecutionFixture } from '../testing/createExecutionFixture';
import { executionFixtureDirectories } from '../testing/ExecutionFixtureDirectories';

// #endregion

afterEach(() => {
  for (const directory of executionFixtureDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('ExecutionRunService', () => {
  it('uses the live matching-ID package even when its digest differs from the saved snapshot', async () => {
    // arrange
    const test = createExecutionFixture(false);
    const starting = test.catalog.analysisSkill();
    if (!starting) throw new Error('Missing analysis fixture.');
    const live = { ...starting, instructions: 'Updated live instructions.', digest: 'live-digest' };
    test.catalog.skill = () => live;
    // act
    const execution = await test.service.start(false, 'item-1');
    await test.terminalEvent;
    // assert
    expect(execution.skillSnapshot?.digest).toBe(starting.digest);
    expect(test.analysisSkills[0]).toBe(live);
  });

  it('uses the matching stored snapshot only when the live package is unavailable', async () => {
    // arrange
    const test = createExecutionFixture(false);
    const starting = test.catalog.analysisSkill();
    if (!starting) throw new Error('Missing analysis fixture.');
    test.catalog.skill = () => undefined;
    // act
    await test.service.start(false, 'item-1');
    await test.terminalEvent;
    // assert
    expect(test.analysisSkills[0]).toMatchObject({
      id: starting.id,
      digest: starting.digest,
      instructions: starting.instructions,
      source: 'user',
      location: 'execution-snapshot',
      editable: false,
      implicitInvocation: false,
      files: [],
      openaiYaml: '',
    });
  });
});
