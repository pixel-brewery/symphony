// #region Imports

import { mkdtempSync, rmSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deliveryOperationSchema } from '@symphony/ipc-contracts-delivery';
import { JsonDeliveryOperationRepository } from './JsonDeliveryOperationRepository';

// #endregion

describe('JsonDeliveryOperationRepository', () => {
  it('recovers a validated uncertain intent after restart and rejects a damaged journal', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-delivery-journal-'));
    const path = join(directory, 'operations.json');
    const parse = (value: unknown) => deliveryOperationSchema.array().parse(value);
    const operation = deliveryOperationSchema.parse({
      id: 'intent',
      state: 'uncertain',
      startedAt: '2026-10-06T12:00:00.000Z',
      plan: {
        targetId: 'production',
        targetName: 'Production',
        repositoryBindingId: 'repo',
        workflowId: 'ci:10',
        workflowPath: '.github/workflows/deploy.yml',
        ref: 'v1',
        revision: 'a'.repeat(40),
        definitionHash: 'b'.repeat(64),
        inputs: { version: 'a'.repeat(40) },
      },
    });
    try {
      // act
      new JsonDeliveryOperationRepository(path, parse).save(operation);
      const restarted = new JsonDeliveryOperationRepository(path, parse);
      // assert
      expect(restarted.list()).toEqual([operation]);
      const file = statSync(path);
      expect(file.isFile()).toBe(true);
      expect(file.mode & 0o600).toBe(0o600);
      // Node on Windows cannot express POSIX owner/group/other separation.
      if (process.platform !== 'win32') expect(file.mode & 0o777).toBe(0o600);
      expect(JSON.parse(readFileSync(path, 'utf8'))).toHaveLength(1);
      writeFileSync(path, '[{"id":"lost"}]');
      expect(() => restarted.list()).toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
