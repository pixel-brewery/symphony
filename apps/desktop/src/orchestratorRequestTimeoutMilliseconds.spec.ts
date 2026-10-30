// #region Imports

import { describe, expect, it } from 'vitest';
import { orchestratorRequestTimeoutMilliseconds } from './orchestratorRequestTimeoutMilliseconds';

// #endregion

describe('orchestratorRequestTimeoutMilliseconds', () => {
  it('keeps workflow-sized requests connected until the orchestrator returns', () => {
    // act
    const actual = orchestratorRequestTimeoutMilliseconds('ci.local.run');

    // assert
    expect(actual).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('ci.workflow.local.run')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('delivery-groups.align')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('delivery-groups.assess')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('delivery-groups.create-direct')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('delivery-groups.confirm')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('delivery-groups.dissolve')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('delivery-groups.reject')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('runtime-dependencies.install')).toBeUndefined();
    expect(orchestratorRequestTimeoutMilliseconds('work-items.draft')).toBeUndefined();
  });

  it('bounds ordinary control-plane requests', () => {
    // act
    const actual = orchestratorRequestTimeoutMilliseconds('ci.runs.refresh');

    // assert
    expect(actual).toBe(35_000);
  });
});
