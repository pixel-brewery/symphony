// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { ICiRun } from '@symphony/domain-ci';
import type { IDeliveryLaunchPlan, IDeliveryOperation } from '@symphony/domain-delivery';
import type { IDeliveryLaunchPort } from './ports/IDeliveryLaunchPort';
import { DeliveryService } from './DeliveryService';

// #endregion

const plan: IDeliveryLaunchPlan = {
  targetId: 'production',
  targetName: 'Production',
  repositoryBindingId: 'repo',
  workflowId: 'ci:10',
  workflowPath: '.github/workflows/deploy.yml',
  ref: 'release-v1',
  revision: 'commit-v1',
  definitionHash: 'workflow-hash',
  inputs: { version: 'commit-v1' },
};
const run: ICiRun = {
  id: 'ci:20',
  workspaceId: 'w',
  ciBindingId: 'ci',
  repositoryBindingId: 'repo',
  name: 'Deployment',
  revision: 'commit-v1',
  status: 'queued',
};
function fixture() {
  const records: IDeliveryOperation[] = [];
  const port: IDeliveryLaunchPort = {
    preview: async () => plan,
    check: vi.fn(async () => undefined),
    dispatch: vi.fn(async () => run),
    reconcile: vi.fn(async () => run),
    readRun: vi.fn(async () => run),
  };
  const repository = {
    list: () => records,
    save: (operation: IDeliveryOperation) => {
      const index = records.findIndex((entry) => entry.id === operation.id);
      if (index < 0) records.push(operation);
      else records[index] = operation;
    },
  };
  const service = new DeliveryService(port, repository, () => '2026-10-06T10:00:00.000Z');
  return { service, port, repository, records };
}
describe('DeliveryService', () => {
  it('persists intent before dispatch and reuses an operation ID without another write', async () => {
    // arrange
    const { service, port, records } = fixture();
    vi.mocked(port.dispatch).mockImplementation(async () => {
      expect(records[0]?.state).toBe('submitting');
      return run;
    });
    // act
    const first = await service.start('operation-one', plan);
    const duplicate = await service.start('operation-one', plan);
    // assert
    expect(first.state).toBe('accepted');
    expect(duplicate).toEqual(first);
    expect(port.dispatch).toHaveBeenCalledOnce();
  });
  it('rejects a changed version before sending or journaling a write', async () => {
    // arrange
    const { service, port, records } = fixture();
    vi.mocked(port.check).mockRejectedValue(new Error('The version changed.'));
    // act
    const start = service.start('operation-one', plan);
    // assert
    await expect(start).rejects.toThrow('version changed');
    expect(records).toEqual([]);
    expect(port.dispatch).not.toHaveBeenCalled();
  });
  it('survives restart after a lost response and reconciles with reads only', async () => {
    // arrange
    const { service, port, repository } = fixture();
    vi.mocked(port.dispatch).mockRejectedValue(new Error('Socket closed after POST'));
    vi.mocked(port.reconcile).mockResolvedValue(undefined);
    // act
    const uncertain = await service.start('operation-one', plan);
    const restarted = new DeliveryService(port, repository, () => '2026-10-06T10:01:00.000Z');
    const reconciled = await restarted.reconcile('operation-one');
    // assert
    expect(uncertain.state).toBe('uncertain');
    expect(reconciled.state).toBe('uncertain');
    await expect(restarted.start('another-operation', plan)).rejects.toThrow('Reconcile');
    expect(port.dispatch).toHaveBeenCalledOnce();
  });
  it('prevents parallel and repeated starts for a target until its accepted run ends', async () => {
    // arrange
    const { service, port } = fixture();
    // act
    await service.start('one', plan);
    const duplicate = service.start('two', plan);
    // assert
    await expect(duplicate).rejects.toThrow('running delivery');
    expect(port.dispatch).toHaveBeenCalledOnce();
    vi.mocked(port.readRun).mockResolvedValue({ ...run, status: 'succeeded' });
    expect((await service.start('three', plan)).state).toBe('accepted');
  });
  it('retains the exact run and warns when a mutable dispatch ref changes after the check', async () => {
    // arrange
    const { service, port, repository } = fixture();
    vi.mocked(port.dispatch).mockResolvedValue({ ...run, revision: 'commit-v2' });
    // act
    const accepted = await service.start('one', plan);
    const restarted = new DeliveryService(port, repository, () => '2026-10-06T10:01:00.000Z');
    // assert
    expect(accepted.state).toBe('accepted');
    expect(accepted.run?.revision).toBe('commit-v2');
    expect(accepted.message).toContain('different or unconfirmed revision');
    await expect(restarted.start('two', plan)).rejects.toThrow('running delivery');
    expect(port.dispatch).toHaveBeenCalledOnce();
  });
});
