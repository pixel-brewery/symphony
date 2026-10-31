// #region Imports

import type { IRepositoryBinding } from '@symphony/domain-workspace';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

// #endregion

export function managedRepositoryDirectoryName(repository: IRepositoryBinding): string {
  const readable = `${repository.owner}-${repository.name}`
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48);
  const digest = createHash('sha256')
    .update(`${repository.host}/${repository.owner}/${repository.name}`.toLowerCase())
    .digest('hex')
    .slice(0, 12);
  return `${readable || basename(repository.name) || 'repository'}-${digest}`;
}
