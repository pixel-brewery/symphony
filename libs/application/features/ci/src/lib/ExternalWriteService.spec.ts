// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { IExternalWriteOperation } from '@symphony/domain-ci';
import { ExternalWriteService } from './ExternalWriteService';

// #endregion

describe('ExternalWriteService', () => {
  it('blocks an uncertain approval across restart and never repeats a successful approval', async () => {
    // arrange
    let records: IExternalWriteOperation[] = [];
    const repository = {
      list: () => records,
      save: (record: IExternalWriteOperation) => {
        records = [...records.filter((item) => item.id !== record.id), record];
      },
    };
    const intent = {
      kind: 'approval' as const,
      scope: 'run:production',
      fingerprint: 'approved-revision',
    };
    const check = vi.fn(async () => undefined);
    const write = vi.fn(async () => {
      throw new Error('Response lost');
    });
    const service = new ExternalWriteService(repository, () => '2026-10-06T12:00:00.000Z');
    // act
    await expect(service.execute(intent, check, write, vi.fn())).rejects.toThrow('unclear');
    const restarted = new ExternalWriteService(repository, () => '2026-10-06T12:01:00.000Z');
    // assert
    await expect(restarted.execute(intent, check, write, vi.fn())).rejects.toThrow(
      'previous response',
    );
    expect(write).toHaveBeenCalledOnce();
    records = [];
    const success = vi.fn(async () => undefined);
    await restarted.execute(intent, check, success, vi.fn());
    await restarted.execute(intent, check, success, vi.fn());
    expect(success).toHaveBeenCalledOnce();
  });
  it('does not record or send a write when current permissions or the version fail validation', async () => {
    // arrange
    const save = vi.fn();
    const write = vi.fn();
    const service = new ExternalWriteService(
      { list: () => [], save },
      () => '2026-10-06T12:00:00.000Z',
    );
    // act
    const action = service.execute(
      { kind: 'approval', scope: 'run', fingerprint: 'sha' },
      async () => {
        throw new Error('Permission changed');
      },
      write,
      vi.fn(),
    );
    // assert
    await expect(action).rejects.toThrow('Permission changed');
    expect(save).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it('reconciles a lost approval response with an exact receipt before considering another write', async () => {
    // arrange
    let records: IExternalWriteOperation[] = [];
    const repository = {
      list: () => records,
      save: (record: IExternalWriteOperation) => {
        records = [...records.filter((entry) => entry.id !== record.id), record];
      },
    };
    const service = new ExternalWriteService(repository, () => '2026-10-06T12:00:00Z');
    const intent = {
      kind: 'approval' as const,
      scope: 'approval:run:1',
      fingerprint: 'sha-decision',
    };
    const write = vi.fn(async (id: string) => {
      expect(id).toBe(records[0]!.id);
      throw new Error('Lost response');
    });
    const proof = vi.fn(async () => true as const);
    // act
    await expect(service.execute(intent, async () => undefined, write, vi.fn())).rejects.toThrow(
      'unclear',
    );
    const restarted = new ExternalWriteService(repository, () => '2026-10-06T12:01:00Z');
    await restarted.execute(intent, async () => undefined, write, vi.fn(), proof);
    // assert
    expect(proof).toHaveBeenCalledWith(expect.objectContaining({ state: 'uncertain' }));
    expect(records[0]!.state).toBe('accepted');
    expect(write).toHaveBeenCalledOnce();
  });
});
